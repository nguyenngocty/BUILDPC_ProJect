import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Cpu,
  ShieldAlert,
  Save,
  X,
  Search,
  Image,
  Layers,
  RefreshCw,
  Eye,
  CheckCircle2,
  HardDrive,
  Sparkles,
} from "lucide-react";
import pcPartService from "../../../../services/pcPartService"; 
import axiosClient from "../../../../services/axiosClient";

export default function PCBuilderAdmin() {
  // =====================================================
  // AUTO BUILD & STATE CHÍNH
  // =====================================================
  const [targetBudget, setTargetBudget] = useState(15000000); // Ngân sách mặc định
  const [targetUsage, setTargetUsage] = useState("gaming");   // Nhu cầu mặc định
  const [allComponents, setAllComponents] = useState([]);     // Kho linh kiện tổng
  const [formErrors, setFormErrors] = useState({});
  const [builds, setBuilds] = useState([]);
  const [categories, setCategories] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);

  const [modalMode, setModalMode] = useState("view");

  // =====================================================
  // FORM BUILD PC
  // =====================================================
  const [editingBuildId, setEditingBuildId] = useState(null);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formStatus, setFormStatus] = useState("active");

  const [selectedItems, setSelectedItems] = useState({});

  // =====================================================
  // COMPONENT MODAL
  // =====================================================
  const [activeCategory, setActiveCategory] = useState("");
  const [componentList, setComponentList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // =====================================================
  // LOADING
  // =====================================================
  const [isLoadingBuilds, setIsLoadingBuilds] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingComponents, setIsLoadingComponents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);


  const handleToggleVisibility = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 1 || currentStatus === true ? 0 : 1;
      await axiosClient.put(`/admin/pc-parts/${id}/visibility`, { is_visible: newStatus });
      
      // Load lại danh sách linh kiện trong modal để cập nhật giao diện ngay lập tức
      handleOpenComponentModal(activeCategory);
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);
      alert("Không thể đổi trạng thái linh kiện này!");
    }
  };
  // =====================================================
  // AUTO BUILD HANDLER
  // =====================================================
  const handleAutoBuild = async () => {
    let componentsToUse = [...(allComponents || [])];

    // 1. Nếu state rỗng, tự động fetch từ API ngay lập tức
    if (componentsToUse.length === 0) {
      try {
        const response = await axiosClient.get("/admin/pc-builds/components");

        const raw =
          response.data?.data ||
          response.data?.components ||
          response.data?.products ||
          (Array.isArray(response.data) ? response.data : []);

        if (Array.isArray(raw) && raw.length > 0) {
          componentsToUse = raw;
          setAllComponents(raw);
        }
      } catch (err) {
        console.error("Lỗi tự động fetch linh kiện:", err);
      }
    }

    if (componentsToUse.length === 0) {
      window.alert("Kho linh kiện từ máy chủ trả về rỗng. Vui lòng kiểm tra lại API /admin/pc-builds/components!");
      return;
    }

    // 2. Tỷ lệ phân bổ ngân sách theo từng nhu cầu (Đã bổ sung COOLING)
    const BUDGET_RATIOS = {
      office: { CPU: 0.32, MAINBOARD: 0.18, RAM: 0.18, STORAGE: 0.15, PSU: 0.10, CASE: 0.04, COOLING: 0.03 },
      gaming: { VGA: 0.36, CPU: 0.20, MAINBOARD: 0.12, RAM: 0.10, STORAGE: 0.08, PSU: 0.06, COOLING: 0.05, CASE: 0.03 },
      design: { CPU: 0.25, RAM: 0.20, VGA: 0.22, STORAGE: 0.12, MAINBOARD: 0.08, PSU: 0.06, COOLING: 0.05, CASE: 0.02 }
    };

    const PICK_ORDER = ["VGA", "CPU", "MAINBOARD", "RAM", "STORAGE", "COOLING", "PSU", "CASE"];
    const ratio = BUDGET_RATIOS[targetUsage] || BUDGET_RATIOS.gaming;
    const newSelection = {};

    // 3. Chuẩn hóa & lọc các sản phẩm có giá hợp lệ
    const validComponents = componentsToUse
      .map((item) => normalizeProduct(item, 1))
      .filter((item) => {
        const price = Number(item.price) || 0;
        const rawQty = item.quantity ?? item.stock ?? item.in_stock;
        const stockQty = rawQty !== undefined ? Number(rawQty) : 99;

        return price > 0 && stockQty > 0;
      });

    if (validComponents.length === 0) {
      window.alert("Không tìm thấy linh kiện nào có giá hợp lệ trong kho dữ liệu!");
      return;
    }

    // 4. Vòng lặp chọn linh kiện theo thứ tự ưu tiên
    PICK_ORDER.forEach((catKey) => {
      const catRatio = ratio[catKey];
      if (catRatio === undefined || catRatio === null) return; // Bỏ qua nếu cấu hình cố tình không dùng (ví dụ máy Office không chọn VGA)

      const targetPrice = targetBudget * catRatio;

      // Chuẩn hóa & Lọc danh mục chính xác
      let candidates = validComponents.filter((p) => {
        const rawCat = detectItemCategory(p) || p.category_key || p.category;
        const pCat = normalizeCategoryKey(rawCat);
        return pCat === catKey;
      });

      if (candidates.length === 0) return;

      // --- TƯƠNG THÍCH THEO CẤU HÌNH ---

      // Socket (CPU <-> Mainboard)
      if (catKey === "MAINBOARD" && newSelection["CPU"]) {
        const cpuSpecs = parseSpecifications(newSelection["CPU"]);
        const cpuSocket = String(cpuSpecs.socket || newSelection["CPU"].socket || "").toLowerCase().trim();

        if (cpuSocket) {
          const compatibleMain = candidates.filter((m) => {
            const mainSpecs = parseSpecifications(m);
            const mainSocket = String(mainSpecs.socket || m.socket || "").toLowerCase().trim();
            return mainSocket === cpuSocket;
          });
          if (compatibleMain.length > 0) candidates = compatibleMain;
        }
      }

      // RAM Type (Mainboard <-> RAM)
      if (catKey === "RAM" && newSelection["MAINBOARD"]) {
        const mainSpecs = parseSpecifications(newSelection["MAINBOARD"]);
        const mainRamType = String(mainSpecs.ram_type || mainSpecs.ramType || newSelection["MAINBOARD"].ram_type || "").toLowerCase().trim();

        if (mainRamType) {
          const compatibleRam = candidates.filter((r) => {
            const ramSpecs = parseSpecifications(r);
            const ramType = String(ramSpecs.ram_type || ramSpecs.ramType || r.ram_type || "").toLowerCase().trim();
            return ramType === mainRamType;
          });
          if (compatibleRam.length > 0) candidates = compatibleRam;
        }
      }

      // 1. Tản nhiệt COOLING (Khớp Socket CPU)
      if (catKey === "COOLING" && newSelection["CPU"]) {
        const cpuSpecs = parseSpecifications(newSelection["CPU"]);
        const cpuSocket = String(cpuSpecs.socket || newSelection["CPU"].socket || "").toLowerCase().trim();

        if (cpuSocket) {
          const compatibleCooling = candidates.filter((c) => {
            const specs = parseSpecifications(c);
            const coolerSockets = String(specs.socket || c.socket || c.supported_sockets || "").toLowerCase();
            return !coolerSockets || coolerSockets.includes(cpuSocket);
          });
          if (compatibleCooling.length > 0) candidates = compatibleCooling;
        }
      }

      // 2. Card màn hình VGA
      if (catKey === "VGA") {
        const validVga = candidates.filter((v) => Number(v.quantity ?? 1) > 0);
        if (validVga.length > 0) candidates = validVga;
      }

      // 3. Nguồn PSU (Tính công suất tối thiểu = Nhu cầu VGA + CPU)
      if (catKey === "PSU") {
        let reqPower = 0;

        if (newSelection["VGA"]) {
          const vgaSpecs = parseSpecifications(newSelection["VGA"]);
          reqPower = parseInt(String(vgaSpecs.power_recommend || newSelection["VGA"].power_recommend || "").replace(/\D/g, ""), 10) || 0;
        }

        if (!reqPower) {
          const vgaSpecs = parseSpecifications(newSelection["VGA"] || {});
          const cpuSpecs = parseSpecifications(newSelection["CPU"] || {});

          const vgaWatt = parseInt(String(vgaSpecs.vga_wattage || 0).replace(/\D/g, ""), 10) || 0;
          const cpuWatt = parseInt(String(cpuSpecs.wattage || 65).replace(/\D/g, ""), 10) || 65;
          reqPower = vgaWatt + cpuWatt + 150;
        }

        if (Number.isFinite(reqPower) && reqPower > 0) {
          const compatiblePsu = candidates.filter((p) => {
            const psuSpecs = parseSpecifications(p);
            const psuWatt = parseInt(String(psuSpecs.wattage || p.wattage || p.power || p.name || "").replace(/\D/g, ""), 10);
            return Number.isFinite(psuWatt) && psuWatt >= reqPower;
          });
          if (compatiblePsu.length > 0) candidates = compatiblePsu;
        }
      }

      // 4. Vỏ Case CASE
      if (catKey === "CASE") {
        const validCase = candidates.filter((cs) => Number(cs.quantity ?? 1) > 0);
        if (validCase.length > 0) candidates = validCase;
      }

      // 5. Chọn linh kiện có giá sát mức dự tính nhất
      const bestFit = candidates.reduce((prev, curr) => {
        const prevPrice = Number(prev.price) || 0;
        const currPrice = Number(curr.price) || 0;
        return Math.abs(currPrice - targetPrice) < Math.abs(prevPrice - targetPrice)
          ? curr
          : prev;
      });

      newSelection[catKey] = bestFit;
    });

    if (Object.keys(newSelection).length === 0) {
      window.alert("Không chọn được linh kiện phù hợp! Vui lòng kiểm tra lại danh mục sản phẩm.");
      return;
    }

    setSelectedItems(newSelection);
  };
  // =====================================================
  // FALLBACK CATEGORIES
  // =====================================================
  const fallbackCategories = useMemo(
    () => [
      { key: "CPU", label: "Bộ vi xử lý (CPU)" },
      { key: "MAINBOARD", label: "Bo mạch chủ (Mainboard)" },
      { key: "RAM", label: "Bộ nhớ trong (RAM)" },
      { key: "VGA", label: "Card đồ họa (VGA)" },
      { key: "COOLING", label: "Tản nhiệt (Cooling)" },
      { key: "PSU", label: "Nguồn máy tính (PSU)" },
      { key: "STORAGE", label: "Ổ cứng lưu trữ (Storage)" },
      { key: "CASE", label: "Vỏ máy tính (Case)" },
    ],
    []
  );

  // =====================================================
  // FETCH BUILDS
  // =====================================================
  const fetchBuilds = async () => {
    setIsLoadingBuilds(true);
    try {
      const response = await axiosClient.get("/admin/pc-builds");
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      setBuilds(data);
    } catch (error) {
      console.error("Lỗi lấy danh sách cấu hình máy:", error.response?.data || error.message);
      setBuilds([]);
    } finally {
      setIsLoadingBuilds(false);
    }
  };

// 1. Hàm chuẩn hóa Key Danh Mục dùng chung
const normalizeCategoryKey = (key = "") => {
  if (!key) return "";
  const str = String(key).trim().toLowerCase();

  if (str.includes("vga") || str.includes("card") || str.includes("đồ họa") || str === "66") return "VGA";
  if (str.includes("cpu") || str.includes("vi xử lý") || str.includes("chip")) return "CPU";
  if (str.includes("main") || str.includes("motherboard") || str.includes("bo mạch")) return "MAINBOARD";
  if (str.includes("ram") || str.includes("bộ nhớ")) return "RAM";
  if (str.includes("psu") || str.includes("nguồn") || str.includes("power")) return "PSU";
  if (str.includes("storage") || str.includes("ssd") || str.includes("hdd") || str.includes("ổ cứng")) return "STORAGE";
  if (str.includes("case") || str.includes("vỏ")) return "CASE";
  if (str.includes("cool") || str.includes("tản")) return "COOLING";

  return str.toUpperCase();
};

  // =====================================================
  // FETCH CATEGORIES & ALL COMPONENTS
  // =====================================================
  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const response = await axiosClient.get("/admin/pc-builds/categories");
      let rawCategories = [];

      if (Array.isArray(response.data)) rawCategories = response.data;
      else if (Array.isArray(response.data?.data)) rawCategories = response.data.data;

      const apiCategories = rawCategories
        .filter(Boolean)
        .map((category) => {
          if (typeof category === "string") {
            return { key: category.trim().toUpperCase(), label: category };
          }
          const rawKey = category.key || category.category || category.slug || category.code || category.name || "";
          const normalizedKey = normalizeCategoryKey(rawKey);
          return {
            ...category,
            key: normalizedKey,
            label: category.label || category.name || category.category || normalizedKey,
          };
        })
        .filter((category) => category.key);

      const categoryMap = new Map();
      fallbackCategories.forEach((cat) => categoryMap.set(cat.key, cat));
      apiCategories.forEach((cat) => {
        const oldCat = categoryMap.get(cat.key);
        categoryMap.set(cat.key, {
          ...oldCat,
          ...cat,
          key: cat.key,
          label: cat.label || oldCat?.label || cat.key,
        });
      });

      setCategories(Array.from(categoryMap.values()));
    } catch (error) {
      console.error("Lỗi lấy categories:", error.response?.data || error.message);
      setCategories(fallbackCategories);
    } finally {
      setIsLoadingCategories(false);
    }
  };

const fetchAllComponents = async () => {
  try {
    const res = await pcPartService.getBuildComponents();
    const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
    setAllComponents(data);
  } catch (error) {
    console.error("Lỗi tải linh kiện build PC:", error);
    setAllComponents([]);
  }
};

  useEffect(() => {
    fetchBuilds();
    fetchCategories();
    fetchAllComponents();
  }, []);

  const resetBuildForm = () => {
    setEditingBuildId(null);
    setFormName("");
    setFormDesc("");
    setFormImage("");
    setFormStatus("active");
    setSelectedItems({});
    setFormErrors({});
  };

  const handleOpenAddModal = () => {
    resetBuildForm();
    setModalMode("add");
    setIsModalOpen(true);
  };

  const detectItemCategory = (item) => {
    if (!item) return null;

    // Lấy tất cả thông tin tên/danh mục và chuyển hết thành VIẾT HOA
    const rawCat = String(item?.category_key || item?.category || item?.category_name || "").toUpperCase();
    const nameUpper = String(item?.name || item?.product_name || "").toUpperCase();
    const typeId = Number(item?.type_id || item?.part_type_id || item?.pc_part?.type_id);

    // 1. Dò theo type_id chuẩn trong Database
    if (typeId === 1) return "CPU";
    if (typeId === 2) return "MAINBOARD";
    if (typeId === 3) return "RAM";
    if (typeId === 4) return "VGA";
    if (typeId === 5) return "COOLING";
    if (typeId === 6) return "PSU";
    if (typeId === 7) return "STORAGE";
    if (typeId === 8) return "CASE";

    // 2. Dò theo Chuỗi kết hợp (Tên + Danh mục)
    const combined = (rawCat + " " + nameUpper).toUpperCase();

    if (combined.includes("CPU") || combined.includes("RYZEN") || combined.includes("CORE I")) return "CPU";
    if (combined.includes("MAIN") || combined.includes("MOTHERBOARD") || combined.includes("B550") || combined.includes("H610") || combined.includes("Z690") || combined.includes("B650")) return "MAINBOARD";
    if (combined.includes("RAM") || combined.includes("DDR4") || combined.includes("DDR5")) return "RAM";
    
    // Quy đổi GPU / NVIDIA / RADEON -> VGA
    if (combined.includes("VGA") || combined.includes("GPU") || combined.includes("RTX") || combined.includes("GTX") || combined.includes("RX ") || combined.includes("NVIDIA") || combined.includes("RADEON")) return "VGA";
    
    // Quy đổi Tản nhiệt -> COOLING
    if (combined.includes("COOL") || combined.includes("TẢN") || combined.includes("THERMALRIGHT") || combined.includes("CR-")) return "COOLING";
    
    // Quy đổi Nguồn -> PSU (Nhận diện thêm A650BN, ATOM, BRONZE...)
    if (combined.includes("PSU") || combined.includes("NGUỒN") || combined.includes("BRONZE") || combined.includes("ATOM") || combined.includes("A650BN") || combined.includes("CV") || combined.includes("MWE")) return "PSU";
    
    // Quy đổi Ổ cứng -> STORAGE (Nhận diện thêm HARD-DISK, SSD, HDD, NVME...)
    if (combined.includes("STORAGE") || combined.includes("DISK") || combined.includes("HARD-DISK") || combined.includes("SSD") || combined.includes("HDD") || combined.includes("NVME") || combined.includes("SATA")) return "STORAGE";
    
    // Quy đổi Vỏ case -> CASE
    if (combined.includes("CASE") || combined.includes("VỎ") || combined.includes("XIGMATEK") || combined.includes("AIRFLOW")) return "CASE";

    return null;
  };

  const parseSpecifications = (product) => {
    if (!product?.specifications) return {};
    try {
      if (typeof product.specifications === "string") {
        return JSON.parse(product.specifications);
      }
      return product.specifications;
    } catch (error) {
      console.error("Không thể parse specifications:", product.specifications, error);
      return {};
    }
  };

  const normalizeProduct = (product, quantity = 1) => {
    const specifications = parseSpecifications(product);

    return {
      ...product,
      id: product.product_id || product.id || product.productId,
      product_id: product.product_id || product.id || product.productId,
      name: product.name || product.product_name || "Linh kiện",
      price: Number(product.price) || Number(product.sale_price) || 0,
      image: product.image || product.thumbnail || product.image_url || "",
      quantity: Number(quantity) > 0 ? Number(quantity) : 1,
      socket: specifications.socket || product.socket || "",
      ram_type: specifications.ram_type || specifications.ramType || product.ram_type || product.ramType || "",
      power_recommend: specifications.power_recommend || specifications.powerRecommend || product.power_recommend || product.powerRecommend || "",
      wattage: specifications.wattage || product.wattage || "",
    };
  };

  const handleOpenViewModal = (build) => {
    console.log("Dữ liệu build nhận vào:", build); // Xem build.items có dữ liệu chuẩn không
    setEditingBuildId(build.id);
    setModalMode("view");
    setFormName(build.name || "");
    setFormDesc(build.description || "");
    setFormImage(build.image || build.thumbnail || "");
    setFormStatus(build.status !== undefined && build.status !== null ? Number(build.status) : 1);
    const itemsMap = {};
    const buildItems = Array.isArray(build.items) ? build.items : [];

    buildItems.forEach((item) => {
      const detectedCategory = detectItemCategory(item);
      console.log("Linh kiện:", item.name, "-> Phân loại ra:", detectedCategory); // Kiểm tra xem nó có nhận diện ra category không
      
      if (!detectedCategory) return;
      itemsMap[detectedCategory] = normalizeProduct(item, item.quantity || 1);
    });

    console.log("itemsMap sau khi map:", itemsMap); // Kiểm tra xem object này có bị rỗng {} không
    setSelectedItems(itemsMap);
    setIsModalOpen(true);
  };

  const handleEnableEditMode = (event) => {
    if (event) event.preventDefault();
    setModalMode("edit");
  };

  const handleDeleteBuild = async (id) => {
    const confirmed = window.confirm("Bạn có chắc muốn xóa cấu hình mẫu này chứ?");
    if (!confirmed) return;

    try {
      await axiosClient.delete(`/admin/pc-builds/${id}`);
      setBuilds((prev) => prev.filter((build) => build.id !== id));
    } catch (error) {
      console.error("Lỗi xóa cấu hình:", error.response?.data || error.message);
      window.alert(error.response?.data?.message || "Không thể xóa cấu hình.");
    }
  };

  const handleOpenComponentModal = async (category) => {
    if (modalMode === "view") return;
  
    const normalizedCategory = normalizeCategoryKey(category);
    setActiveCategory(normalizedCategory);
    setSearchQuery("");
    setComponentList([]);
    setIsComponentModalOpen(true);
    setIsLoadingComponents(true);
  
    try {
      const response = await axiosClient.get("/admin/pc-builds/components");
  
      let rawData = [];
      if (Array.isArray(response.data)) rawData = response.data;
      else if (Array.isArray(response.data?.data)) rawData = response.data.data;
      else if (Array.isArray(response.data?.products)) rawData = response.data.products;
      else if (Array.isArray(response.data?.components)) rawData = response.data.components;
  

  
      // Lọc linh kiện theo danh mục
      const filteredData = rawData.filter((item) => {
        const itemCat = detectItemCategory(item);
        return itemCat === normalizedCategory;
      });
  
  
      // Chuẩn hóa danh sách sản phẩm
      const normalizedProducts = filteredData.map((p) => {
        const norm = normalizeProduct(p, p.quantity || 1);
        return {
          ...norm,
          type_id: p.type_id || norm.type_id,
          category_id: p.category_id || norm.category_id,
          specifications: p.specifications || norm.specifications
        };
      });
  
      // Lọc trùng ID
      const uniqueProducts = normalizedProducts.filter(
        (item, index, self) => index === self.findIndex((t) => t.id === item.id)
      );
  
      setComponentList(uniqueProducts);
    } catch (error) {
      console.error(`Lỗi tải linh kiện ${normalizedCategory}:`, error.response?.data || error.message);
      setComponentList([]);
    } finally {
      setIsLoadingComponents(false);
    }
  };

  const handleSelectComponent = (product) => {
    const normalizedProduct = normalizeProduct(
      product,
      selectedItems[activeCategory]?.quantity || 1
    );

    const updatedItems = { 
      ...selectedItems, 
      [activeCategory]: normalizedProduct 
    };
    setSelectedItems(updatedItems);

    // Kiểm tra xem đã đủ 3 món cốt lõi chưa (không phân biệt hoa/thường)
    const requiredCategories = ['cpu', 'mainboard', 'ram'];
    const selectedKeys = Object.keys(updatedItems).map(k => k.toLowerCase().trim());
    const isAllRequiredSelected = requiredCategories.every(cat => selectedKeys.includes(cat));

    // Nếu đủ rồi mà đang hiển thị lỗi thì xóa ngay lập tức
    if (isAllRequiredSelected && formErrors.components) {
      setFormErrors(prev => ({ ...prev, components: null }));
    }

    setIsComponentModalOpen(false);
  };

  const handleUpdateQuantity = (category, value) => {
    if (modalMode === "view") return;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 1) return;

    setSelectedItems((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        quantity: numericValue,
      },
    }));
  };

  const handleRemoveComponent = (category) => {
    if (modalMode === "view") return;
    setSelectedItems((prev) => {
      const updated = { ...prev };
      delete updated[category];
      return updated;
    });
  };

  const totalPrice = useMemo(() => {
    return Object.values(selectedItems).reduce((total, item) => {
      const price = Number(item?.price) || 0;
      const quantity = Number(item?.quantity) || 1;
      return total + price * quantity;
    }, 0);
  }, [selectedItems]);

  const compatibility = useMemo(() => {
    const errors = [];
    const cpu = selectedItems.CPU;
    const mainboard = selectedItems.MAINBOARD;
    const ram = selectedItems.RAM;
    const vga = selectedItems.VGA;
    const psu = selectedItems.PSU;

    if (cpu && mainboard && cpu.socket && mainboard.socket) {
      const cpuSocket = String(cpu.socket).toLowerCase().trim();
      const mainSocket = String(mainboard.socket).toLowerCase().trim();
      if (cpuSocket !== mainSocket) {
        errors.push(`CPU sử dụng Socket [${cpu.socket}] không lắp vừa Mainboard dùng chân cắm [${mainboard.socket}].`);
      }
    }

    if (mainboard && ram && mainboard.ram_type && ram.ram_type) {
      const mainRamType = String(mainboard.ram_type).toLowerCase().trim();
      const ramType = String(ram.ram_type).toLowerCase().trim();
      if (mainRamType !== ramType) {
        errors.push(`Bo mạch chủ chỉ hỗ trợ RAM [${mainboard.ram_type}] nhưng bạn đang chọn RAM chuẩn [${ram.ram_type}].`);
      }
    }

    if (vga && psu && vga.power_recommend && psu.wattage) {
      const requiredPower = parseInt(String(vga.power_recommend).replace(/\D/g, ""), 10);
      const psuPower = parseInt(String(psu.wattage).replace(/\D/g, ""), 10);
      if (Number.isFinite(requiredPower) && Number.isFinite(psuPower) && psuPower < requiredPower) {
        errors.push(`Nguồn máy tính yếu: Card đồ họa yêu cầu tối thiểu [${requiredPower}W] nhưng PSU hiện tại chỉ đạt [${psuPower}W].`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }, [selectedItems]);
  const currentUser = JSON.parse(localStorage.getItem("user")) || JSON.parse(localStorage.getItem("userInfo"));
  const handleSaveBuild = async (event) => {
    event.preventDefault();
    if (modalMode === "view" || isSaving) return;

    let errors = {};

    // 1. Kiểm tra tên trống
    const trimmedName = formName.trim();
    if (!trimmedName) {
      errors.name = "Vui lòng nhập tên bộ PC.";
    } else {
      const isDuplicate = builds.some(
        (b) => 
          b.name.trim().toLowerCase() === trimmedName.toLowerCase() && 
          Number(b.id) !== Number(editingBuildId)
      );

      if (isDuplicate) {
        errors.name = "Tên bộ PC này đã tồn tại. Vui lòng chọn tên khác.";
      }
    }

    // 2. Kiểm tra mô tả hiệu năng
    if (!formDesc || formDesc.trim().length < 10) {
      errors.desc = "Mô tả hiệu năng phải có ít nhất từ 10 ký tự trở lên.";
    }

    // 3. Kiểm tra tương thích linh kiện
    if (!compatibility.isValid) {
      errors.compatibility = "Cấu hình đang có linh kiện không tương thích. Vui lòng kiểm tra lại.";
    }

// 4. Kiểm tra linh kiện bắt buộc (So sánh không phân biệt hoa thường và khoảng trắng)
const requiredCategories = ['cpu', 'mainboard', 'ram'];
    
// Lấy tất cả các key đang có trong selectedItems và chuẩn hóa về chữ thường
const selectedKeys = Object.keys(selectedItems).map(k => k.toLowerCase().trim());

// Lọc ra những món bắt buộc còn thiếu
const missingCategories = requiredCategories.filter(cat => !selectedKeys.includes(cat));

if (missingCategories.length > 0) {
  const categoryNames = {
    cpu: 'CPU',
    mainboard: 'Mainboard',
    ram: 'RAM'
  };
  const missingNames = missingCategories.map(cat => categoryNames[cat] || cat).join(', ');
  errors.components = `Vui lòng chọn thêm các linh kiện bắt buộc: ${missingNames}.`;
}

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    // ... phần code gọi API lưu tiếp theo của bạn
};

  const filteredComponents = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return componentList;

    return componentList.filter((item) => {
      const name = String(item?.name || "").toLowerCase();
      const sku = String(item?.sku || "").toLowerCase();
      return name.includes(keyword) || sku.includes(keyword);
    });
  }, [componentList, searchQuery]);

  return (
    <div
      className="container-fluid px-4 py-4"
      style={{
        backgroundColor: "#f8f9fa",
        minHeight: "100vh",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      {/* TOP BAR */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span style={{ fontWeight: 700, fontSize: "22px" }}>
              Hệ Thống Quản Lý Cấu Hình Build PC
            </span>
          </div>
          <p className="text-muted mb-0 small">
            Thiết kế cấu hình phần cứng đồng bộ, kiểm tra lỗi và cập nhật hệ thống máy mẫu TechStore
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm"
          style={{ borderRadius: "8px", fontWeight: 600 }}
        >
          <Plus size={17} />
          Thiết kế bộ PC mới
        </button>
      </div>

      {/* TABLE */}
      <div className="card shadow-sm border-0 rounded-lg overflow-hidden">
        <div className="card-body p-0 bg-white">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-secondary small text-uppercase">
                <tr>
                  <th className="px-4 py-3" style={{ width: "10%" }}>Hình ảnh</th>
                  <th className="px-4 py-3" style={{ width: "45%" }}>Tên bộ PC / Mô tả cấu hình</th>
                  <th className="px-4 py-3">Tổng giá thành</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-center" style={{ width: "15%" }}>Hành động</th>
                </tr>
              </thead>
              <tbody className="small">
                {isLoadingBuilds ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5">
                      <RefreshCw size={28} className="mb-2" />
                      <div>Đang tải danh sách cấu hình...</div>
                    </td>
                  </tr>
                ) : builds.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 bg-white text-muted">
                      <Layers size={40} className="text-muted mb-2" />
                      <p className="font-italic mb-0">Hệ thống chưa có cấu hình mẫu nào...</p>
                    </td>
                  </tr>
                ) : (
                  builds.map((build) => (
                    <tr key={build.id}>
                      <td className="px-4 py-3">
                        <div
                          className="bg-light rounded d-flex align-items-center justify-content-center border"
                          style={{ width: "55px", height: "55px", overflow: "hidden" }}
                        >
                          {build.image || build.thumbnail ? (
                            <img
                              src={build.image || build.thumbnail}
                              alt={build.name || "PC"}
                              className="img-fluid"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <Image size={20} className="text-muted" />
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-dark h6 mb-1" style={{ fontWeight: 600 }}>
                          {build.name}
                        </div>
                        <div className="text-muted text-truncate" style={{ maxWidth: "450px", fontSize: "12px" }}>
                          {build.description || "Chưa nhập mô tả đánh giá hiệu năng"}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-danger h6 mb-0" style={{ fontWeight: 700 }}>
                        {Number(build.total_price || 0).toLocaleString("vi-VN")} đ
                      </td>

                      <td className="px-4 py-3">
                      <span>
  {Number(build.status) === 1 ? (
    <span className="badge bg-success-subtle text-success border border-success px-3 py-2" 
          style={{ borderRadius: "20px", fontWeight: "600", fontSize: "12px", boxShadow: "0 2px 4px rgba(25, 135, 84, 0.2)" }}>
      ● Kinh doanh (Hiện Web)
    </span>
  ) : (
    <span className="badge bg-danger-subtle text-danger border border-danger px-3 py-2" 
          style={{ borderRadius: "20px", fontWeight: "600", fontSize: "12px", boxShadow: "0 2px 4px rgba(220, 53, 69, 0.2)" }}>
      ○ Bảo trì (Ẩn kho)
    </span>
  )}
</span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenViewModal(build)}
                            className="btn btn-sm btn-info text-white d-flex align-items-center gap-1 px-3 rounded-pill"
                          >
                            <Eye size={13} /> Xem chi tiết
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteBuild(build.id)}
                            className="btn btn-sm btn-outline-danger p-2 rounded-circle"
                            aria-label="Xóa cấu hình"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MAIN MODAL */}
      {isModalOpen && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{
            backgroundColor: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(5px)",
            zIndex: 1050,
          }}
        >
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "16px", overflow: "hidden" }}>
              <div className={`modal-header py-3 ${modalMode === "view" ? "bg-primary text-white" : "bg-dark text-white"}`}>
                <h5 className="modal-title d-flex align-items-center gap-2" style={{ fontWeight: 700 }}>
                  {modalMode === "view" && "Bản Thiết Kế Chi Tiết Cấu Hình Máy"}
                  {modalMode === "edit" && "Chỉnh Sửa Phần Cứng Máy Mẫu"}
                  {modalMode === "add" && "Kiến Trúc Bộ Máy Tính Mới"}
                </h5>

                <button
                  type="button"
                  className="btn border-0 bg-transparent text-white p-1"
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Đóng"
                >
                  <X size={22} />
                </button>
              </div>

              <form onSubmit={handleSaveBuild}>
                <div className="modal-body p-4" style={{ maxHeight: "78vh", overflowY: "auto" }}>
                  {/* BASIC INFORMATION */}
                  <div className="row g-3 mb-4 bg-light p-3 rounded border">
<div className="col-md-5">
  <label className="form-label text-secondary small">TÊN BỘ PC </label>
  <input
    type="text"
    disabled={modalMode === "view"}
    value={formName}
    onChange={(event) => {
      setFormName(event.target.value);
      if (formErrors.name) setFormErrors({ ...formErrors, name: null }); // Xóa lỗi khi gõ lại
    }}
    className={`form-control bg-white shadow-sm ${formErrors.name ? "is-invalid" : ""}`}
    style={{ borderRadius: "6px" }}
  />
  {formErrors.name && (
    <div className="text-danger small mt-1" style={{ fontSize: "12px", fontWeight: "500" }}>
      {formErrors.name}
    </div>
  )}
</div>

                    <div className="col-md-4">
                      <label className="form-label text-secondary small">ĐƯỜNG DẪN ẢNH ĐẠI DIỆN (URL)</label>
                      <input
                        type="text"
                        disabled={modalMode === "view"}
                        value={formImage}
                        onChange={(event) => setFormImage(event.target.value)}
                        className="form-control bg-white shadow-sm"
                        style={{ borderRadius: "6px" }}
                      />
                    </div>

                    <div className="col-md-3">
  <label className="form-label text-secondary small d-block">TRẠNG THÁI HIỂN THỊ</label>
  <select
    disabled={modalMode === "view"}
    // Ép kiểu về Number để luôn khớp với số 1 hoặc 0
    value={Number(formStatus)}
    onChange={(event) => setFormStatus(Number(event.target.value))}
    className="form-select bg-white shadow-sm mt-1"
  >
    <option value={1}>Kinh doanh (Hiện Web)</option>
    <option value={0}>Bảo trì (Ẩn kho)</option>
  </select>
</div>

<div className="col-12">
  <label className="form-label text-secondary small">MÔ TẢ HIỆU NĂNG / KHUYẾN NGHỊ NHU CẦU SỬ DỤNG</label>
  <textarea
    rows={2}
    disabled={modalMode === "view"}
    value={formDesc}
    onChange={(event) => {
      setFormDesc(event.target.value);
      if (formErrors.desc) setFormErrors({ ...formErrors, desc: null }); // Xóa lỗi khi gõ lại
    }}
    className={`form-control bg-white shadow-sm ${formErrors.desc ? "is-invalid" : ""}`}
  />
  {formErrors.desc && (
    <div className="text-danger small mt-1" style={{ fontSize: "12px", fontWeight: "500" }}>
      {formErrors.desc}
    </div>
  )}
</div>
                  </div>

                  {/* AUTO BUILD BOX */}
                  {modalMode !== "view" && (
                    <div className="p-3 my-4 rounded border bg-light shadow-sm">
                      <div className="d-flex align-items-center gap-2 mb-3 text-primary fw-bold small text-uppercase">
                         Gợi ý cấu hình tự động
                      </div>

                      <div className="row g-3 align-items-end">
                        <div className="col-md-5">
                          <label className="form-label text-secondary small fw-bold">NHU CẦU SỬ DỤNG</label>
                          <select
                            value={targetUsage}
                            onChange={(e) => setTargetUsage(e.target.value)}
                            className="form-select form-select-sm bg-white"
                          >
                            <option value="office"> Văn phòng / Học tập (Tối ưu CPU & RAM)</option>
                            <option value="gaming"> Chơi Game (Tối ưu Card đồ họa VGA)</option>
                            <option value="design"> Đồ họa / Edit Video (Cân bằng CPU & VGA)</option>
                          </select>
                        </div>

                        <div className="col-md-4">
                          <label className="form-label text-secondary small fw-bold d-flex justify-content-between">
                            <span>MỨC NGÂN SÁCH</span>
                            <span className="text-primary fw-bold">
                              {Number(targetBudget).toLocaleString("vi-VN")} đ
                            </span>
                          </label>
                          <input
                            type="number"
                            step="500000"
                            min="3000000"
                            value={targetBudget}
                            onChange={(e) => setTargetBudget(Number(e.target.value))}
                            className="form-control form-control-sm bg-white"
                            placeholder="Nhập số tiền..."
                          />
                        </div>

                        <div className="col-md-3">
                          <button
                            type="button"
                            onClick={handleAutoBuild}
                            className="btn btn-sm btn-warning w-100 fw-bold d-flex align-items-center justify-content-center gap-1"
                          >
                             Tự động chọn
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* COMPONENT LIST */}
                  <div className="mb-4">
                    <label
                      className="form-label text-dark small border-bottom pb-2 mb-3 text-uppercase d-flex align-items-center gap-1"
                      style={{ letterSpacing: "0.5px", fontWeight: 700 }}
                    >
                      Sơ đồ phân mảnh lắp ráp phần cứng máy tính
                    </label>
                    {formErrors.components && (
                      <div className="alert alert-danger py-2 px-3 small mb-3" style={{ fontWeight: 500 }}>
                        {formErrors.components}
                      </div>
                    )}
                    {isLoadingCategories ? (
                      <div className="text-center py-4 text-muted">Đang tải danh mục...</div>
                    ) : (
                      <div className="row g-3">
                        {categories.map((category) => {
                          const item = selectedItems[category.key];

                          return (
                            <div key={category.key} className="col-md-6">
                              <div
                                className={`p-3 rounded border d-flex align-items-center justify-content-between bg-white ${
                                  item ? "border-primary" : ""
                                }`}
                                style={{ minHeight: "85px" }}
                              >
                                <div style={{ width: "110px" }}>
                                  <span
                                    className="badge bg-secondary text-white text-uppercase"
                                    style={{ padding: "6px 10px", fontSize: "11px", minWidth: "85px" }}
                                  >
                                    {category.key}
                                  </span>
                                </div>

                                <div className="flex-grow-1 px-2 text-truncate">
                                  {item ? (
                                    <div>
                                      <div className="text-dark small text-truncate" style={{ fontWeight: 600 }} title={item.name}>
                                        {item.name}
                                      </div>
                                      <div className="text-primary mt-1 d-flex align-items-center flex-wrap gap-2" style={{ fontSize: "11px" }}>
                                        <span>{Number(item.price || 0).toLocaleString("vi-VN")} đ</span>
                                        <span className="text-muted">Số lượng: x{item.quantity || 1}</span>
                                        {item.socket && <span className="badge bg-info text-white">Socket: {item.socket}</span>}
                                        {item.ram_type && <span className="badge bg-warning text-dark">RAM: {item.ram_type}</span>}
                                        {item.wattage && <span className="badge bg-dark text-white">{item.wattage}W</span>}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted" style={{ fontSize: "12px", fontStyle: "italic" }}>
                                      Vị trí trống (Chưa có linh kiện)...
                                    </span>
                                  )}
                                </div>

                                <div className="d-flex align-items-center gap-2">
                                  {item && (
                                    <input
                                      type="number"
                                      min="1"
                                      disabled={modalMode === "view"}
                                      value={item.quantity || 1}
                                      onChange={(event) => handleUpdateQuantity(category.key, event.target.value)}
                                      className="form-control form-control-sm text-center"
                                      style={{ width: "55px" }}
                                    />
                                  )}

                                  {modalMode !== "view" && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenComponentModal(category.key)}
                                        className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                                      >
                                        {item ? <><RefreshCw size={12} /> Đổi</> : "Lắp linh kiện"}
                                      </button>

                                      {item && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveComponent(category.key)}
                                          className="btn btn-sm btn-light border text-danger"
                                        >
                                          <X size={13} />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* COMPATIBILITY */}
                  {!compatibility.isValid ? (
  <div
    className="alert alert-danger d-flex gap-3 align-items-start mb-4"
    style={{ borderRadius: "10px", borderLeft: "5px solid #dc3545" }}
  >
    <ShieldAlert size={24} className="mt-1" />
    <div>
      <strong className="d-block mb-1 text-uppercase">Phát hiện xung đột phần cứng:</strong>
      <ul className="mb-0 ps-3">
        {compatibility.errors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
      {formErrors.compatibility && (
        <div className="text-danger small mt-2 fw-bold">{formErrors.compatibility}</div>
      )}
    </div>
  </div>
) : Object.keys(selectedItems).length > 0 ? (
  <div className="alert alert-success d-flex gap-2 align-items-center mb-4">
    <CheckCircle2 size={17} />
    <span>Các linh kiện hiện tại tương thích với nhau.</span>
  </div>
) : null}

                  {/* TOTAL */}
                  <div className="p-3 bg-dark text-white rounded d-flex justify-content-between align-items-center">
                    <span className="small" style={{ fontWeight: 700 }}>ĐỊNH GIÁ TOÀN BỘ GIÁ TRỊ BỘ PC:</span>
                    <span className="h3 text-warning mb-0" style={{ fontWeight: 800 }}>
                      {totalPrice.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                </div>

                {/* FOOTER */}
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-secondary px-4 btn-sm"
                  >
                    Đóng
                  </button>

                  {modalMode === "view" ? (
                    <button
                      type="button"
                      onClick={handleEnableEditMode}
                      className="btn btn-warning px-4 btn-sm d-flex align-items-center gap-2"
                    >
                       Chuyển sang chỉnh sửa
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!compatibility.isValid || isSaving}
                      className="btn btn-success px-4 btn-sm d-flex align-items-center gap-2"
                    >
                      
                      {isSaving ? "Đang lưu..." : "Xác nhận ghi nhận cấu hình"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* COMPONENT MODAL */}
      {isComponentModalOpen && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 1060,
          }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: "14px", overflow: "hidden" }}>
              <div className="modal-header bg-primary text-white py-3 px-4">
                <div>
                  <h6 className="modal-title mb-0 d-flex align-items-center gap-2" style={{ fontWeight: 700 }}>
                    <HardDrive size={18} />
                    Kho linh kiện TechStore: [{activeCategory}]
                  </h6>
                  <small className="text-white-50">Chọn linh kiện từ kho để đưa vào cấu hình.</small>
                </div>

                <button
                  type="button"
                  className="btn border-0 bg-transparent text-white"
                  onClick={() => setIsComponentModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-3 bg-light border-bottom position-relative">
                <Search
                  className="position-absolute text-muted"
                  size={16}
                  style={{ left: "24px", top: "22px" }}
                />
                <input
                  type="text"
                  placeholder={`Tìm kiếm linh kiện ${activeCategory}...`}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="form-control shadow-sm"
                  style={{ paddingLeft: "40px" }}
                />
              </div>
              <div className="modal-body p-3 bg-white" style={{ maxHeight: "50vh", overflowY: "auto" }}>
  {isLoadingComponents ? (
    <div className="text-center py-5 text-muted">Đang tải linh kiện...</div>
  ) : filteredComponents.length === 0 ? (
    <div className="text-center py-5 text-muted d-flex flex-column align-items-center gap-2">
      <Layers size={32} />
      <span>Không tìm thấy linh kiện phù hợp.</span>
    </div>
  ) : (
    <div className="d-flex flex-column gap-2">
      {filteredComponents
        // Lọc bỏ bản ghi bị trùng ID trong danh sách
        .filter((product, index, self) => index === self.findIndex((p) => p.id === product.id))
        .map((product, index) => {
          const specs = parseSpecifications(product);
          const socket = specs.socket || product.socket;
          const ramType = specs.ram_type || specs.ramType || product.ram_type;
          const powerRecommend = specs.power_recommend || specs.powerRecommend || product.power_recommend;
          const wattage = specs.wattage || product.wattage;
          return (
            <div
              key={product.id}
              className="p-3 border rounded d-flex justify-content-between align-items-center"
              style={{ 
                cursor: "pointer", 
                borderLeft: "4px solid " + (product.is_visible !== 0 ? "#0d6efd" : "#dc3545"),
                backgroundColor: product.is_visible !== 0 ? "white" : "#fff5f5" 
              }}
            >
              {/* PHẦN CLICK ĐỂ CHỌN LINH KIỆN */}
              <div onClick={() => handleSelectComponent(product)} className="pe-3 text-truncate flex-grow-1">
                <div className="text-dark mb-1 d-flex align-items-center gap-2" style={{ fontWeight: 600 }}>
                  <span>{product.name}</span>
                  {product.is_visible === 0 && <span className="badge bg-danger" style={{ fontSize: "10px" }}>Đang ẩn</span>}
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className="text-muted" style={{ fontSize: "11px" }}>
                    SKU: {product.sku || `SP-${product.id}`}
                  </span>
                  {socket && <span className="badge bg-light text-dark border">Socket: {socket}</span>}
                  {ramType && <span className="badge bg-light text-dark border">RAM: {ramType}</span>}
                  {powerRecommend && <span className="badge bg-danger text-white">Nguồn khuyến nghị: {powerRecommend}</span>}
                  {wattage && <span className="badge bg-dark text-white">{wattage}W</span>}
                </div>
              </div>

              {/* PHẦN GIÁ VÀ NÚT ẨN/HIỆN CHO ADMIN */}
              <div className="d-flex align-items-center gap-3">
                <div className="text-end" onClick={() => handleSelectComponent(product)}>
                  <div className="text-primary" style={{ fontWeight: 700 }}>
                    {Number(product.price || 0).toLocaleString("vi-VN")} đ
                  </div>
                  <div className="text-muted" style={{ fontSize: "11px" }}>
                    Kho: {product.quantity ?? 0}
                  </div>
                </div>

                {/* NÚT BẬT/TẮT TRẠNG THÁI ẨN HIỆN */}
                <button
                  type="button"
                  className={`btn btn-sm ${product.is_visible !== 0 ? "btn-outline-secondary" : "btn-outline-success"}`}
                  style={{ fontSize: "12px", whiteSpace: "nowrap" }}
                  onClick={(e) => {
                    e.stopPropagation(); // Chặn sự kiện click nhầm vào ô chọn linh kiện
                    handleToggleVisibility(product.product_id || product.id, product.is_visible);
                  }}
                  title="Bấm để ẩn hoặc hiện linh kiện này với khách hàng"
                >
                  {product.is_visible !== 0 ? "👁️ Ẩn" : "✅ Hiện"}
                </button>
              </div>
            </div>
          );
        })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}