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
} from "lucide-react";

import axiosClient from "../../../../services/axiosClient";
// ⚠️ Nếu file axiosClient.js của bạn nằm ở vị trí khác,
// hãy chỉnh lại đường dẫn import ở trên cho đúng.

export default function PCBuilderAdmin() {
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

  // =====================================================
  // FALLBACK CATEGORIES
  // =====================================================

  const fallbackCategories = useMemo(
    () => [
      {
        key: "CPU",
        label: "Bộ vi xử lý (CPU)",
      },
      {
        key: "MAINBOARD",
        label: "Bo mạch chủ (Mainboard)",
      },
      {
        key: "RAM",
        label: "Bộ nhớ trong (RAM)",
      },
      {
        key: "VGA",
        label: "Card đồ họa (VGA)",
      },
      {
        key: "COOLING",
        label: "Tản nhiệt (Cooling)",
      },
      {
        key: "PSU",
        label: "Nguồn máy tính (PSU)",
      },
      {
        key: "STORAGE",
        label: "Ổ cứng lưu trữ (Storage)",
      },
      {
        key: "CASE",
        label: "Vỏ máy tính (Case)",
      },
    ],
    [],
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
      console.error(
        "Lỗi lấy danh sách cấu hình máy:",
        error.response?.data || error.message,
      );

      setBuilds([]);
    } finally {
      setIsLoadingBuilds(false);
    }
  };

  const normalizeCategoryKey = (value) => {
    const key = String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[\s_-]+/g, "");

    const mapping = {
      CPU: "CPU",
      PROCESSOR: "CPU",

      MAIN: "MAINBOARD",
      MAINBOARD: "MAINBOARD",
      MOTHERBOARD: "MAINBOARD",

      RAM: "RAM",
      MEMORY: "RAM",

      VGA: "VGA",
      GPU: "VGA",
      GRAPHICSCARD: "VGA",
      GRAPHICCARD: "VGA",

      COOLING: "COOLING",
      COOLER: "COOLING",
      CPUCOOLER: "COOLING",

      PSU: "PSU",
      POWERSUPPLY: "PSU",

      STORAGE: "STORAGE",
      SSD: "STORAGE",
      HDD: "STORAGE",
      NVME: "STORAGE",

      CASE: "CASE",
      CHASSIS: "CASE",
    };

    return mapping[key] || key;
  };

  // =====================================================
  // FETCH CATEGORIES
  // =====================================================

  const fetchCategories = async () => {
    setIsLoadingCategories(true);

    try {
      const response = await axiosClient.get("/admin/pc-builds/categories");

      console.log("Categories API response:", response.data);

      let rawCategories = [];

      if (Array.isArray(response.data)) {
        rawCategories = response.data;
      } else if (Array.isArray(response.data?.data)) {
        rawCategories = response.data.data;
      } else if (Array.isArray(response.data?.categories)) {
        rawCategories = response.data.categories;
      } else if (Array.isArray(response.data?.data?.categories)) {
        rawCategories = response.data.data.categories;
      }

      const apiCategories = rawCategories
        .filter(Boolean)
        .map((category) => {
          if (typeof category === "string") {
            return {
              key: category.trim().toUpperCase(),
              label: category,
            };
          }

          const rawKey =
            category.key ||
            category.category ||
            category.slug ||
            category.code ||
            category.name ||
            "";

          const normalizedKey = normalizeCategoryKey(rawKey);

          return {
            ...category,
            key: normalizedKey,
            label:
              category.label ||
              category.name ||
              category.category ||
              normalizedKey,
          };
        })
        .filter((category) => category.key);

      // Luôn giữ các category bắt buộc.
      const categoryMap = new Map();

      fallbackCategories.forEach((category) => {
        categoryMap.set(category.key, category);
      });

      apiCategories.forEach((category) => {
        const oldCategory = categoryMap.get(category.key);

        categoryMap.set(category.key, {
          ...oldCategory,
          ...category,
          key: category.key,
          label: category.label || oldCategory?.label || category.key,
        });
      });

      setCategories(Array.from(categoryMap.values()));
    } catch (error) {
      console.error(
        "Lỗi lấy categories:",
        error.response?.data || error.message,
      );

      // API lỗi vẫn hiện đủ CPU/Mainboard/RAM/VGA...
      setCategories(fallbackCategories);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // =====================================================
  // INITIAL FETCH
  // =====================================================

  useEffect(() => {
    fetchBuilds();
    fetchCategories();
  }, []);

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetBuildForm = () => {
    setEditingBuildId(null);

    setFormName("");
    setFormDesc("");
    setFormImage("");
    setFormStatus("active");

    setSelectedItems({});
  };

  // =====================================================
  // OPEN ADD MODAL
  // =====================================================

  const handleOpenAddModal = () => {
    resetBuildForm();

    setModalMode("add");
    setIsModalOpen(true);
  };

  // =====================================================
  // DETECT CATEGORY
  // =====================================================

  const detectItemCategory = (item) => {
    if (item?.category) {
      return normalizeCategoryKey(item.category);
    }

    if (!item?.name) {
      return null;
    }

    const nameUpper = String(item.name).toUpperCase();

    if (
      nameUpper.includes("CPU") ||
      nameUpper.includes("INTEL") ||
      nameUpper.includes("RYZEN") ||
      nameUpper.includes("AMD")
    ) {
      return "CPU";
    }

    if (
      nameUpper.includes("MAINBOARD") ||
      nameUpper.includes("MAIN ") ||
      nameUpper.includes("B760") ||
      nameUpper.includes("B660") ||
      nameUpper.includes("B650") ||
      nameUpper.includes("H610") ||
      nameUpper.includes("Z790") ||
      nameUpper.includes("X670")
    ) {
      return "MAINBOARD";
    }

    if (
      nameUpper.includes("RAM") ||
      nameUpper.includes("DDR4") ||
      nameUpper.includes("DDR5")
    ) {
      return "RAM";
    }

    if (
      nameUpper.includes("VGA") ||
      nameUpper.includes("RTX") ||
      nameUpper.includes("GTX") ||
      nameUpper.includes("RX ") ||
      nameUpper.includes("CARD ĐỒ HỌA")
    ) {
      return "VGA";
    }

    if (nameUpper.includes("PSU") || nameUpper.includes("NGUỒN")) {
      return "PSU";
    }

    if (nameUpper.includes("CASE") || nameUpper.includes("VỎ")) {
      return "CASE";
    }

    if (
      nameUpper.includes("SSD") ||
      nameUpper.includes("HDD") ||
      nameUpper.includes("NVME") ||
      nameUpper.includes("Ổ CỨNG")
    ) {
      return "STORAGE";
    }

    if (
      nameUpper.includes("TẢN") ||
      nameUpper.includes("COOLER") ||
      nameUpper.includes("COOLING")
    ) {
      return "COOLING";
    }

    return null;
  };

  // =====================================================
  // PARSE SPECIFICATIONS
  // =====================================================

  const parseSpecifications = (product) => {
    if (!product?.specifications) {
      return {};
    }

    try {
      if (typeof product.specifications === "string") {
        return JSON.parse(product.specifications);
      }

      return product.specifications;
    } catch (error) {
      console.error(
        "Không thể parse specifications:",
        product.specifications,
        error,
      );

      return {};
    }
  };

  // =====================================================
  // NORMALIZE PRODUCT
  // =====================================================

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

      ram_type:
        specifications.ram_type ||
        specifications.ramType ||
        product.ram_type ||
        product.ramType ||
        "",

      power_recommend:
        specifications.power_recommend ||
        specifications.powerRecommend ||
        product.power_recommend ||
        product.powerRecommend ||
        "",

      wattage: specifications.wattage || product.wattage || "",
    };
  };

  // =====================================================
  // OPEN VIEW MODAL
  // =====================================================

  const handleOpenViewModal = (build) => {
    setEditingBuildId(build.id);

    setModalMode("view");

    setFormName(build.name || "");
    setFormDesc(build.description || "");
    setFormImage(build.image || build.thumbnail || "");
    setFormStatus(build.status || "active");

    const itemsMap = {};

    const buildItems = Array.isArray(build.items) ? build.items : [];

    buildItems.forEach((item) => {
      const detectedCategory = detectItemCategory(item);

      if (!detectedCategory) {
        return;
      }

      itemsMap[detectedCategory] = normalizeProduct(item, item.quantity || 1);
    });

    setSelectedItems(itemsMap);

    setIsModalOpen(true);
  };

  // =====================================================
  // ENABLE EDIT
  // =====================================================

  const handleEnableEditMode = (event) => {
    if (event) {
      event.preventDefault();
    }

    setModalMode("edit");
  };

  // =====================================================
  // DELETE BUILD
  // =====================================================

  const handleDeleteBuild = async (id) => {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa cấu hình mẫu này chứ?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await axiosClient.delete(`/admin/pc-builds/${id}`);

      setBuilds((previousBuilds) =>
        previousBuilds.filter((build) => build.id !== id),
      );
    } catch (error) {
      console.error("Lỗi xóa cấu hình:", error.response?.data || error.message);

      window.alert(error.response?.data?.message || "Không thể xóa cấu hình.");
    }
  };

  // =====================================================
  // OPEN COMPONENT MODAL
  // =====================================================

  const handleOpenComponentModal = async (category) => {
    if (modalMode === "view") {
      return;
    }

    const normalizedCategory = normalizeCategoryKey(category);

    setActiveCategory(normalizedCategory);

    setSearchQuery("");
    setComponentList([]);

    // Mở modal ngay lập tức.
    setIsComponentModalOpen(true);
    setIsLoadingComponents(true);

    try {
      const response = await axiosClient.get("/admin/pc-builds/components", {
        params: {
          category: normalizedCategory,
        },
      });

      let data = [];

      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (Array.isArray(response.data?.data)) {
        data = response.data.data;
      } else if (Array.isArray(response.data?.products)) {
        data = response.data.products;
      } else if (Array.isArray(response.data?.components)) {
        data = response.data.components;
      }

      console.log(`Components ${normalizedCategory}:`, data);

      const normalizedProducts = data.map((product) =>
        normalizeProduct(product, product.quantity || 1),
      );

      setComponentList(normalizedProducts);
    } catch (error) {
      console.error(
        `Lỗi tải linh kiện ${normalizedCategory}:`,
        error.response?.data || error.message,
      );

      setComponentList([]);
    } finally {
      setIsLoadingComponents(false);
    }
  };

  // =====================================================
  // SELECT COMPONENT
  // =====================================================

  const handleSelectComponent = (product) => {
    const normalizedProduct = normalizeProduct(
      product,
      selectedItems[activeCategory]?.quantity || 1,
    );

    setSelectedItems((previousItems) => ({
      ...previousItems,

      [activeCategory]: normalizedProduct,
    }));

    setIsComponentModalOpen(false);
  };

  // =====================================================
  // UPDATE QUANTITY
  // =====================================================

  const handleUpdateQuantity = (category, value) => {
    if (modalMode === "view") {
      return;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue < 1) {
      return;
    }

    setSelectedItems((previousItems) => ({
      ...previousItems,

      [category]: {
        ...previousItems[category],

        quantity: numericValue,
      },
    }));
  };

  // =====================================================
  // REMOVE COMPONENT
  // =====================================================

  const handleRemoveComponent = (category) => {
    if (modalMode === "view") {
      return;
    }

    setSelectedItems((previousItems) => {
      const updatedItems = {
        ...previousItems,
      };

      delete updatedItems[category];

      return updatedItems;
    });
  };

  // =====================================================
  // TOTAL PRICE
  // =====================================================

  const totalPrice = useMemo(() => {
    return Object.values(selectedItems).reduce((total, item) => {
      const price = Number(item?.price) || 0;

      const quantity = Number(item?.quantity) || 1;

      return total + price * quantity;
    }, 0);
  }, [selectedItems]);

  // =====================================================
  // COMPATIBILITY CHECK
  // =====================================================

  const compatibility = useMemo(() => {
    const errors = [];

    const cpu = selectedItems.CPU;
    const mainboard = selectedItems.MAINBOARD;
    const ram = selectedItems.RAM;
    const vga = selectedItems.VGA;
    const psu = selectedItems.PSU;

    // ---------------------------------------------------
    // CPU SOCKET VS MAINBOARD SOCKET
    // ---------------------------------------------------

    if (cpu && mainboard && cpu.socket && mainboard.socket) {
      const cpuSocket = String(cpu.socket).toLowerCase().trim();

      const mainSocket = String(mainboard.socket).toLowerCase().trim();

      if (cpuSocket !== mainSocket) {
        errors.push(
          `CPU sử dụng Socket [${cpu.socket}] không lắp vừa Mainboard dùng chân cắm [${mainboard.socket}].`,
        );
      }
    }

    // ---------------------------------------------------
    // RAM TYPE
    // ---------------------------------------------------

    if (mainboard && ram && mainboard.ram_type && ram.ram_type) {
      const mainRamType = String(mainboard.ram_type).toLowerCase().trim();

      const ramType = String(ram.ram_type).toLowerCase().trim();

      if (mainRamType !== ramType) {
        errors.push(
          `Bo mạch chủ chỉ hỗ trợ RAM [${mainboard.ram_type}] nhưng bạn đang chọn RAM chuẩn [${ram.ram_type}].`,
        );
      }
    }

    // ---------------------------------------------------
    // PSU POWER VS VGA
    // ---------------------------------------------------

    if (vga && psu && vga.power_recommend && psu.wattage) {
      const requiredPower = parseInt(
        String(vga.power_recommend).replace(/\D/g, ""),
        10,
      );

      const psuPower = parseInt(String(psu.wattage).replace(/\D/g, ""), 10);

      if (
        Number.isFinite(requiredPower) &&
        Number.isFinite(psuPower) &&
        psuPower < requiredPower
      ) {
        errors.push(
          `Nguồn máy tính yếu: Card đồ họa yêu cầu tối thiểu [${requiredPower}W] nhưng PSU hiện tại chỉ đạt [${psuPower}W].`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [selectedItems]);

  // =====================================================
  // SAVE BUILD
  // =====================================================

  const handleSaveBuild = async (event) => {
    event.preventDefault();

    if (modalMode === "view" || isSaving) {
      return;
    }

    if (!formName.trim()) {
      window.alert("Vui lòng nhập tên bộ PC.");

      return;
    }

    if (!compatibility.isValid) {
      window.alert(
        "Cấu hình đang có linh kiện không tương thích. Vui lòng kiểm tra lại.",
      );

      return;
    }

    const formattedItems = Object.entries(selectedItems).map(
      ([categoryKey, product]) => ({
        product_id: product.product_id || product.id,

        id: product.product_id || product.id,

        category: categoryKey.toLowerCase(),

        quantity: Number(product.quantity) || 1,
      }),
    );

    const payload = {
      name: formName.trim(),

      description: formDesc.trim(),

      image: formImage.trim(),

      status: formStatus,

      total_price: totalPrice,

      items: formattedItems,
    };

    setIsSaving(true);

    try {
      if (editingBuildId) {
        await axiosClient.put(`/admin/pc-builds/${editingBuildId}`, payload);
      } else {
        await axiosClient.post("/admin/pc-builds", payload);
      }

      await fetchBuilds();

      setIsModalOpen(false);

      resetBuildForm();
    } catch (error) {
      console.error(
        "Lỗi chi tiết khi lưu:",
        error.response?.data || error.message,
      );

      window.alert(
        error.response?.data?.message || "Đã xảy ra lỗi khi lưu cấu hình!",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // =====================================================
  // FILTER COMPONENTS
  // =====================================================

  const filteredComponents = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) {
      return componentList;
    }

    return componentList.filter((item) => {
      const name = String(item?.name || "").toLowerCase();

      const sku = String(item?.sku || "").toLowerCase();

      return name.includes(keyword) || sku.includes(keyword);
    });
  }, [componentList, searchQuery]);

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      className="container-fluid px-4 py-4"
      style={{
        backgroundColor: "#f8f9fa",
        minHeight: "100vh",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      {/* =================================================
          TOP BAR
      ================================================= */}

      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <Cpu size={24} className="text-primary" />

            <span
              style={{
                fontWeight: 700,
                fontSize: "22px",
              }}
            >
              Hệ Thống Quản Lý Cấu Hình Build PC
            </span>
          </div>

          <p className="text-muted mb-0 small">
            Thiết kế cấu hình phần cứng đồng bộ, kiểm tra lỗi và cập nhật hệ
            thống máy mẫu TechStore
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="btn btn-primary d-flex align-items-center gap-2 px-4 shadow-sm"
          style={{
            borderRadius: "8px",
            fontWeight: 600,
          }}
        >
          <Plus size={17} />
          Thiết kế bộ PC mới
        </button>
      </div>

      {/* =================================================
          TABLE
      ================================================= */}

      <div className="card shadow-sm border-0 rounded-lg overflow-hidden">
        <div className="card-body p-0 bg-white">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light text-secondary small text-uppercase">
                <tr>
                  <th className="px-4 py-3" style={{ width: "10%" }}>
                    Hình ảnh
                  </th>

                  <th className="px-4 py-3" style={{ width: "45%" }}>
                    Tên bộ PC / Mô tả cấu hình
                  </th>

                  <th className="px-4 py-3">Tổng giá thành</th>

                  <th className="px-4 py-3">Trạng thái</th>

                  <th
                    className="px-4 py-3 text-center"
                    style={{ width: "15%" }}
                  >
                    Hành động
                  </th>
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
                    <td
                      colSpan="5"
                      className="text-center py-5 bg-white text-muted"
                    >
                      <Layers size={40} className="text-muted mb-2" />

                      <p className="font-italic mb-0">
                        Hệ thống chưa có cấu hình mẫu nào...
                      </p>
                    </td>
                  </tr>
                ) : (
                  builds.map((build) => (
                    <tr key={build.id}>
                      <td className="px-4 py-3">
                        <div
                          className="bg-light rounded d-flex align-items-center justify-content-center border"
                          style={{
                            width: "55px",
                            height: "55px",
                            overflow: "hidden",
                          }}
                        >
                          {build.image || build.thumbnail ? (
                            <img
                              src={build.image || build.thumbnail}
                              alt={build.name || "PC"}
                              className="img-fluid"
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <Image size={20} className="text-muted" />
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div
                          className="text-dark h6 mb-1"
                          style={{
                            fontWeight: 600,
                          }}
                        >
                          {build.name}
                        </div>

                        <div
                          className="text-muted text-truncate"
                          style={{
                            maxWidth: "450px",
                            fontSize: "12px",
                          }}
                        >
                          {build.description ||
                            "Chưa nhập mô tả đánh giá hiệu năng"}
                        </div>
                      </td>

                      <td
                        className="px-4 py-3 text-danger h6 mb-0"
                        style={{
                          fontWeight: 700,
                        }}
                      >
                        {Number(build.total_price || 0).toLocaleString("vi-VN")}{" "}
                        đ
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`badge px-3 py-2 rounded-pill ${
                            build.status === "active"
                              ? "bg-success text-white"
                              : "bg-secondary text-white"
                          }`}
                        >
                          {build.status === "active"
                            ? "Đang kinh doanh"
                            : "Tạm ẩn kho"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenViewModal(build)}
                            className="btn btn-sm btn-info text-white d-flex align-items-center gap-1 px-3 rounded-pill"
                          >
                            <Eye size={13} />
                            Xem chi tiết
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

      {/* =================================================
          MAIN MODAL
      ================================================= */}

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
            <div
              className="modal-content border-0 shadow-lg"
              style={{
                borderRadius: "16px",
                overflow: "hidden",
              }}
            >
              {/* HEADER */}

              <div
                className={`modal-header py-3 ${
                  modalMode === "view"
                    ? "bg-primary text-white"
                    : "bg-dark text-white"
                }`}
              >
                <h5
                  className="modal-title d-flex align-items-center gap-2"
                  style={{
                    fontWeight: 700,
                  }}
                >
                  {modalMode === "view" ? (
                    <Eye size={22} />
                  ) : (
                    <Edit2 size={22} />
                  )}

                  {modalMode === "view" && "Bản Thiết Kế Chi Tiết Cấu Hình Máy"}

                  {modalMode === "edit" && "Hiệu Chỉnh Phần Cứng Máy Mẫu"}

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
                <div
                  className="modal-body p-4"
                  style={{
                    maxHeight: "78vh",
                    overflowY: "auto",
                  }}
                >
                  {/* =====================================
                      BASIC INFORMATION
                  ====================================== */}

                  <div className="row g-3 mb-4 bg-light p-3 rounded border">
                    <div className="col-md-5">
                      <label className="form-label text-secondary small">
                        TÊN BỘ PC MẪU *
                      </label>

                      <input
                        type="text"
                        required
                        disabled={modalMode === "view"}
                        value={formName}
                        onChange={(event) => setFormName(event.target.value)}
                        className="form-control bg-white shadow-sm"
                        style={{
                          borderRadius: "6px",
                        }}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label text-secondary small">
                        ĐƯỜNG DẪN ẢNH ĐẠI DIỆN (URL)
                      </label>

                      <input
                        type="text"
                        disabled={modalMode === "view"}
                        value={formImage}
                        onChange={(event) => setFormImage(event.target.value)}
                        className="form-control bg-white shadow-sm"
                        style={{
                          borderRadius: "6px",
                        }}
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label text-secondary small">
                        TRẠNG THÁI HIỂN THỊ
                      </label>

                      <select
                        disabled={modalMode === "view"}
                        value={formStatus}
                        onChange={(event) => setFormStatus(event.target.value)}
                        className="form-select bg-white shadow-sm"
                      >
                        <option value="active">Kinh doanh (Hiện Web)</option>

                        <option value="inactive">Bảo trì (Ẩn kho)</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label text-secondary small">
                        MÔ TẢ HIỆU NĂNG / KHUYẾN NGHỊ NHU CẦU SỬ DỤNG
                      </label>

                      <textarea
                        rows={2}
                        disabled={modalMode === "view"}
                        value={formDesc}
                        onChange={(event) => setFormDesc(event.target.value)}
                        className="form-control bg-white shadow-sm"
                      />
                    </div>
                  </div>

                  {/* =====================================
                      COMPONENT LIST
                  ====================================== */}

                  <div className="mb-4">
                    <label
                      className="form-label text-dark small border-bottom pb-2 mb-3 text-uppercase d-flex align-items-center gap-1"
                      style={{
                        letterSpacing: "0.5px",
                        fontWeight: 700,
                      }}
                    >
                      <Cpu size={16} className="text-primary" />
                      Sơ đồ phân mảnh lắp ráp phần cứng máy tính
                    </label>

                    {isLoadingCategories ? (
                      <div className="text-center py-4 text-muted">
                        Đang tải danh mục...
                      </div>
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
                                style={{
                                  minHeight: "85px",
                                }}
                              >
                                <div
                                  style={{
                                    width: "110px",
                                  }}
                                >
                                  <span
                                    className="badge bg-secondary text-white text-uppercase"
                                    style={{
                                      padding: "6px 10px",
                                      fontSize: "11px",
                                      minWidth: "85px",
                                    }}
                                  >
                                    {category.key}
                                  </span>
                                </div>

                                <div className="flex-grow-1 px-2 text-truncate">
                                  {item ? (
                                    <div>
                                      <div
                                        className="text-dark small text-truncate"
                                        style={{
                                          fontWeight: 600,
                                        }}
                                        title={item.name}
                                      >
                                        {item.name}
                                      </div>

                                      <div
                                        className="text-primary mt-1 d-flex align-items-center flex-wrap gap-2"
                                        style={{
                                          fontSize: "11px",
                                        }}
                                      >
                                        <span>
                                          {Number(
                                            item.price || 0,
                                          ).toLocaleString("vi-VN")}{" "}
                                          đ
                                        </span>

                                        <span className="text-muted">
                                          Số lượng: x{item.quantity || 1}
                                        </span>

                                        {item.socket && (
                                          <span className="badge bg-info text-white">
                                            Socket: {item.socket}
                                          </span>
                                        )}

                                        {item.ram_type && (
                                          <span className="badge bg-warning text-dark">
                                            RAM: {item.ram_type}
                                          </span>
                                        )}

                                        {item.wattage && (
                                          <span className="badge bg-dark text-white">
                                            {item.wattage}W
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <span
                                      className="text-muted"
                                      style={{
                                        fontSize: "12px",
                                        fontStyle: "italic",
                                      }}
                                    >
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
                                      onChange={(event) =>
                                        handleUpdateQuantity(
                                          category.key,
                                          event.target.value,
                                        )
                                      }
                                      className="form-control form-control-sm text-center"
                                      style={{
                                        width: "55px",
                                      }}
                                    />
                                  )}

                                  {modalMode !== "view" && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenComponentModal(category.key)
                                        }
                                        className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                                      >
                                        {item ? (
                                          <>
                                            <RefreshCw size={12} />
                                            Đổi
                                          </>
                                        ) : (
                                          "Lắp linh kiện"
                                        )}
                                      </button>

                                      {item && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveComponent(category.key)
                                          }
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

                  {/* =====================================
                      COMPATIBILITY
                  ====================================== */}

                  {!compatibility.isValid ? (
                    <div
                      className="alert alert-danger d-flex gap-3 align-items-start mb-4"
                      style={{
                        borderRadius: "10px",
                        borderLeft: "5px solid #dc3545",
                      }}
                    >
                      <ShieldAlert size={24} className="mt-1" />

                      <div>
                        <strong className="d-block mb-1 text-uppercase">
                          Phát hiện xung đột phần cứng:
                        </strong>

                        <ul className="mb-0 ps-3">
                          {compatibility.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : Object.keys(selectedItems).length > 0 ? (
                    <div className="alert alert-success d-flex gap-2 align-items-center mb-4">
                      <CheckCircle2 size={17} />

                      <span>Các linh kiện hiện tại tương thích với nhau.</span>
                    </div>
                  ) : null}

                  {/* =====================================
                      TOTAL
                  ====================================== */}

                  <div className="p-3 bg-dark text-white rounded d-flex justify-content-between align-items-center">
                    <span
                      className="small"
                      style={{
                        fontWeight: 700,
                      }}
                    >
                      ĐỊNH GIÁ TOÀN BỘ GIÁ TRỊ BỘ PC:
                    </span>

                    <span
                      className="h3 text-warning mb-0"
                      style={{
                        fontWeight: 800,
                      }}
                    >
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
                      <Edit2 size={14} />
                      Chuyển sang chỉnh sửa
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!compatibility.isValid || isSaving}
                      className="btn btn-success px-4 btn-sm d-flex align-items-center gap-2"
                    >
                      <Save size={14} />

                      {isSaving ? "Đang lưu..." : "Xác nhận ghi nhận cấu hình"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          COMPONENT MODAL
      ================================================= */}

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
            <div
              className="modal-content border-0 shadow-lg"
              style={{
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              {/* HEADER */}

              <div className="modal-header bg-primary text-white py-3 px-4">
                <div>
                  <h6
                    className="modal-title mb-0 d-flex align-items-center gap-2"
                    style={{
                      fontWeight: 700,
                    }}
                  >
                    <HardDrive size={18} />
                    Kho linh kiện TechStore: [{activeCategory}]
                  </h6>

                  <small className="text-white-50">
                    Chọn linh kiện từ kho để đưa vào cấu hình.
                  </small>
                </div>

                <button
                  type="button"
                  className="btn border-0 bg-transparent text-white"
                  onClick={() => setIsComponentModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* SEARCH */}

              <div className="p-3 bg-light border-bottom position-relative">
                <Search
                  className="position-absolute text-muted"
                  size={16}
                  style={{
                    left: "24px",
                    top: "22px",
                  }}
                />

                <input
                  type="text"
                  placeholder={`Tìm kiếm linh kiện ${activeCategory}...`}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="form-control shadow-sm"
                  style={{
                    paddingLeft: "40px",
                  }}
                />
              </div>

              {/* COMPONENT LIST */}

              <div
                className="modal-body p-3 bg-white"
                style={{
                  maxHeight: "50vh",
                  overflowY: "auto",
                }}
              >
                {isLoadingComponents ? (
                  <div className="text-center py-5 text-muted">
                    Đang tải linh kiện...
                  </div>
                ) : filteredComponents.length === 0 ? (
                  <div className="text-center py-5 text-muted d-flex flex-column align-items-center gap-2">
                    <Layers size={32} />

                    <span>Không tìm thấy linh kiện phù hợp.</span>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {filteredComponents.map((product) => {
                      const specs = parseSpecifications(product);

                      const socket = specs.socket || product.socket;

                      const ramType =
                        specs.ram_type || specs.ramType || product.ram_type;

                      const powerRecommend =
                        specs.power_recommend ||
                        specs.powerRecommend ||
                        product.power_recommend;

                      const wattage = specs.wattage || product.wattage;

                      return (
                        <div
                          key={product.id}
                          onClick={() => handleSelectComponent(product)}
                          className="p-3 border rounded d-flex justify-content-between align-items-center"
                          style={{
                            cursor: "pointer",
                            borderLeft: "4px solid #0d6efd",
                          }}
                        >
                          <div className="pe-3 text-truncate flex-grow-1">
                            <div
                              className="text-dark mb-1"
                              style={{
                                fontWeight: 600,
                              }}
                            >
                              {product.name}
                            </div>

                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              <span
                                className="text-muted"
                                style={{
                                  fontSize: "11px",
                                }}
                              >
                                SKU: {product.sku || `SP-${product.id}`}
                              </span>

                              {socket && (
                                <span className="badge bg-light text-dark border">
                                  Socket: {socket}
                                </span>
                              )}

                              {ramType && (
                                <span className="badge bg-light text-dark border">
                                  RAM: {ramType}
                                </span>
                              )}

                              {powerRecommend && (
                                <span className="badge bg-danger text-white">
                                  Nguồn khuyến nghị: {powerRecommend}
                                </span>
                              )}

                              {wattage && (
                                <span className="badge bg-dark text-white">
                                  {wattage}W
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-end">
                            <div
                              className="text-primary"
                              style={{
                                fontWeight: 700,
                              }}
                            >
                              {Number(product.price || 0).toLocaleString(
                                "vi-VN",
                              )}{" "}
                              đ
                            </div>

                            <div
                              className="text-muted"
                              style={{
                                fontSize: "11px",
                              }}
                            >
                              Kho: {product.quantity ?? 0}
                            </div>
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
