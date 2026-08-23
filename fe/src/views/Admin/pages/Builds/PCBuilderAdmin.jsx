import React, { useEffect, useMemo, useState } from "react";

import pcPartService from "../../../../services/pcPartService";
import axiosClient from "../../../../services/axiosClient";

import "./PCBuilderAdmin.css";

const IMAGE_BASE_URL =
  process.env.REACT_APP_UPLOAD_URL || "http://localhost:5000";

const FALLBACK_CATEGORIES = [
  {
    key: "CPU",
    label: "Bộ vi xử lý",
  },
  {
    key: "MAINBOARD",
    label: "Bo mạch chủ",
  },
  {
    key: "RAM",
    label: "Bộ nhớ RAM",
  },
  {
    key: "VGA",
    label: "Card đồ họa",
  },
  {
    key: "COOLING",
    label: "Tản nhiệt",
  },
  {
    key: "PSU",
    label: "Nguồn máy tính",
  },
  {
    key: "STORAGE",
    label: "Ổ cứng lưu trữ",
  },
  {
    key: "CASE",
    label: "Vỏ máy tính",
  },
];

const CATEGORY_ICONS = {
  CPU: "bi-cpu",
  MAINBOARD: "bi-motherboard",
  RAM: "bi-memory",
  VGA: "bi-gpu-card",
  COOLING: "bi-fan",
  PSU: "bi-lightning-charge",
  STORAGE: "bi-device-ssd",
  CASE: "bi-pc-display",
};

const BUDGET_RATIOS = {
  office: {
    CPU: 0.32,
    MAINBOARD: 0.18,
    RAM: 0.18,
    STORAGE: 0.15,
    PSU: 0.1,
    CASE: 0.04,
    COOLING: 0.03,
  },

  gaming: {
    VGA: 0.36,
    CPU: 0.2,
    MAINBOARD: 0.12,
    RAM: 0.1,
    STORAGE: 0.08,
    PSU: 0.06,
    COOLING: 0.05,
    CASE: 0.03,
  },

  design: {
    CPU: 0.25,
    RAM: 0.2,
    VGA: 0.22,
    STORAGE: 0.12,
    MAINBOARD: 0.08,
    PSU: 0.06,
    COOLING: 0.05,
    CASE: 0.02,
  },
};

const AUTO_BUILD_ORDER = [
  "VGA",
  "CPU",
  "MAINBOARD",
  "RAM",
  "STORAGE",
  "COOLING",
  "PSU",
  "CASE",
];

// =========================================================
// HELPERS
// =========================================================

const formatMoney = (value) => {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
};

const getImageUrl = (image) => {
  if (!image) {
    return "";
  }

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  return `${IMAGE_BASE_URL}${image}`;
};

const normalizeCategoryKey = (key = "") => {
  if (!key) {
    return "";
  }

  const value = String(key).trim().toLowerCase();

  if (
    value.includes("vga") ||
    value.includes("card") ||
    value.includes("đồ họa") ||
    value === "66"
  ) {
    return "VGA";
  }

  if (
    value.includes("cpu") ||
    value.includes("vi xử lý") ||
    value.includes("chip")
  ) {
    return "CPU";
  }

  if (
    value.includes("main") ||
    value.includes("motherboard") ||
    value.includes("bo mạch")
  ) {
    return "MAINBOARD";
  }

  if (value.includes("ram") || value.includes("bộ nhớ")) {
    return "RAM";
  }

  if (
    value.includes("psu") ||
    value.includes("nguồn") ||
    value.includes("power")
  ) {
    return "PSU";
  }

  if (
    value.includes("storage") ||
    value.includes("ssd") ||
    value.includes("hdd") ||
    value.includes("ổ cứng")
  ) {
    return "STORAGE";
  }

  if (value.includes("case") || value.includes("vỏ")) {
    return "CASE";
  }

  if (value.includes("cool") || value.includes("tản")) {
    return "COOLING";
  }

  return value.toUpperCase();
};

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

const detectItemCategory = (item) => {
  if (!item) {
    return null;
  }

  const rawCategory = String(
    item?.category_key || item?.category || item?.category_name || "",
  ).toUpperCase();

  const productName = String(
    item?.name || item?.product_name || "",
  ).toUpperCase();

  const typeId = Number(
    item?.type_id || item?.part_type_id || item?.pc_part?.type_id,
  );

  if (typeId === 1) return "CPU";
  if (typeId === 2) return "MAINBOARD";
  if (typeId === 3) return "RAM";
  if (typeId === 4) return "VGA";
  if (typeId === 5) return "COOLING";
  if (typeId === 6) return "PSU";
  if (typeId === 7) return "STORAGE";
  if (typeId === 8) return "CASE";

  const combined = `${rawCategory} ${productName}`.toUpperCase();

  if (
    combined.includes("CPU") ||
    combined.includes("RYZEN") ||
    combined.includes("CORE I")
  ) {
    return "CPU";
  }

  if (
    combined.includes("MAIN") ||
    combined.includes("MOTHERBOARD") ||
    combined.includes("B550") ||
    combined.includes("H610") ||
    combined.includes("Z690") ||
    combined.includes("B650")
  ) {
    return "MAINBOARD";
  }

  if (
    combined.includes("RAM") ||
    combined.includes("DDR4") ||
    combined.includes("DDR5")
  ) {
    return "RAM";
  }

  if (
    combined.includes("VGA") ||
    combined.includes("GPU") ||
    combined.includes("RTX") ||
    combined.includes("GTX") ||
    combined.includes("RX ") ||
    combined.includes("NVIDIA") ||
    combined.includes("RADEON")
  ) {
    return "VGA";
  }

  if (
    combined.includes("COOL") ||
    combined.includes("TẢN") ||
    combined.includes("THERMALRIGHT") ||
    combined.includes("CR-")
  ) {
    return "COOLING";
  }

  if (
    combined.includes("PSU") ||
    combined.includes("NGUỒN") ||
    combined.includes("BRONZE") ||
    combined.includes("ATOM") ||
    combined.includes("A650BN") ||
    combined.includes("CV") ||
    combined.includes("MWE")
  ) {
    return "PSU";
  }

  if (
    combined.includes("STORAGE") ||
    combined.includes("DISK") ||
    combined.includes("HARD-DISK") ||
    combined.includes("SSD") ||
    combined.includes("HDD") ||
    combined.includes("NVME") ||
    combined.includes("SATA")
  ) {
    return "STORAGE";
  }

  if (
    combined.includes("CASE") ||
    combined.includes("VỎ") ||
    combined.includes("XIGMATEK") ||
    combined.includes("AIRFLOW")
  ) {
    return "CASE";
  }

  return null;
};

const normalizeProduct = (product, quantity = 1) => {
  const specifications = parseSpecifications(product);

  const productId = product.product_id || product.id || product.productId;

  return {
    ...product,

    id: productId,

    product_id: productId,

    name: product.name || product.product_name || "Linh kiện",

    sku: product.sku || product.product_sku || "",

    price: Number(product.sale_price) || Number(product.price) || 0,

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

    specifications,
  };
};

// =========================================================
// MAIN COMPONENT
// =========================================================

export default function PCBuilderAdmin() {
  // =======================================================
  // MAIN STATE
  // =======================================================

  const [builds, setBuilds] = useState([]);

  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);

  const [allComponents, setAllComponents] = useState([]);

  // =======================================================
  // AUTO BUILD
  // =======================================================

  const [targetBudget, setTargetBudget] = useState(15000000);

  const [targetUsage, setTargetUsage] = useState("gaming");

  // =======================================================
  // BUILD FORM
  // =======================================================

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [modalMode, setModalMode] = useState("view");

  const [editingBuildId, setEditingBuildId] = useState(null);

  const [formName, setFormName] = useState("");

  const [formDesc, setFormDesc] = useState("");

  const [formImage, setFormImage] = useState("");

  const [formStatus, setFormStatus] = useState(1);

  const [formErrors, setFormErrors] = useState({});

  const [selectedItems, setSelectedItems] = useState({});

  // =======================================================
  // COMPONENT MODAL
  // =======================================================

  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);

  const [activeCategory, setActiveCategory] = useState("");

  const [componentList, setComponentList] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");

  // =======================================================
  // LOADING
  // =======================================================

  const [isLoadingBuilds, setIsLoadingBuilds] = useState(false);

  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const [isLoadingComponents, setIsLoadingComponents] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [visibilityUpdatingId, setVisibilityUpdatingId] = useState(null);

  // =======================================================
  // LOAD BUILDS
  // =======================================================

  const fetchBuilds = async () => {
    try {
      setIsLoadingBuilds(true);

      const response = await axiosClient.get("/admin/pc-builds");

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      setBuilds(data);
    } catch (error) {
      console.error(
        "Lỗi lấy danh sách cấu hình:",
        error.response?.data || error.message,
      );

      setBuilds([]);
    } finally {
      setIsLoadingBuilds(false);
    }
  };

  // =======================================================
  // LOAD CATEGORIES
  // =======================================================

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);

      const response = await axiosClient.get("/admin/pc-builds/categories");

      let rawCategories = [];

      if (Array.isArray(response.data)) {
        rawCategories = response.data;
      } else if (Array.isArray(response.data?.data)) {
        rawCategories = response.data.data;
      }

      const apiCategories = rawCategories
        .filter(Boolean)
        .map((category) => {
          if (typeof category === "string") {
            const key = normalizeCategoryKey(category);

            return {
              key,
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

          const key = normalizeCategoryKey(rawKey);

          return {
            ...category,

            key,

            label: category.label || category.name || category.category || key,
          };
        })
        .filter((category) => category.key);

      const categoryMap = new Map();

      FALLBACK_CATEGORIES.forEach((category) => {
        categoryMap.set(category.key, category);
      });

      apiCategories.forEach((category) => {
        const fallback = categoryMap.get(category.key);

        categoryMap.set(category.key, {
          ...fallback,
          ...category,

          key: category.key,

          label: category.label || fallback?.label || category.key,
        });
      });

      setCategories(Array.from(categoryMap.values()));
    } catch (error) {
      console.error("Lỗi lấy danh mục:", error.response?.data || error.message);

      setCategories(FALLBACK_CATEGORIES);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // =======================================================
  // LOAD ALL COMPONENTS
  // =======================================================

  const fetchAllComponents = async () => {
    try {
      const response = await pcPartService.getBuildComponents();

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      setAllComponents(data);
    } catch (error) {
      console.error("Lỗi tải linh kiện Build PC:", error);

      setAllComponents([]);
    }
  };

  // =======================================================
  // INITIAL
  // =======================================================

  useEffect(() => {
    fetchBuilds();
    fetchCategories();
    fetchAllComponents();
  }, []);

  // =======================================================
  // ESC CLOSE
  // =======================================================

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (isComponentModalOpen) {
        setIsComponentModalOpen(false);

        return;
      }

      if (isModalOpen) {
        setIsModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, isComponentModalOpen]);

  // =======================================================
  // LOCK BODY
  // =======================================================

  useEffect(() => {
    const modalOpen = isModalOpen || isComponentModalOpen;

    document.body.classList.toggle("adm-build-modal-open", modalOpen);

    return () => {
      document.body.classList.remove("adm-build-modal-open");
    };
  }, [isModalOpen, isComponentModalOpen]);

  // =======================================================
  // RESET BUILD
  // =======================================================

  const resetBuildForm = () => {
    setEditingBuildId(null);

    setFormName("");

    setFormDesc("");

    setFormImage("");

    setFormStatus(1);

    setSelectedItems({});

    setFormErrors({});
  };

  // =======================================================
  // OPEN ADD
  // =======================================================

  const handleOpenAddModal = () => {
    resetBuildForm();

    setModalMode("add");

    setIsModalOpen(true);
  };

  // =======================================================
  // OPEN VIEW
  // =======================================================

  const handleOpenViewModal = (build) => {
    setEditingBuildId(build.id);

    setModalMode("view");

    setFormName(build.name || "");

    setFormDesc(build.description || "");

    setFormImage(build.image || build.thumbnail || "");

    setFormStatus(
      build.status !== undefined && build.status !== null
        ? Number(build.status)
        : 1,
    );

    const itemsMap = {};

    const buildItems = Array.isArray(build.items) ? build.items : [];

    buildItems.forEach((item) => {
      const category = detectItemCategory(item);

      if (!category) {
        return;
      }

      itemsMap[category] = normalizeProduct(item, item.quantity || 1);
    });

    setSelectedItems(itemsMap);

    setFormErrors({});

    setIsModalOpen(true);
  };

  // =======================================================
  // EDIT
  // =======================================================

  const handleEnableEditMode = () => {
    setModalMode("edit");
  };

  // =======================================================
  // DELETE BUILD
  // =======================================================

  const handleDeleteBuild = async (id) => {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa cấu hình mẫu này không?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await axiosClient.delete(`/admin/pc-builds/${id}`);

      setBuilds((previous) => previous.filter((build) => build.id !== id));
    } catch (error) {
      console.error("Lỗi xóa cấu hình:", error.response?.data || error.message);

      window.alert(error.response?.data?.message || "Không thể xóa cấu hình.");
    }
  };

  // =======================================================
  // TOGGLE PART VISIBILITY
  // =======================================================

  const handleToggleVisibility = async (id, currentStatus) => {
    try {
      setVisibilityUpdatingId(id);

      const newStatus = currentStatus === 1 || currentStatus === true ? 0 : 1;

      await axiosClient.put(`/admin/pc-parts/${id}/visibility`, {
        is_visible: newStatus,
      });

      setComponentList((previous) =>
        previous.map((item) =>
          Number(item.product_id || item.id) === Number(id)
            ? {
                ...item,
                is_visible: newStatus,
              }
            : item,
        ),
      );

      setAllComponents((previous) =>
        previous.map((item) =>
          Number(item.product_id || item.id) === Number(id)
            ? {
                ...item,
                is_visible: newStatus,
              }
            : item,
        ),
      );
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);

      window.alert("Không thể đổi trạng thái linh kiện này.");
    } finally {
      setVisibilityUpdatingId(null);
    }
  };

  // =======================================================
  // COMPONENT MODAL
  // =======================================================

  const handleOpenComponentModal = async (category) => {
    if (modalMode === "view") {
      return;
    }

    const normalizedCategory = normalizeCategoryKey(category);

    setActiveCategory(normalizedCategory);

    setSearchQuery("");

    setComponentList([]);

    setIsComponentModalOpen(true);

    setIsLoadingComponents(true);

    try {
      const response = await axiosClient.get("/admin/pc-builds/components");

      let rawData = [];

      if (Array.isArray(response.data)) {
        rawData = response.data;
      } else if (Array.isArray(response.data?.data)) {
        rawData = response.data.data;
      } else if (Array.isArray(response.data?.products)) {
        rawData = response.data.products;
      } else if (Array.isArray(response.data?.components)) {
        rawData = response.data.components;
      }

      const filteredData = rawData.filter(
        (item) => detectItemCategory(item) === normalizedCategory,
      );

      const normalizedProducts = filteredData.map((product) => {
        const item = normalizeProduct(product, 1);

        return {
          ...item,

          type_id: product.type_id || item.type_id,

          category_id: product.category_id || item.category_id,

          specifications: product.specifications || item.specifications,
        };
      });

      const uniqueProducts = normalizedProducts.filter(
        (product, index, array) =>
          index ===
          array.findIndex((item) => Number(item.id) === Number(product.id)),
      );

      setComponentList(uniqueProducts);
    } catch (error) {
      console.error(
        `Lỗi tải ${normalizedCategory}:`,
        error.response?.data || error.message,
      );

      setComponentList([]);
    } finally {
      setIsLoadingComponents(false);
    }
  };

  // =======================================================
  // SELECT COMPONENT
  // =======================================================

  const handleSelectComponent = (product) => {
    const normalizedProduct = normalizeProduct(
      product,
      selectedItems[activeCategory]?.quantity || 1,
    );

    const updatedItems = {
      ...selectedItems,

      [activeCategory]: normalizedProduct,
    };

    setSelectedItems(updatedItems);

    const requiredCategories = ["cpu", "mainboard", "ram"];

    const selectedKeys = Object.keys(updatedItems).map((key) =>
      key.toLowerCase().trim(),
    );

    const complete = requiredCategories.every((category) =>
      selectedKeys.includes(category),
    );

    if (complete && formErrors.components) {
      setFormErrors((previous) => ({
        ...previous,

        components: null,
      }));
    }

    setIsComponentModalOpen(false);
  };

  // =======================================================
  // QUANTITY
  // =======================================================

  const handleUpdateQuantity = (category, value) => {
    if (modalMode === "view") {
      return;
    }

    const quantity = Number(value);

    if (!Number.isFinite(quantity) || quantity < 1) {
      return;
    }

    setSelectedItems((previous) => ({
      ...previous,

      [category]: {
        ...previous[category],

        quantity,
      },
    }));
  };

  // =======================================================
  // REMOVE PART
  // =======================================================

  const handleRemoveComponent = (category) => {
    if (modalMode === "view") {
      return;
    }

    setSelectedItems((previous) => {
      const updated = {
        ...previous,
      };

      delete updated[category];

      return updated;
    });
  };

  // =======================================================
  // TOTAL
  // =======================================================

  const totalPrice = useMemo(() => {
    return Object.values(selectedItems).reduce((total, item) => {
      const price = Number(item?.price) || 0;

      const quantity = Number(item?.quantity) || 1;

      return total + price * quantity;
    }, 0);
  }, [selectedItems]);

  // =======================================================
  // COMPATIBILITY
  // =======================================================

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
        errors.push(
          `CPU sử dụng Socket ${cpu.socket} nhưng Mainboard sử dụng Socket ${mainboard.socket}.`,
        );
      }
    }

    if (mainboard && ram && mainboard.ram_type && ram.ram_type) {
      const mainRam = String(mainboard.ram_type).toLowerCase().trim();

      const ramType = String(ram.ram_type).toLowerCase().trim();

      if (mainRam !== ramType) {
        errors.push(
          `Mainboard hỗ trợ ${mainboard.ram_type} nhưng RAM được chọn là ${ram.ram_type}.`,
        );
      }
    }

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
          `VGA yêu cầu nguồn tối thiểu ${requiredPower}W nhưng PSU hiện tại chỉ có ${psuPower}W.`,
        );
      }
    }

    return {
      isValid: errors.length === 0,

      errors,
    };
  }, [selectedItems]);

  // =======================================================
  // AUTO BUILD
  // =======================================================

  const handleAutoBuild = async () => {
    let source = [...(allComponents || [])];

    if (source.length === 0) {
      try {
        const response = await axiosClient.get("/admin/pc-builds/components");

        const raw =
          response.data?.data ||
          response.data?.components ||
          response.data?.products ||
          (Array.isArray(response.data) ? response.data : []);

        if (Array.isArray(raw)) {
          source = raw;

          setAllComponents(raw);
        }
      } catch (error) {
        console.error("Lỗi tải linh kiện Auto Build:", error);
      }
    }

    if (source.length === 0) {
      window.alert("Kho linh kiện đang trống.");

      return;
    }

    const validComponents = source
      .map((item) => normalizeProduct(item, 1))
      .filter((item) => {
        const price = Number(item.price) || 0;

        const rawQuantity = item.quantity ?? item.stock ?? item.in_stock;

        const stock = rawQuantity !== undefined ? Number(rawQuantity) : 99;

        return price > 0 && stock > 0;
      });

    if (validComponents.length === 0) {
      window.alert("Không có linh kiện hợp lệ để tự động tạo cấu hình.");

      return;
    }

    const ratio = BUDGET_RATIOS[targetUsage] || BUDGET_RATIOS.gaming;

    const newSelection = {};

    AUTO_BUILD_ORDER.forEach((categoryKey) => {
      const categoryRatio = ratio[categoryKey];

      if (categoryRatio === undefined || categoryRatio === null) {
        return;
      }

      const targetPrice = targetBudget * categoryRatio;

      let candidates = validComponents.filter((product) => {
        const raw =
          detectItemCategory(product) ||
          product.category_key ||
          product.category;

        return normalizeCategoryKey(raw) === categoryKey;
      });

      if (candidates.length === 0) {
        return;
      }

      // CPU -> MAINBOARD
      if (categoryKey === "MAINBOARD" && newSelection.CPU) {
        const cpu = newSelection.CPU;

        const cpuSocket = String(cpu.socket || "")
          .toLowerCase()
          .trim();

        if (cpuSocket) {
          const compatible = candidates.filter((item) => {
            const normalized = normalizeProduct(item);

            return (
              String(normalized.socket || "")
                .toLowerCase()
                .trim() === cpuSocket
            );
          });

          if (compatible.length > 0) {
            candidates = compatible;
          }
        }
      }

      // MAINBOARD -> RAM
      if (categoryKey === "RAM" && newSelection.MAINBOARD) {
        const motherboard = newSelection.MAINBOARD;

        const requiredRam = String(motherboard.ram_type || "")
          .toLowerCase()
          .trim();

        if (requiredRam) {
          const compatible = candidates.filter((item) => {
            const normalized = normalizeProduct(item);

            return (
              String(normalized.ram_type || "")
                .toLowerCase()
                .trim() === requiredRam
            );
          });

          if (compatible.length > 0) {
            candidates = compatible;
          }
        }
      }

      // CPU -> COOLING
      if (categoryKey === "COOLING" && newSelection.CPU) {
        const cpuSocket = String(newSelection.CPU.socket || "")
          .toLowerCase()
          .trim();

        if (cpuSocket) {
          const compatible = candidates.filter((item) => {
            const specs = parseSpecifications(item);

            const sockets = String(
              specs.socket || item.socket || item.supported_sockets || "",
            ).toLowerCase();

            return !sockets || sockets.includes(cpuSocket);
          });

          if (compatible.length > 0) {
            candidates = compatible;
          }
        }
      }

      // PSU
      if (categoryKey === "PSU") {
        let requiredPower = 0;

        if (newSelection.VGA) {
          requiredPower =
            parseInt(
              String(newSelection.VGA.power_recommend || "").replace(/\D/g, ""),
              10,
            ) || 0;
        }

        if (!requiredPower) {
          const vgaSpecs = parseSpecifications(newSelection.VGA || {});

          const cpuSpecs = parseSpecifications(newSelection.CPU || {});

          const vgaWatt =
            parseInt(
              String(vgaSpecs.vga_wattage || 0).replace(/\D/g, ""),
              10,
            ) || 0;

          const cpuWatt =
            parseInt(String(cpuSpecs.wattage || 65).replace(/\D/g, ""), 10) ||
            65;

          requiredPower = vgaWatt + cpuWatt + 150;
        }

        if (requiredPower > 0) {
          const compatible = candidates.filter((item) => {
            const normalized = normalizeProduct(item);

            const power = parseInt(
              String(
                normalized.wattage || item.power || item.name || "",
              ).replace(/\D/g, ""),
              10,
            );

            return Number.isFinite(power) && power >= requiredPower;
          });

          if (compatible.length > 0) {
            candidates = compatible;
          }
        }
      }

      const bestFit = candidates.reduce((previous, current) => {
        const previousPrice = Number(previous.price) || 0;

        const currentPrice = Number(current.price) || 0;

        return Math.abs(currentPrice - targetPrice) <
          Math.abs(previousPrice - targetPrice)
          ? current
          : previous;
      });

      newSelection[categoryKey] = normalizeProduct(bestFit, 1);
    });

    if (Object.keys(newSelection).length === 0) {
      window.alert("Không chọn được cấu hình phù hợp.");

      return;
    }

    setSelectedItems(newSelection);

    setFormErrors((previous) => ({
      ...previous,

      components: null,

      compatibility: null,
    }));
  };

  // =======================================================
  // SAVE BUILD
  // =======================================================

  const handleSaveBuild = async (event) => {
    event.preventDefault();

    if (modalMode === "view" || isSaving) {
      return;
    }

    const errors = {};

    const name = formName.trim();

    if (!name) {
      errors.name = "Vui lòng nhập tên bộ PC.";
    } else {
      const duplicate = builds.some(
        (build) =>
          String(build.name || "")
            .trim()
            .toLowerCase() === name.toLowerCase() &&
          Number(build.id) !== Number(editingBuildId),
      );

      if (duplicate) {
        errors.name = "Tên bộ PC đã tồn tại.";
      }
    }

    if (!formDesc.trim() || formDesc.trim().length < 10) {
      errors.desc = "Mô tả phải có ít nhất 10 ký tự.";
    }

    const required = ["CPU", "MAINBOARD", "RAM"];

    const missing = required.filter((category) => !selectedItems[category]);

    if (missing.length > 0) {
      errors.components = `Vui lòng chọn linh kiện bắt buộc: ${missing.join(", ")}.`;
    }

    if (!compatibility.isValid) {
      errors.compatibility = "Cấu hình có linh kiện không tương thích.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);

      return;
    }

    const items = Object.entries(selectedItems).map(([category, item]) => ({
      category,

      product_id: item.product_id || item.id,

      quantity: Number(item.quantity) || 1,
    }));

    const payload = {
      name,

      description: formDesc.trim(),

      image: formImage.trim(),

      status: Number(formStatus),

      total_price: totalPrice,

      items,
    };

    try {
      setIsSaving(true);

      if (modalMode === "edit" && editingBuildId) {
        await axiosClient.put(`/admin/pc-builds/${editingBuildId}`, payload);
      } else {
        await axiosClient.post("/admin/pc-builds", payload);
      }

      await fetchBuilds();

      setIsModalOpen(false);

      resetBuildForm();
    } catch (error) {
      console.error("Lỗi lưu cấu hình:", error.response?.data || error.message);

      window.alert(
        error.response?.data?.message || "Không thể lưu cấu hình Build PC.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // =======================================================
  // SEARCH COMPONENT
  // =======================================================

  const filteredComponents = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    if (!keyword) {
      return componentList;
    }

    return componentList.filter((item) => {
      const name = String(item.name || "").toLowerCase();

      const sku = String(item.sku || "").toLowerCase();

      return name.includes(keyword) || sku.includes(keyword);
    });
  }, [componentList, searchQuery]);

  // =======================================================
  // COUNTERS
  // =======================================================

  const activeBuildCount = useMemo(() => {
    return builds.filter((build) => Number(build.status) === 1).length;
  }, [builds]);

  const hiddenBuildCount = builds.length - activeBuildCount;

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="adm-build-page">
      {/* =================================================
          HEADER
          ================================================= */}

      <section className="adm-build-header">
        <div>
          <span className="adm-build-kicker">
            <i className="bi bi-pc-display-horizontal" />
            Build PC
          </span>

          <h1>Quản lý cấu hình Build PC</h1>

          <p>
            Xây dựng cấu hình máy tính, kiểm tra khả năng tương thích và quản lý
            các bộ PC mẫu hiển thị trên website.
          </p>
        </div>

        <button
          type="button"
          className="adm-build-btn adm-build-btn--primary"
          onClick={handleOpenAddModal}
        >
          <i className="bi bi-plus-lg" />
          Thiết kế bộ PC mới
        </button>
      </section>

      {/* =================================================
          STATISTICS
          ================================================= */}

      <section className="adm-build-stats">
        <article className="adm-build-stat">
          <span className="adm-build-stat__icon adm-build-stat__icon--blue">
            <i className="bi bi-pc-display-horizontal" />
          </span>

          <div>
            <span>Tổng cấu hình</span>

            <strong>{builds.length}</strong>
          </div>
        </article>

        <article className="adm-build-stat">
          <span className="adm-build-stat__icon adm-build-stat__icon--green">
            <i className="bi bi-check-circle-fill" />
          </span>

          <div>
            <span>Đang kinh doanh</span>

            <strong>{activeBuildCount}</strong>
          </div>
        </article>

        <article className="adm-build-stat">
          <span className="adm-build-stat__icon adm-build-stat__icon--red">
            <i className="bi bi-eye-slash-fill" />
          </span>

          <div>
            <span>Đang ẩn</span>

            <strong>{hiddenBuildCount}</strong>
          </div>
        </article>

        <article className="adm-build-stat">
          <span className="adm-build-stat__icon adm-build-stat__icon--orange">
            <i className="bi bi-boxes" />
          </span>

          <div>
            <span>Linh kiện kho</span>

            <strong>{allComponents.length}</strong>
          </div>
        </article>
      </section>

      {/* =================================================
          TABLE PANEL
          ================================================= */}

      <section className="adm-build-panel">
        <div className="adm-build-panel__header">
          <div className="adm-build-panel__title">
            <span>
              <i className="bi bi-list-ul" />
            </span>

            <div>
              <h2>Danh sách cấu hình</h2>

              <p>Các cấu hình PC mẫu đang được quản lý trong hệ thống.</p>
            </div>
          </div>

          <button
            type="button"
            className="adm-build-refresh"
            onClick={fetchBuilds}
            disabled={isLoadingBuilds}
          >
            <i className="bi bi-arrow-clockwise" />
            Làm mới
          </button>
        </div>

        <div className="adm-build-table-wrap">
          <table className="adm-build-table">
            <thead>
              <tr>
                <th>Hình ảnh</th>

                <th>Bộ PC / Mô tả</th>

                <th>Tổng giá</th>

                <th>Trạng thái</th>

                <th>Hành động</th>
              </tr>
            </thead>

            <tbody>
              {isLoadingBuilds ? (
                <tr>
                  <td colSpan="5" className="adm-build-table__state">
                    <span className="adm-build-spinner" />

                    <strong>Đang tải cấu hình...</strong>
                  </td>
                </tr>
              ) : builds.length === 0 ? (
                <tr>
                  <td colSpan="5" className="adm-build-table__state">
                    <div className="adm-build-empty">
                      <span>
                        <i className="bi bi-pc-display" />
                      </span>

                      <strong>Chưa có cấu hình</strong>

                      <p>Hãy tạo bộ PC mẫu đầu tiên cho hệ thống.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                builds.map((build) => (
                  <tr key={build.id}>
                    <td>
                      <div className="adm-build-thumb">
                        {build.image || build.thumbnail ? (
                          <img
                            src={getImageUrl(build.image || build.thumbnail)}
                            alt={build.name || "PC"}
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <i className="bi bi-image" />
                        )}
                      </div>
                    </td>

                    <td>
                      <strong className="adm-build-name">{build.name}</strong>

                      <p className="adm-build-description">
                        {build.description || "Chưa có mô tả hiệu năng."}
                      </p>
                    </td>

                    <td>
                      <strong className="adm-build-price">
                        {formatMoney(build.total_price)}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={
                          Number(build.status) === 1
                            ? "adm-build-status adm-build-status--active"
                            : "adm-build-status adm-build-status--hidden"
                        }
                      >
                        <span />

                        {Number(build.status) === 1 ? "Kinh doanh" : "Bảo trì"}
                      </span>
                    </td>

                    <td>
                      <div className="adm-build-row-actions">
                        <button
                          type="button"
                          className="adm-build-action adm-build-action--view"
                          onClick={() => handleOpenViewModal(build)}
                        >
                          <i className="bi bi-eye" />
                          Chi tiết
                        </button>

                        <button
                          type="button"
                          className="adm-build-action adm-build-action--delete"
                          onClick={() => handleDeleteBuild(build.id)}
                          title="Xóa cấu hình"
                        >
                          <i className="bi bi-trash3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* =================================================
          BUILD MODAL
          ================================================= */}

      {isModalOpen && (
        <div className="adm-build-modal" onClick={() => setIsModalOpen(false)}>
          <div
            className="adm-build-modal__dialog"
            onClick={(event) => event.stopPropagation()}
          >
            {/* HEADER */}

            <div
              className={
                modalMode === "view"
                  ? "adm-build-modal__header adm-build-modal__header--view"
                  : "adm-build-modal__header"
              }
            >
              <div>
                <span className="adm-build-modal__kicker">
                  {modalMode === "view"
                    ? "Chi tiết cấu hình"
                    : modalMode === "edit"
                      ? "Chỉnh sửa cấu hình"
                      : "Cấu hình mới"}
                </span>

                <h2>
                  {modalMode === "view" && "Bản thiết kế cấu hình máy"}

                  {modalMode === "edit" && "Chỉnh sửa bộ PC"}

                  {modalMode === "add" && "Thiết kế bộ PC mới"}
                </h2>
              </div>

              <button
                type="button"
                className="adm-build-modal__close"
                onClick={() => setIsModalOpen(false)}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <form onSubmit={handleSaveBuild}>
              <div className="adm-build-modal__body">
                {/* =========================================
                    BASIC INFO
                    ========================================= */}

                <section className="adm-build-form-card">
                  <div className="adm-build-form-card__title">
                    <span>
                      <i className="bi bi-info-circle" />
                    </span>

                    <div>
                      <h3>Thông tin cấu hình</h3>

                      <p>Tên, ảnh đại diện, trạng thái và mô tả.</p>
                    </div>
                  </div>

                  <div className="adm-build-form-grid">
                    <div className="adm-build-field adm-build-field--5">
                      <label>
                        Tên bộ PC
                        <b>*</b>
                      </label>

                      <input
                        type="text"
                        disabled={modalMode === "view"}
                        value={formName}
                        className={
                          formErrors.name
                            ? "adm-build-input adm-build-input--error"
                            : "adm-build-input"
                        }
                        onChange={(event) => {
                          setFormName(event.target.value);

                          if (formErrors.name) {
                            setFormErrors((previous) => ({
                              ...previous,

                              name: null,
                            }));
                          }
                        }}
                      />

                      {formErrors.name && (
                        <small className="adm-build-error">
                          {formErrors.name}
                        </small>
                      )}
                    </div>

                    <div className="adm-build-field adm-build-field--4">
                      <label>Ảnh đại diện</label>

                      <input
                        type="text"
                        disabled={modalMode === "view"}
                        value={formImage}
                        className="adm-build-input"
                        placeholder="/uploads/... hoặc https://..."
                        onChange={(event) => setFormImage(event.target.value)}
                      />
                    </div>

                    <div className="adm-build-field adm-build-field--3">
                      <label>Trạng thái</label>

                      <select
                        disabled={modalMode === "view"}
                        value={Number(formStatus)}
                        className="adm-build-input"
                        onChange={(event) =>
                          setFormStatus(Number(event.target.value))
                        }
                      >
                        <option value={1}>Kinh doanh</option>

                        <option value={0}>Bảo trì</option>
                      </select>
                    </div>

                    <div className="adm-build-field adm-build-field--12">
                      <label>
                        Mô tả hiệu năng
                        <b>*</b>
                      </label>

                      <textarea
                        rows={3}
                        disabled={modalMode === "view"}
                        value={formDesc}
                        className={
                          formErrors.desc
                            ? "adm-build-textarea adm-build-input--error"
                            : "adm-build-textarea"
                        }
                        onChange={(event) => {
                          setFormDesc(event.target.value);

                          if (formErrors.desc) {
                            setFormErrors((previous) => ({
                              ...previous,

                              desc: null,
                            }));
                          }
                        }}
                      />

                      {formErrors.desc && (
                        <small className="adm-build-error">
                          {formErrors.desc}
                        </small>
                      )}
                    </div>
                  </div>
                </section>

                {/* =========================================
                    AUTO BUILD
                    ========================================= */}

                {modalMode !== "view" && (
                  <section className="adm-build-auto">
                    <div className="adm-build-auto__header">
                      <span>
                        <i className="bi bi-stars" />
                      </span>

                      <div>
                        <h3>Gợi ý cấu hình tự động</h3>

                        <p>Tự động phân bổ ngân sách theo nhu cầu sử dụng.</p>
                      </div>
                    </div>

                    <div className="adm-build-auto__grid">
                      <div className="adm-build-field">
                        <label>Nhu cầu sử dụng</label>

                        <select
                          className="adm-build-input"
                          value={targetUsage}
                          onChange={(event) =>
                            setTargetUsage(event.target.value)
                          }
                        >
                          <option value="office">Văn phòng / Học tập</option>

                          <option value="gaming">Chơi game</option>

                          <option value="design">Đồ họa / Edit Video</option>
                        </select>
                      </div>

                      <div className="adm-build-field">
                        <label className="adm-build-budget-label">
                          <span>Ngân sách</span>

                          <strong>{formatMoney(targetBudget)}</strong>
                        </label>

                        <input
                          type="number"
                          min="3000000"
                          step="500000"
                          className="adm-build-input"
                          value={targetBudget}
                          onChange={(event) =>
                            setTargetBudget(Number(event.target.value))
                          }
                        />
                      </div>

                      <div className="adm-build-auto__button-wrap">
                        <button
                          type="button"
                          className="adm-build-auto__button"
                          onClick={handleAutoBuild}
                        >
                          <i className="bi bi-stars" />
                          Tự động chọn
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {/* =========================================
                    COMPONENTS
                    ========================================= */}

                <section className="adm-build-components">
                  <div className="adm-build-section-title">
                    <span>
                      <i className="bi bi-diagram-3" />
                    </span>

                    <div>
                      <h3>Linh kiện cấu hình</h3>

                      <p>Chọn và kiểm tra 8 nhóm linh kiện chính của bộ máy.</p>
                    </div>
                  </div>

                  {formErrors.components && (
                    <div className="adm-build-alert adm-build-alert--danger">
                      <i className="bi bi-exclamation-circle-fill" />

                      <span>{formErrors.components}</span>
                    </div>
                  )}

                  {isLoadingCategories ? (
                    <div className="adm-build-loading">
                      <span className="adm-build-spinner" />
                      Đang tải danh mục...
                    </div>
                  ) : (
                    <div className="adm-build-component-grid">
                      {categories.map((category) => {
                        const item = selectedItems[category.key];

                        const icon = CATEGORY_ICONS[category.key] || "bi-box";

                        return (
                          <article
                            key={category.key}
                            className={
                              item
                                ? "adm-build-slot adm-build-slot--selected"
                                : "adm-build-slot"
                            }
                          >
                            <div className="adm-build-slot__category">
                              <span>
                                <i className={`bi ${icon}`} />
                              </span>

                              <div>
                                <strong>{category.key}</strong>

                                <small>{category.label}</small>
                              </div>
                            </div>

                            <div className="adm-build-slot__content">
                              {item ? (
                                <>
                                  <strong
                                    className="adm-build-slot__name"
                                    title={item.name}
                                  >
                                    {item.name}
                                  </strong>

                                  <div className="adm-build-slot__price">
                                    {formatMoney(item.price)}
                                  </div>

                                  <div className="adm-build-slot__specs">
                                    {item.socket && (
                                      <span>Socket {item.socket}</span>
                                    )}

                                    {item.ram_type && (
                                      <span>{item.ram_type}</span>
                                    )}

                                    {item.wattage && (
                                      <span>{item.wattage}W</span>
                                    )}

                                    <span>SL: {item.quantity || 1}</span>
                                  </div>
                                </>
                              ) : (
                                <div className="adm-build-slot__empty">
                                  <i className="bi bi-plus-circle" />
                                  Chưa chọn linh kiện
                                </div>
                              )}
                            </div>

                            <div className="adm-build-slot__actions">
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
                                />
                              )}

                              {modalMode !== "view" && (
                                <>
                                  <button
                                    type="button"
                                    className="adm-build-slot__change"
                                    onClick={() =>
                                      handleOpenComponentModal(category.key)
                                    }
                                  >
                                    <i
                                      className={
                                        item
                                          ? "bi bi-arrow-repeat"
                                          : "bi bi-plus-lg"
                                      }
                                    />

                                    {item ? "Đổi" : "Lắp"}
                                  </button>

                                  {item && (
                                    <button
                                      type="button"
                                      className="adm-build-slot__remove"
                                      onClick={() =>
                                        handleRemoveComponent(category.key)
                                      }
                                    >
                                      <i className="bi bi-x-lg" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* =========================================
                    COMPATIBILITY
                    ========================================= */}

                {!compatibility.isValid ? (
                  <div className="adm-build-compatibility adm-build-compatibility--error">
                    <span className="adm-build-compatibility__icon">
                      <i className="bi bi-shield-exclamation" />
                    </span>

                    <div>
                      <strong>Phát hiện xung đột phần cứng</strong>

                      <ul>
                        {compatibility.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>

                      {formErrors.compatibility && (
                        <p>{formErrors.compatibility}</p>
                      )}
                    </div>
                  </div>
                ) : Object.keys(selectedItems).length > 0 ? (
                  <div className="adm-build-compatibility adm-build-compatibility--success">
                    <span className="adm-build-compatibility__icon">
                      <i className="bi bi-shield-check" />
                    </span>

                    <div>
                      <strong>Cấu hình tương thích</strong>

                      <p>Các linh kiện hiện tại không phát hiện xung đột.</p>
                    </div>
                  </div>
                ) : null}

                {/* =========================================
                    TOTAL
                    ========================================= */}

                <div className="adm-build-total">
                  <div>
                    <span>Tổng giá trị cấu hình</span>

                    <small>Tổng tiền của toàn bộ linh kiện đang chọn.</small>
                  </div>

                  <strong>{formatMoney(totalPrice)}</strong>
                </div>
              </div>

              {/* FOOTER */}

              <div className="adm-build-modal__footer">
                <button
                  type="button"
                  className="adm-build-btn adm-build-btn--light"
                  onClick={() => setIsModalOpen(false)}
                >
                  Đóng
                </button>

                {modalMode === "view" ? (
                  <button
                    type="button"
                    className="adm-build-btn adm-build-btn--warning"
                    onClick={handleEnableEditMode}
                  >
                    <i className="bi bi-pencil-square" />
                    Chuyển sang chỉnh sửa
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="adm-build-btn adm-build-btn--success"
                  >
                    {isSaving ? (
                      <>
                        <span className="adm-build-spinner adm-build-spinner--small" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle" />

                        {modalMode === "add" ? "Tạo cấu hình" : "Lưu thay đổi"}
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================
          COMPONENT PICKER MODAL
          ================================================= */}

      {isComponentModalOpen && (
        <div
          className="adm-build-picker"
          onClick={() => setIsComponentModalOpen(false)}
        >
          <div
            className="adm-build-picker__dialog"
            onClick={(event) => event.stopPropagation()}
          >
            {/* HEADER */}

            <div className="adm-build-picker__header">
              <div>
                <span className="adm-build-picker__icon">
                  <i
                    className={`bi ${
                      CATEGORY_ICONS[activeCategory] || "bi-box-seam"
                    }`}
                  />
                </span>

                <div>
                  <h2>Kho linh kiện {activeCategory}</h2>

                  <p>Chọn linh kiện để đưa vào cấu hình.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsComponentModalOpen(false)}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {/* SEARCH */}

            <div className="adm-build-picker__search">
              <i className="bi bi-search" />

              <input
                type="text"
                value={searchQuery}
                placeholder={`Tìm ${activeCategory} theo tên hoặc SKU...`}
                onChange={(event) => setSearchQuery(event.target.value)}
              />

              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")}>
                  <i className="bi bi-x-circle-fill" />
                </button>
              )}
            </div>

            {/* BODY */}

            <div className="adm-build-picker__body">
              {isLoadingComponents ? (
                <div className="adm-build-loading">
                  <span className="adm-build-spinner" />
                  Đang tải linh kiện...
                </div>
              ) : filteredComponents.length === 0 ? (
                <div className="adm-build-picker__empty">
                  <span>
                    <i className="bi bi-search" />
                  </span>

                  <strong>Không tìm thấy linh kiện</strong>

                  <p>Hãy thử từ khóa khác hoặc kiểm tra dữ liệu kho.</p>
                </div>
              ) : (
                <div className="adm-build-picker__list">
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

                    const visible = Number(product.is_visible) !== 0;

                    const updating =
                      Number(visibilityUpdatingId) ===
                      Number(product.product_id || product.id);

                    return (
                      <article
                        key={product.id}
                        className={
                          visible
                            ? "adm-build-part"
                            : "adm-build-part adm-build-part--hidden"
                        }
                      >
                        <button
                          type="button"
                          className="adm-build-part__select"
                          onClick={() => handleSelectComponent(product)}
                        >
                          <div className="adm-build-part__main">
                            <div className="adm-build-part__title">
                              <strong>{product.name}</strong>

                              {!visible && <span>Đang ẩn</span>}
                            </div>

                            <div className="adm-build-part__meta">
                              <span>
                                SKU: {product.sku || `SP-${product.id}`}
                              </span>

                              {socket && <span>Socket {socket}</span>}

                              {ramType && <span>{ramType}</span>}

                              {powerRecommend && (
                                <span className="adm-build-part__meta--danger">
                                  PSU {powerRecommend}
                                </span>
                              )}

                              {wattage && <span>{wattage}W</span>}
                            </div>
                          </div>

                          <div className="adm-build-part__price">
                            <strong>{formatMoney(product.price)}</strong>

                            <span>Kho: {product.quantity ?? 0}</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          className={
                            visible
                              ? "adm-build-visibility adm-build-visibility--hide"
                              : "adm-build-visibility adm-build-visibility--show"
                          }
                          disabled={updating}
                          onClick={() =>
                            handleToggleVisibility(
                              product.product_id || product.id,
                              product.is_visible,
                            )
                          }
                        >
                          {updating ? (
                            <span className="adm-build-spinner adm-build-spinner--tiny" />
                          ) : (
                            <i
                              className={
                                visible ? "bi bi-eye-slash" : "bi bi-eye"
                              }
                            />
                          )}

                          {visible ? "Ẩn" : "Hiện"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
