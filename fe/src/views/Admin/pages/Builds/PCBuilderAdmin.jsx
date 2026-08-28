import React, { useCallback, useEffect, useMemo, useState } from "react";

import toast from "react-hot-toast";

import pcBuildAdminService from "../../../../services/pcBuildAdminService";
import axiosClient from "../../../../services/axiosClient";

import "./PCBuilderAdmin.css";

// ============================================================
// IMAGE
// ============================================================

const IMAGE_BASE_URL =
  process.env.REACT_APP_UPLOAD_URL || "http://localhost:5000";

const FALLBACK_IMAGE = "/images/no-image.png";

const getImageUrl = (image) => {
  if (!image) {
    return FALLBACK_IMAGE;
  }

  const value = String(image);

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `${IMAGE_BASE_URL}${value}`;
};

// ============================================================
// CATEGORY
// ============================================================

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

// ============================================================
// COMPATIBILITY LABEL
// ============================================================

const COMPATIBILITY_LABELS = {
  CPU_MAINBOARD_SOCKET: "CPU ↔ Mainboard",
  CPU_COOLING_SOCKET: "CPU ↔ Tản nhiệt",
  MAINBOARD_RAM_TYPE: "Mainboard ↔ RAM",
  MAINBOARD_CASE_FORM_FACTOR: "Mainboard ↔ Case",
  VGA_PSU_POWER: "VGA ↔ PSU",
};

// ============================================================
// AUTO BUILD
// ============================================================

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
  "CPU",
  "MAINBOARD",
  "RAM",
  "VGA",
  "PSU",
  "COOLING",
  "STORAGE",
  "CASE",
];

const AUTO_BUILD_CORE_REQUIRED = ["CPU", "MAINBOARD", "RAM"];

const AUTO_BUILD_MAX_CANDIDATES = 6;

const AUTO_BUILD_BEAM_WIDTH = 5;

const AUTO_BUILD_MAX_ATTEMPTS = 180;

// ============================================================
// HELPERS
// ============================================================

const formatMoney = (value) => {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
};

const normalizeCategoryKey = (value = "") => {
  const key = String(value || "")
    .trim()
    .toUpperCase();

  if (!key) {
    return "";
  }

  if (
    key.includes("MAINBOARD") ||
    key.includes("MOTHERBOARD") ||
    key.includes("BO MẠCH")
  ) {
    return "MAINBOARD";
  }

  if (key.includes("COOL") || key.includes("TẢN")) {
    return "COOLING";
  }

  if (
    key.includes("STORAGE") ||
    key.includes("SSD") ||
    key.includes("HDD") ||
    key.includes("NVME") ||
    key.includes("Ổ CỨNG")
  ) {
    return "STORAGE";
  }

  if (key.includes("CASE") || key.includes("VỎ")) {
    return "CASE";
  }

  if (key.includes("PSU") || key.includes("NGUỒN")) {
    return "PSU";
  }

  if (key.includes("VGA") || key.includes("GPU") || key.includes("CARD")) {
    return "VGA";
  }

  if (key.includes("RAM")) {
    return "RAM";
  }

  if (key.includes("CPU")) {
    return "CPU";
  }

  return key;
};

const parseSpecifications = (value) => {
  if (!value) {
    return {};
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
};

const detectItemCategory = (item) => {
  if (!item) {
    return "";
  }

  if (item.type_code) {
    return normalizeCategoryKey(item.type_code);
  }

  if (item.category_key) {
    return normalizeCategoryKey(item.category_key);
  }

  if (item.category) {
    return normalizeCategoryKey(item.category);
  }

  const typeId = Number(item.type_id);

  if (typeId === 1) return "CPU";
  if (typeId === 2) return "MAINBOARD";
  if (typeId === 3) return "RAM";
  if (typeId === 4) return "VGA";
  if (typeId === 5) return "COOLING";
  if (typeId === 6) return "PSU";
  if (typeId === 7) return "STORAGE";
  if (typeId === 8) return "CASE";

  return "";
};

const normalizeComponent = (component, quantity = 1) => {
  const specifications = parseSpecifications(component?.specifications);

  const partId = Number(
    component?.part_id ?? component?.pc_part_id ?? component?.id ?? 0,
  );

  return {
    ...component,

    id: partId,

    part_id: partId,

    product_id: Number(component?.product_id ?? 0),

    variant_id:
      component?.variant_id !== undefined && component?.variant_id !== null
        ? Number(component.variant_id)
        : null,

    name: component?.name || component?.product_name || "Linh kiện",

    sku: component?.sku || component?.product_sku || "",

    image:
      component?.image || component?.thumbnail || component?.image_url || "",

    price: Number(component?.current_price ?? component?.price ?? 0),

    quantity: Number(quantity) > 0 ? Number(quantity) : 1,

    stock_quantity: Number(
      component?.stock_quantity ?? component?.stock ?? component?.quantity ?? 0,
    ),

    socket:
      specifications?.socket ||
      component?.socket ||
      component?.product_socket ||
      "",

    ram_type:
      specifications?.ram_type ||
      component?.ram_type ||
      component?.product_ram_type ||
      "",

    form_factor: specifications?.form_factor || component?.form_factor || "",

    power_recommend:
      specifications?.power_recommend || component?.power_recommend || "",

    wattage: specifications?.wattage || component?.wattage || "",

    specifications,
  };
};

const buildItemsToPayload = (selectedItems) => {
  return Object.values(selectedItems)
    .filter(Boolean)
    .map((item) => ({
      part_id: Number(item.part_id || item.id),

      quantity: Math.max(1, Number(item.quantity || 1)),
    }))
    .filter(
      (item) =>
        Number.isInteger(item.part_id) && item.part_id > 0 && item.quantity > 0,
    );
};

// ============================================================
// AUTO BUILD HELPERS
// ============================================================

const normalizeSpecValue = (value) => {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "")
    .replace(/-/g, "");
};

const normalizeFormFactor = (value) => {
  const normalized = normalizeSpecValue(value);

  if (!normalized) {
    return "";
  }

  if (normalized.includes("MICROATX") || normalized === "MATX") {
    return "MATX";
  }

  if (normalized.includes("MINIITX") || normalized === "MITX") {
    return "MITX";
  }

  if (normalized.includes("EATX")) {
    return "EATX";
  }

  if (normalized.includes("ATX")) {
    return "ATX";
  }

  return normalized;
};

const parseNumberFromText = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const matched = String(value).match(/\d+(\.\d+)?/);

  return matched ? Number(matched[0]) : 0;
};

const getCpuSocket = (item) => {
  return normalizeSpecValue(
    item?.socket || item?.specifications?.socket || item?.product_socket || "",
  );
};

const getRamType = (item) => {
  return normalizeSpecValue(
    item?.ram_type ||
      item?.specifications?.ram_type ||
      item?.product_ram_type ||
      "",
  );
};

const getMainboardFormFactor = (item) => {
  return normalizeFormFactor(
    item?.form_factor || item?.specifications?.form_factor || "",
  );
};

const getCoolingSockets = (item) => {
  const value =
    item?.specifications?.supported_sockets ||
    item?.specifications?.sockets ||
    item?.specifications?.socket_support ||
    item?.specifications?.socket ||
    item?.socket ||
    "";

  if (Array.isArray(value)) {
    return value.map(normalizeSpecValue).filter(Boolean);
  }

  return String(value || "")
    .split(/[,/|;]/)
    .map(normalizeSpecValue)
    .filter(Boolean);
};

const getCaseFormFactors = (item) => {
  const value =
    item?.specifications?.supported_form_factors ||
    item?.specifications?.form_factors ||
    item?.specifications?.mainboard_support ||
    item?.specifications?.motherboard_support ||
    item?.specifications?.form_factor ||
    item?.form_factor ||
    "";

  if (Array.isArray(value)) {
    return value.map(normalizeFormFactor).filter(Boolean);
  }

  return String(value || "")
    .split(/[,/|;]/)
    .map(normalizeFormFactor)
    .filter(Boolean);
};

const getRecommendedPsu = (item) => {
  return parseNumberFromText(
    item?.power_recommend ||
      item?.specifications?.power_recommend ||
      item?.specifications?.recommended_psu ||
      "",
  );
};

const getPsuWattage = (item) => {
  return parseNumberFromText(
    item?.wattage ||
      item?.specifications?.wattage ||
      item?.specifications?.power ||
      "",
  );
};

const isCpuMainboardCompatible = (cpu, mainboard) => {
  const cpuSocket = getCpuSocket(cpu);

  const mainboardSocket = getCpuSocket(mainboard);

  if (!cpuSocket || !mainboardSocket) {
    return true;
  }

  return cpuSocket === mainboardSocket;
};

const isMainboardRamCompatible = (mainboard, ram) => {
  const mainboardRam = getRamType(mainboard);

  const ramType = getRamType(ram);

  if (!mainboardRam || !ramType) {
    return true;
  }

  return mainboardRam === ramType;
};

const isCpuCoolingCompatible = (cpu, cooling) => {
  const cpuSocket = getCpuSocket(cpu);

  const coolingSockets = getCoolingSockets(cooling);

  if (!cpuSocket || !coolingSockets.length) {
    return true;
  }

  return coolingSockets.includes(cpuSocket);
};

const isMainboardCaseCompatible = (mainboard, pcCase) => {
  const boardFormFactor = getMainboardFormFactor(mainboard);

  const supported = getCaseFormFactors(pcCase);

  if (!boardFormFactor || !supported.length) {
    return true;
  }

  return supported.includes(boardFormFactor);
};

const isVgaPsuCompatible = (vga, psu) => {
  const recommended = getRecommendedPsu(vga);

  const wattage = getPsuWattage(psu);

  if (!recommended || !wattage) {
    return true;
  }

  return wattage >= recommended;
};

const isSelectionLocallyCompatible = (selection) => {
  const cpu = selection.CPU;
  const mainboard = selection.MAINBOARD;
  const ram = selection.RAM;
  const vga = selection.VGA;
  const psu = selection.PSU;
  const cooling = selection.COOLING;
  const pcCase = selection.CASE;

  if (cpu && mainboard && !isCpuMainboardCompatible(cpu, mainboard)) {
    return false;
  }

  if (mainboard && ram && !isMainboardRamCompatible(mainboard, ram)) {
    return false;
  }

  if (cpu && cooling && !isCpuCoolingCompatible(cpu, cooling)) {
    return false;
  }

  if (mainboard && pcCase && !isMainboardCaseCompatible(mainboard, pcCase)) {
    return false;
  }

  if (vga && psu && !isVgaPsuCompatible(vga, psu)) {
    return false;
  }

  return true;
};

const calculateSelectionTotal = (selection) => {
  return Object.values(selection).reduce((total, item) => {
    return (
      total +
      Number(item?.price || 0) * Math.max(1, Number(item?.quantity || 1))
    );
  }, 0);
};

const getCandidateScore = (item, targetPrice) => {
  const price = Number(item?.price || 0);

  if (!price || !targetPrice) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Math.abs(price - targetPrice);
};

const sortCandidatesByBudget = (items, targetPrice) => {
  return [...items].sort(
    (a, b) =>
      getCandidateScore(a, targetPrice) - getCandidateScore(b, targetPrice),
  );
};

const getAutoCandidates = (
  source,
  category,
  targetPrice,
  limit = AUTO_BUILD_MAX_CANDIDATES,
) => {
  const candidates = source.filter(
    (item) => detectItemCategory(item) === category,
  );

  return sortCandidatesByBudget(candidates, targetPrice).slice(0, limit);
};

const getBeamScore = (beam, stageBudget, finalBudget) => {
  const total = Number(beam?.total || 0);

  const difference = Math.abs(total - stageBudget);

  const overFinalBudget = Math.max(0, total - finalBudget);

  const componentCount = Object.keys(beam?.selection || {}).length;

  return difference + overFinalBudget * 3 - componentCount * 1000;
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PCBuilderAdmin() {
  // =========================================================
  // BUILDS
  // =========================================================

  const [builds, setBuilds] = useState([]);

  const [isLoadingBuilds, setIsLoadingBuilds] = useState(false);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // =========================================================
  // FILTER
  // =========================================================

  const [searchInput, setSearchInput] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

  const [featuredFilter, setFeaturedFilter] = useState("");

  const [sort, setSort] = useState("newest");

  // =========================================================
  // CATEGORY
  // =========================================================

  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);

  const [allComponents, setAllComponents] = useState([]);

  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // =========================================================
  // BUILD MODAL
  // =========================================================

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [modalMode, setModalMode] = useState("view");

  const [editingBuildId, setEditingBuildId] = useState(null);

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [formName, setFormName] = useState("");

  const [formDesc, setFormDesc] = useState("");

  const [formImage, setFormImage] = useState("");

  const [formStatus, setFormStatus] = useState(1);

  const [formFeatured, setFormFeatured] = useState(0);

  const [selectedItems, setSelectedItems] = useState({});

  const [formErrors, setFormErrors] = useState({});

  const [isSaving, setIsSaving] = useState(false);

  // =========================================================
  // COMPATIBILITY
  // =========================================================

  const [compatibility, setCompatibility] = useState(null);

  const [isValidating, setIsValidating] = useState(false);

  // =========================================================
  // PICKER
  // =========================================================

  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);

  const [activeCategory, setActiveCategory] = useState("");

  const [componentList, setComponentList] = useState([]);

  const [componentSearch, setComponentSearch] = useState("");

  const [isLoadingComponents, setIsLoadingComponents] = useState(false);

  const [visibilityUpdatingId, setVisibilityUpdatingId] = useState(null);

  // =========================================================
  // TRASH
  // =========================================================

  const [isTrashOpen, setIsTrashOpen] = useState(false);

  const [trashBuilds, setTrashBuilds] = useState([]);

  const [trashSearch, setTrashSearch] = useState("");

  const [trashPagination, setTrashPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [isLoadingTrash, setIsLoadingTrash] = useState(false);

  // =========================================================
  // DELETE CONFIRM
  // =========================================================

  const [deleteTarget, setDeleteTarget] = useState(null);

  // =========================================================
  // AUTO BUILD
  // =========================================================

  const [targetBudget, setTargetBudget] = useState(15000000);

  const [targetUsage, setTargetUsage] = useState("gaming");

  const [isAutoBuilding, setIsAutoBuilding] = useState(false);

  // =========================================================
  // FETCH BUILDS
  // =========================================================

  const fetchBuilds = useCallback(
    async (page = 1) => {
      try {
        setIsLoadingBuilds(true);

        const response = await pcBuildAdminService.getBuilds({
          page,
          limit: pagination.limit,
          search,
          status: statusFilter,
          is_featured: featuredFilter,
          sort,
        });

        setBuilds(Array.isArray(response?.data) ? response.data : []);

        setPagination(
          response?.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        );
      } catch (error) {
        console.error(error);

        setBuilds([]);

        toast.error(
          error.response?.data?.message ||
            "Không thể tải danh sách cấu hình PC.",
        );
      } finally {
        setIsLoadingBuilds(false);
      }
    },
    [search, statusFilter, featuredFilter, sort, pagination.limit],
  );

  // =========================================================
  // CATEGORIES
  // =========================================================

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoadingCategories(true);

      const response = await pcBuildAdminService.getCategories();

      const raw = Array.isArray(response?.data) ? response.data : [];

      const mapped = raw
        .map((item) => {
          const key = normalizeCategoryKey(
            item?.type_code || item?.code || item?.key || item?.name || "",
          );

          if (!key) {
            return null;
          }

          const fallback = FALLBACK_CATEGORIES.find(
            (category) => category.key === key,
          );

          return {
            ...item,

            key,

            label: item?.type_name || item?.name || fallback?.label || key,
          };
        })
        .filter(Boolean);

      const categoryMap = new Map();

      FALLBACK_CATEGORIES.forEach((item) => {
        categoryMap.set(item.key, item);
      });

      mapped.forEach((item) => {
        categoryMap.set(item.key, {
          ...categoryMap.get(item.key),
          ...item,
        });
      });

      setCategories(Array.from(categoryMap.values()));
    } catch (error) {
      console.error(error);

      setCategories(FALLBACK_CATEGORIES);

      toast.error("Không thể tải nhóm linh kiện Build PC.");
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  // =========================================================
  // ALL COMPONENTS
  // =========================================================

  const fetchAllComponents = useCallback(async () => {
    try {
      const response = await pcBuildAdminService.getComponents({
        page: 1,
        limit: 100,
      });

      const raw = Array.isArray(response?.data) ? response.data : [];

      setAllComponents(raw.map((item) => normalizeComponent(item)));
    } catch (error) {
      console.error(error);

      setAllComponents([]);
    }
  }, []);

  // =========================================================
  // INITIAL
  // =========================================================

  useEffect(() => {
    fetchCategories();

    fetchAllComponents();
  }, [fetchCategories, fetchAllComponents]);

  useEffect(() => {
    fetchBuilds(1);
  }, [search, statusFilter, featuredFilter, sort, fetchBuilds]);

  // =========================================================
  // BODY LOCK
  // =========================================================

  useEffect(() => {
    const hasOverlay =
      isModalOpen ||
      isComponentModalOpen ||
      isTrashOpen ||
      Boolean(deleteTarget);

    document.body.classList.toggle("adm-build-body-lock", hasOverlay);

    return () => {
      document.body.classList.remove("adm-build-body-lock");
    };
  }, [isModalOpen, isComponentModalOpen, isTrashOpen, deleteTarget]);

  // =========================================================
  // ESC
  // =========================================================

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (deleteTarget) {
        setDeleteTarget(null);
        return;
      }

      if (isComponentModalOpen) {
        setIsComponentModalOpen(false);
        return;
      }

      if (isTrashOpen) {
        setIsTrashOpen(false);
        return;
      }

      if (isModalOpen) {
        setIsModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, [deleteTarget, isComponentModalOpen, isTrashOpen, isModalOpen]);

  // =========================================================
  // RESET
  // =========================================================

  const resetForm = () => {
    setEditingBuildId(null);

    setFormName("");

    setFormDesc("");

    setFormImage("");

    setFormStatus(1);

    setFormFeatured(0);

    setSelectedItems({});

    setCompatibility(null);

    setFormErrors({});
  };

  // =========================================================
  // ADD
  // =========================================================

  const handleOpenAddModal = () => {
    resetForm();

    setModalMode("add");

    setIsModalOpen(true);
  };

  // =========================================================
  // DETAIL
  // =========================================================

  const loadBuildIntoForm = (build) => {
    setEditingBuildId(build.id);

    setFormName(build.name || "");

    setFormDesc(build.description || "");

    setFormImage(build.image || "");

    setFormStatus(Number(build.status ?? 1));

    setFormFeatured(Number(build.is_featured ?? 0));

    const mappedItems = {};

    const buildItems = Array.isArray(build.items) ? build.items : [];

    buildItems.forEach((item) => {
      const category = detectItemCategory(item);

      if (!category) {
        return;
      }

      mappedItems[category] = normalizeComponent(item, item.quantity || 1);
    });

    setSelectedItems(mappedItems);

    setCompatibility(null);

    setFormErrors({});
  };

  const handleOpenViewModal = async (buildId) => {
    try {
      setIsModalOpen(true);

      setModalMode("view");

      setIsLoadingDetail(true);

      const response = await pcBuildAdminService.getBuildById(buildId);

      loadBuildIntoForm(response.data);
    } catch (error) {
      console.error(error);

      toast.error(
        error.response?.data?.message || "Không thể tải chi tiết cấu hình.",
      );

      setIsModalOpen(false);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // =========================================================
  // VALIDATE BACKEND
  // =========================================================

  useEffect(() => {
    if (modalMode === "view" || isAutoBuilding) {
      return;
    }

    const items = buildItemsToPayload(selectedItems);

    if (!items.length) {
      setCompatibility(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsValidating(true);

        const response = await pcBuildAdminService.validateBuild(items);

        setCompatibility(response?.data || null);

        setFormErrors((previous) => ({
          ...previous,
          compatibility: null,
        }));
      } catch (error) {
        const data = error.response?.data;

        setCompatibility(
          data?.details || {
            is_valid: false,

            errors: [
              {
                message: data?.message || "Cấu hình không tương thích.",
              },
            ],

            warnings: [],

            checks: [],
          },
        );
      } finally {
        setIsValidating(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [selectedItems, modalMode, isAutoBuilding]);

  // =========================================================
  // COMPONENT PICKER
  // =========================================================

  const handleOpenComponentModal = async (category) => {
    if (modalMode === "view") {
      return;
    }

    const normalizedCategory = normalizeCategoryKey(category);

    setActiveCategory(normalizedCategory);

    setComponentSearch("");

    setComponentList([]);

    setIsComponentModalOpen(true);

    try {
      setIsLoadingComponents(true);

      const response = await pcBuildAdminService.getComponents({
        category: normalizedCategory.toLowerCase(),

        page: 1,

        limit: 100,
      });

      const raw = Array.isArray(response?.data) ? response.data : [];

      setComponentList(raw.map((item) => normalizeComponent(item)));
    } catch (error) {
      console.error(error);

      setComponentList([]);

      toast.error(`Không thể tải danh sách ${normalizedCategory}.`);
    } finally {
      setIsLoadingComponents(false);
    }
  };

  const handleSelectComponent = (component) => {
    const normalized = normalizeComponent(
      component,

      selectedItems[activeCategory]?.quantity || 1,
    );

    if (!normalized.part_id) {
      toast.error("Linh kiện không có part_id hợp lệ.");

      return;
    }

    setSelectedItems((previous) => ({
      ...previous,

      [activeCategory]: normalized,
    }));

    setFormErrors((previous) => ({
      ...previous,

      components: null,

      compatibility: null,
    }));

    setIsComponentModalOpen(false);

    toast.success(`Đã chọn ${normalized.name}`, {
      duration: 1800,
    });
  };

  // =========================================================
  // QUANTITY
  // =========================================================

  const handleUpdateQuantity = (category, value) => {
    if (modalMode === "view") {
      return;
    }

    const quantity = Number(value);

    if (!Number.isInteger(quantity) || quantity <= 0) {
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

  // =========================================================
  // REMOVE
  // =========================================================

  const handleRemoveComponent = (category) => {
    const removed = selectedItems[category];

    setSelectedItems((previous) => {
      const next = {
        ...previous,
      };

      delete next[category];

      return next;
    });

    if (removed) {
      toast.success(`Đã tháo ${removed.name}`, {
        duration: 1500,
      });
    }
  };

  // =========================================================
  // TOTAL
  // =========================================================

  const previewTotal = useMemo(() => {
    return Object.values(selectedItems).reduce(
      (sum, item) =>
        sum + Number(item?.price || 0) * Number(item?.quantity || 1),
      0,
    );
  }, [selectedItems]);

  const displayedTotal =
    compatibility?.total_price !== undefined &&
    compatibility?.total_price !== null
      ? Number(compatibility.total_price)
      : previewTotal;

  // =========================================================
  // SAVE
  // =========================================================

  const handleSaveBuild = async (event) => {
    event.preventDefault();

    if (modalMode === "view" || isSaving) {
      return;
    }

    const errors = {};

    const name = formName.trim();

    const description = formDesc.trim();

    if (!name) {
      errors.name = "Vui lòng nhập tên cấu hình.";
    }

    if (description && description.length < 10) {
      errors.desc = "Mô tả phải có ít nhất 10 ký tự.";
    }

    const items = buildItemsToPayload(selectedItems);

    if (!items.length) {
      errors.components = "Vui lòng chọn ít nhất một linh kiện.";
    }

    const requiredCategories = ["CPU", "MAINBOARD", "RAM"];

    const missing = requiredCategories.filter(
      (category) => !selectedItems[category],
    );

    if (missing.length) {
      errors.components = `Thiếu linh kiện bắt buộc: ${missing.join(", ")}.`;
    }

    if (compatibility && compatibility.is_valid === false) {
      errors.compatibility = "Cấu hình hiện tại chưa tương thích.";
    }

    if (Object.keys(errors).length) {
      setFormErrors(errors);

      toast.error("Vui lòng kiểm tra lại thông tin cấu hình.");

      return;
    }

    const payload = {
      name,

      description: description || null,

      image: formImage.trim() || null,

      status: Number(formStatus),

      is_featured: Number(formFeatured),

      items,
    };

    const toastId = toast.loading(
      modalMode === "edit"
        ? "Đang cập nhật cấu hình..."
        : "Đang tạo cấu hình...",
    );

    try {
      setIsSaving(true);

      if (modalMode === "edit" && editingBuildId) {
        await pcBuildAdminService.updateBuild(editingBuildId, payload);

        toast.success("Cập nhật cấu hình PC thành công.", {
          id: toastId,
        });
      } else {
        await pcBuildAdminService.createBuild(payload);

        toast.success("Tạo cấu hình PC thành công.", {
          id: toastId,
        });
      }

      setIsModalOpen(false);

      resetForm();

      await fetchBuilds(1);
    } catch (error) {
      console.error(error);

      const data = error.response?.data;

      const details = data?.details;

      let message = data?.message || "Không thể lưu cấu hình PC.";

      if (details?.errors?.length) {
        message = details.errors
          .map((item) => item.message || item.code)
          .join("\n");
      }

      toast.error(message, {
        id: toastId,

        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================
  // STATUS
  // =========================================================

  const handleToggleStatus = async (build) => {
    const nextStatus = Number(build.status) === 1 ? 0 : 1;

    const toastId = toast.loading("Đang cập nhật trạng thái...");

    try {
      await pcBuildAdminService.updateStatus(build.id, nextStatus);

      setBuilds((previous) =>
        previous.map((item) =>
          Number(item.id) === Number(build.id)
            ? {
                ...item,

                status: nextStatus,
              }
            : item,
        ),
      );

      toast.success(nextStatus === 1 ? "Đã bật cấu hình." : "Đã ẩn cấu hình.", {
        id: toastId,
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể đổi trạng thái.",
        {
          id: toastId,
        },
      );
    }
  };

  // =========================================================
  // FEATURED
  // =========================================================

  const handleToggleFeatured = async (build) => {
    const nextValue = Number(build.is_featured) === 1 ? 0 : 1;

    const toastId = toast.loading("Đang cập nhật nổi bật...");

    try {
      await pcBuildAdminService.updateFeatured(build.id, nextValue);

      setBuilds((previous) =>
        previous.map((item) =>
          Number(item.id) === Number(build.id)
            ? {
                ...item,

                is_featured: nextValue,
              }
            : item,
        ),
      );

      toast.success(
        nextValue === 1
          ? "Đã bật cấu hình nổi bật."
          : "Đã tắt cấu hình nổi bật.",
        {
          id: toastId,
        },
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể đổi cấu hình nổi bật.",
        {
          id: toastId,
        },
      );
    }
  };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDeleteBuild = async () => {
    if (!deleteTarget) {
      return;
    }

    const buildId = deleteTarget.id;

    const toastId = toast.loading("Đang chuyển vào thùng rác...");

    try {
      await pcBuildAdminService.deleteBuild(buildId);

      setDeleteTarget(null);

      toast.success("Đã chuyển cấu hình vào thùng rác.", {
        id: toastId,
      });

      await fetchBuilds(1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa cấu hình.", {
        id: toastId,
      });
    }
  };

  // =========================================================
  // TRASH
  // =========================================================

  const fetchTrash = async (page = 1) => {
    try {
      setIsLoadingTrash(true);

      const response = await pcBuildAdminService.getTrash({
        page,

        limit: 10,

        search: trashSearch,

        sort: "deleted_desc",
      });

      setTrashBuilds(Array.isArray(response?.data) ? response.data : []);

      setTrashPagination(
        response?.pagination || {
          page: 1,

          limit: 10,

          total: 0,

          totalPages: 0,

          hasNextPage: false,

          hasPrevPage: false,
        },
      );
    } catch (error) {
      console.error(error);

      setTrashBuilds([]);

      toast.error("Không thể tải thùng rác.");
    } finally {
      setIsLoadingTrash(false);
    }
  };

  const handleOpenTrash = async () => {
    setIsTrashOpen(true);

    await fetchTrash(1);
  };

  const handleRestoreBuild = async (id) => {
    const toastId = toast.loading("Đang khôi phục cấu hình...");

    try {
      await pcBuildAdminService.restoreBuild(id);

      toast.success("Khôi phục cấu hình thành công.", {
        id: toastId,
      });

      await fetchTrash(trashPagination.page);

      await fetchBuilds(1);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể khôi phục cấu hình.",
        {
          id: toastId,
        },
      );
    }
  };

  // =========================================================
  // VISIBILITY
  // =========================================================

  const handleToggleVisibility = async (partId, currentStatus) => {
    const nextStatus = Number(currentStatus) === 1 ? 0 : 1;

    try {
      setVisibilityUpdatingId(partId);

      await axiosClient.put(`/admin/pc-parts/${partId}/visibility`, {
        is_visible: nextStatus,
      });

      setComponentList((previous) =>
        previous.map((item) =>
          Number(item.part_id) === Number(partId)
            ? {
                ...item,

                is_visible: nextStatus,
              }
            : item,
        ),
      );

      setAllComponents((previous) =>
        previous.map((item) =>
          Number(item.part_id) === Number(partId)
            ? {
                ...item,

                is_visible: nextStatus,
              }
            : item,
        ),
      );

      toast.success(
        nextStatus === 1 ? "Đã hiển thị linh kiện." : "Đã ẩn linh kiện.",
        {
          duration: 1800,
        },
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể đổi trạng thái linh kiện.",
      );
    } finally {
      setVisibilityUpdatingId(null);
    }
  };

  // =========================================================
  // SMART AUTO BUILD
  // =========================================================

  const handleAutoBuild = async () => {
    if (isAutoBuilding) {
      return;
    }

    const budget = Number(targetBudget);

    if (!Number.isFinite(budget) || budget < 3000000) {
      toast.error("Ngân sách tối thiểu phải từ 3.000.000 đ.");

      return;
    }

    /*
     * Chỉ sử dụng PcPart:
     * - có part_id
     * - đang hiển thị
     * - còn tồn
     * - có giá
     * - nhận diện được category
     */
    const source = allComponents.filter((item) => {
      const partId = Number(item?.part_id || item?.id || 0);

      const price = Number(item?.price || 0);

      const stock = Number(item?.stock_quantity || 0);

      const visible = Number(item?.is_visible ?? 1) === 1;

      const category = detectItemCategory(item);

      return (
        Number.isInteger(partId) &&
        partId > 0 &&
        price > 0 &&
        stock > 0 &&
        visible &&
        Boolean(category)
      );
    });

    if (!source.length) {
      toast.error("Không có linh kiện hợp lệ để tự động chọn.");

      return;
    }

    /*
     * CPU + MAINBOARD + RAM là nhóm lõi.
     */
    const availableCategories = new Set(
      source.map((item) => detectItemCategory(item)),
    );

    const missingCore = AUTO_BUILD_CORE_REQUIRED.filter(
      (category) => !availableCategories.has(category),
    );

    if (missingCore.length) {
      toast.error(
        `Không thể Auto Build vì kho đang thiếu: ${missingCore.join(", ")}.`,
        {
          duration: 5000,
        },
      );

      return;
    }

    const ratios = BUDGET_RATIOS[targetUsage] || BUDGET_RATIOS.gaming;

    /*
     * Chỉ chạy những nhóm có tỷ lệ ngân sách.
     *
     * Office không bắt buộc VGA vì ratio VGA = 0.
     */
    const buildOrder = AUTO_BUILD_ORDER.filter(
      (category) => Number(ratios[category] || 0) > 0,
    );

    /*
     * Nếu kho có nhóm tương ứng nhưng không có ứng viên
     * hợp lệ thì thuật toán sẽ dừng và báo lỗi,
     * tuyệt đối không chọn đại.
     */
    const candidatesByCategory = {};

    buildOrder.forEach((category) => {
      const targetPrice = budget * Number(ratios[category] || 0);

      candidatesByCategory[category] = getAutoCandidates(
        source,
        category,
        targetPrice,
      );
    });

    /*
     * Các nhóm cần thiết theo nhu cầu.
     */
    const requiredForUsage = buildOrder.filter((category) => {
      if (AUTO_BUILD_CORE_REQUIRED.includes(category)) {
        return true;
      }

      if (targetUsage === "gaming" || targetUsage === "design") {
        return ["VGA", "PSU", "STORAGE", "CASE"].includes(category);
      }

      if (targetUsage === "office") {
        return ["PSU", "STORAGE", "CASE"].includes(category);
      }

      return false;
    });

    const missingForUsage = requiredForUsage.filter(
      (category) => !candidatesByCategory[category]?.length,
    );

    if (missingForUsage.length) {
      toast.error(
        `Không đủ linh kiện để tạo cấu hình: ${missingForUsage.join(", ")}.`,
        {
          duration: 5000,
        },
      );

      return;
    }

    const toastId = toast.loading("Đang tìm cấu hình tương thích tốt nhất...");

    setIsAutoBuilding(true);

    /*
     * Tắt compatibility cũ trong lúc Auto Build.
     */
    setCompatibility(null);

    setFormErrors((previous) => ({
      ...previous,

      components: null,

      compatibility: null,
    }));

    try {
      /*
       * Beam Search
       *
       * Thay vì:
       * CPU gần giá nhất
       * Main gần giá nhất
       * RAM gần giá nhất
       *
       * Ta giữ nhiều phương án tốt song song.
       *
       * Candidate nào Backend báo invalid sẽ bị loại.
       */
      let beams = [
        {
          selection: {},

          total: 0,

          compatibility: null,
        },
      ];

      let attempts = 0;

      let cumulativeRatio = 0;

      for (const category of buildOrder) {
        const categoryCandidates = candidatesByCategory[category] || [];

        /*
         * Cooling có thể không có trong một số kho.
         * Các nhóm bắt buộc thì phải có.
         */
        if (!categoryCandidates.length) {
          if (requiredForUsage.includes(category)) {
            throw new Error(`Không có ${category} phù hợp trong kho Build PC.`);
          }

          continue;
        }

        cumulativeRatio += Number(ratios[category] || 0);

        const stageBudget = budget * cumulativeRatio;

        const nextBeams = [];

        for (const beam of beams) {
          for (const candidate of categoryCandidates) {
            if (attempts >= AUTO_BUILD_MAX_ATTEMPTS) {
              break;
            }

            const nextSelection = {
              ...beam.selection,

              [category]: {
                ...candidate,

                quantity: 1,
              },
            };

            /*
             * FE chỉ lọc sơ bộ.
             * Không phải nguồn xác thực cuối cùng.
             */
            if (!isSelectionLocallyCompatible(nextSelection)) {
              continue;
            }

            const payload = buildItemsToPayload(nextSelection);

            if (!payload.length) {
              continue;
            }

            attempts += 1;

            try {
              /*
               * BACKEND LÀ SOURCE OF TRUTH.
               */
              const response = await pcBuildAdminService.validateBuild(payload);

              const result = response?.data;

              if (!result || result.is_valid === false) {
                continue;
              }

              const total =
                Number(result.total_price) ||
                calculateSelectionTotal(nextSelection);

              nextBeams.push({
                selection: nextSelection,

                total,

                compatibility: result,
              });
            } catch (validationError) {
              /*
               * Backend báo candidate sai:
               * bỏ hoàn toàn candidate này.
               *
               * Không setSelectedItems.
               * Không fallback linh kiện sai.
               */
            }
          }

          if (attempts >= AUTO_BUILD_MAX_ATTEMPTS) {
            break;
          }
        }

        /*
         * Không còn bất kỳ cấu hình hợp lệ nào
         * sau khi thêm nhóm hiện tại.
         */
        if (!nextBeams.length) {
          /*
           * Nếu là optional Cooling thì có thể bỏ qua.
           */
          if (!requiredForUsage.includes(category)) {
            continue;
          }

          throw new Error(
            `Không tìm được ${category} tương thích với cấu hình hiện tại.`,
          );
        }

        /*
         * Chỉ giữ một số phương án tốt nhất.
         *
         * Tránh brute-force hàng nghìn request.
         */
        nextBeams.sort(
          (a, b) =>
            getBeamScore(a, stageBudget, budget) -
            getBeamScore(b, stageBudget, budget),
        );

        beams = nextBeams.slice(0, AUTO_BUILD_BEAM_WIDTH);
      }

      if (!beams.length) {
        throw new Error("Không tìm được cấu hình tương thích.");
      }

      /*
       * Kiểm tra FINAL một lần nữa.
       *
       * Đây là lớp bảo vệ cuối cùng.
       */
      const finalCandidates = [];

      for (const beam of beams) {
        if (attempts >= AUTO_BUILD_MAX_ATTEMPTS) {
          break;
        }

        const payload = buildItemsToPayload(beam.selection);

        attempts += 1;

        try {
          const response = await pcBuildAdminService.validateBuild(payload);

          const result = response?.data;

          if (!result || result.is_valid === false) {
            continue;
          }

          const total =
            Number(result.total_price) ||
            calculateSelectionTotal(beam.selection);

          finalCandidates.push({
            selection: beam.selection,

            compatibility: result,

            total,

            difference: Math.abs(total - budget),

            overBudget: total > budget,

            componentCount: Object.keys(beam.selection).length,
          });
        } catch (validationError) {
          // Candidate cuối không hợp lệ → bỏ.
        }
      }

      if (!finalCandidates.length) {
        throw new Error(
          "Không tìm được cấu hình cuối cùng vượt qua kiểm tra tương thích.",
        );
      }

      /*
       * Ưu tiên:
       *
       * 1. Không vượt ngân sách.
       * 2. Nhiều nhóm linh kiện hơn.
       * 3. Gần ngân sách nhất.
       */
      finalCandidates.sort((a, b) => {
        if (a.overBudget !== b.overBudget) {
          return a.overBudget ? 1 : -1;
        }

        if (a.componentCount !== b.componentCount) {
          return b.componentCount - a.componentCount;
        }

        return a.difference - b.difference;
      });

      const best = finalCandidates[0];

      /*
       * Không cho Auto Build thành công
       * nếu thiếu CPU/Mainboard/RAM.
       */
      const finalMissingCore = AUTO_BUILD_CORE_REQUIRED.filter(
        (category) => !best.selection[category],
      );

      if (finalMissingCore.length) {
        throw new Error(
          `Cấu hình tự động thiếu: ${finalMissingCore.join(", ")}.`,
        );
      }

      /*
       * Chỉ tới đây mới đưa linh kiện lên giao diện.
       *
       * => những cấu hình sai không bao giờ xuất hiện.
       */
      setSelectedItems(best.selection);

      setCompatibility(best.compatibility);

      setFormErrors((previous) => ({
        ...previous,

        components: null,

        compatibility: null,
      }));

      const componentCount = Object.keys(best.selection).length;

      const budgetDifference = Math.abs(budget - best.total);

      if (best.total <= budget) {
        toast.success(
          `Auto Build thành công • ${componentCount}/8 nhóm • ${formatMoney(
            best.total,
          )} • còn ${formatMoney(budgetDifference)}.`,
          {
            id: toastId,

            duration: 5000,
          },
        );
      } else {
        toast.success(
          `Đã tìm được cấu hình tương thích • ${componentCount}/8 nhóm • ${formatMoney(
            best.total,
          )} • vượt ngân sách ${formatMoney(budgetDifference)}.`,
          {
            id: toastId,

            duration: 5500,
          },
        );
      }
    } catch (error) {
      console.error("AUTO BUILD ERROR:", error);

      /*
       * Không sửa selectedItems khi thất bại.
       *
       * Giữ cấu hình Admin đang chọn trước đó.
       */
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Không tìm được cấu hình tương thích với kho hiện tại.",
        {
          id: toastId,

          duration: 6000,
        },
      );
    } finally {
      setIsAutoBuilding(false);
    }
  };

  // =========================================================
  // COMPONENT SEARCH
  // =========================================================

  const filteredComponents = useMemo(() => {
    const keyword = componentSearch.trim().toLowerCase();

    if (!keyword) {
      return componentList;
    }

    return componentList.filter(
      (item) =>
        String(item.name || "")
          .toLowerCase()
          .includes(keyword) ||
        String(item.sku || "")
          .toLowerCase()
          .includes(keyword),
    );
  }, [componentList, componentSearch]);

  // =========================================================
  // STATS
  // =========================================================

  const activeBuildCount = useMemo(
    () => builds.filter((build) => Number(build.status) === 1).length,
    [builds],
  );

  const featuredCount = useMemo(
    () => builds.filter((build) => Number(build.is_featured) === 1).length,
    [builds],
  );

  // =========================================================
  // SEARCH
  // =========================================================

  const handleSubmitSearch = (event) => {
    event.preventDefault();

    setSearch(searchInput.trim());
  };

  const handleResetFilter = () => {
    setSearchInput("");

    setSearch("");

    setStatusFilter("");

    setFeaturedFilter("");

    setSort("newest");

    toast.success("Đã đặt lại bộ lọc.", {
      duration: 1500,
    });
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="adm-build-page">
      {/* HEADER */}

      <section className="adm-build-hero">
        <div className="adm-build-hero__content">
          <div className="adm-build-kicker">
            <span className="adm-build-kicker__icon">
              <i className="bi bi-pc-display-horizontal" />
            </span>

            <span>Build PC Management</span>
          </div>

          <h1>Quản lý cấu hình Build PC</h1>

          <p>
            Thiết kế cấu hình máy tính, kiểm tra tương thích phần cứng và quản
            lý các bộ PC mẫu trong cùng một giao diện.
          </p>
        </div>

        <div className="adm-build-hero__actions">
          <button
            type="button"
            className="adm-build-btn adm-build-btn--secondary"
            onClick={handleOpenTrash}
          >
            <i className="bi bi-trash3" />
            Thùng rác
          </button>

          <button
            type="button"
            className="adm-build-btn adm-build-btn--primary"
            onClick={handleOpenAddModal}
          >
            <i className="bi bi-plus-lg" />
            Thiết kế bộ PC mới
          </button>
        </div>
      </section>

      {/* STATS */}

      <section className="adm-build-stats">
        <article className="adm-build-stat-card">
          <span className="adm-build-stat-card__icon adm-build-stat-card__icon--primary">
            <i className="bi bi-pc-display-horizontal" />
          </span>

          <div>
            <span>Tổng cấu hình</span>

            <strong>{pagination.total}</strong>
          </div>
        </article>

        <article className="adm-build-stat-card">
          <span className="adm-build-stat-card__icon adm-build-stat-card__icon--success">
            <i className="bi bi-check2-circle" />
          </span>

          <div>
            <span>Đang hoạt động</span>

            <strong>{activeBuildCount}</strong>
          </div>
        </article>

        <article className="adm-build-stat-card">
          <span className="adm-build-stat-card__icon adm-build-stat-card__icon--featured">
            <i className="bi bi-star-fill" />
          </span>

          <div>
            <span>Cấu hình nổi bật</span>

            <strong>{featuredCount}</strong>
          </div>
        </article>

        <article className="adm-build-stat-card">
          <span className="adm-build-stat-card__icon adm-build-stat-card__icon--inventory">
            <i className="bi bi-box-seam" />
          </span>

          <div>
            <span>Kho Build PC</span>

            <strong>{allComponents.length}</strong>
          </div>
        </article>
      </section>

      {/* FILTER */}

      <section className="adm-build-filter-card">
        <div className="adm-build-filter-card__heading">
          <div>
            <span className="adm-build-section-icon">
              <i className="bi bi-sliders" />
            </span>

            <div>
              <h2>Bộ lọc cấu hình</h2>

              <p>Tìm kiếm và sắp xếp dữ liệu nhanh chóng.</p>
            </div>
          </div>

          <button
            type="button"
            className="adm-build-reset-filter"
            onClick={handleResetFilter}
          >
            <i className="bi bi-arrow-counterclockwise" />
            Đặt lại
          </button>
        </div>

        <form className="adm-build-filter-grid" onSubmit={handleSubmitSearch}>
          <div className="adm-build-field adm-build-field--search">
            <label>Tìm kiếm</label>

            <div className="adm-build-search-input">
              <i className="bi bi-search" />

              <input
                value={searchInput}
                placeholder="Tên hoặc mô tả cấu hình..."
                onChange={(event) => setSearchInput(event.target.value)}
              />

              {searchInput && (
                <button type="button" onClick={() => setSearchInput("")}>
                  <i className="bi bi-x-circle-fill" />
                </button>
              )}
            </div>
          </div>

          <div className="adm-build-field">
            <label>Trạng thái</label>

            <select
              className="adm-build-control"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">Tất cả trạng thái</option>

              <option value="1">Hoạt động</option>

              <option value="0">Đang ẩn</option>
            </select>
          </div>

          <div className="adm-build-field">
            <label>Nổi bật</label>

            <select
              className="adm-build-control"
              value={featuredFilter}
              onChange={(event) => setFeaturedFilter(event.target.value)}
            >
              <option value="">Tất cả</option>

              <option value="1">Nổi bật</option>

              <option value="0">Không nổi bật</option>
            </select>
          </div>

          <div className="adm-build-field">
            <label>Sắp xếp</label>

            <select
              className="adm-build-control"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="newest">Mới nhất</option>

              <option value="oldest">Cũ nhất</option>

              <option value="price_desc">Giá cao → thấp</option>

              <option value="price_asc">Giá thấp → cao</option>

              <option value="name_asc">Tên A → Z</option>

              <option value="name_desc">Tên Z → A</option>

              <option value="updated">Cập nhật gần nhất</option>

              <option value="featured">Nổi bật trước</option>
            </select>
          </div>

          <button type="submit" className="adm-build-search-btn">
            <i className="bi bi-search" />
            Tìm kiếm
          </button>
        </form>
      </section>

      {/* TABLE */}

      <section className="adm-build-panel">
        <div className="adm-build-panel__head">
          <div className="adm-build-panel__title">
            <span className="adm-build-section-icon">
              <i className="bi bi-list-ul" />
            </span>

            <div>
              <h2>Danh sách cấu hình</h2>

              <p>Tìm thấy {pagination.total} cấu hình phù hợp.</p>
            </div>
          </div>

          <button
            type="button"
            className="adm-build-refresh-btn"
            disabled={isLoadingBuilds}
            onClick={() => fetchBuilds(pagination.page)}
          >
            <i
              className={`bi bi-arrow-clockwise ${
                isLoadingBuilds ? "adm-build-icon-spin" : ""
              }`}
            />
            Làm mới
          </button>
        </div>

        <div className="adm-build-table-wrap">
          <table className="adm-build-table">
            <thead>
              <tr>
                <th>Hình ảnh</th>

                <th>Cấu hình</th>

                <th>Tổng giá</th>

                <th>Trạng thái</th>

                <th>Hành động</th>
              </tr>
            </thead>

            <tbody>
              {isLoadingBuilds ? (
                Array.from({
                  length: 4,
                }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan="5">
                      <div className="adm-build-skeleton-row" />
                    </td>
                  </tr>
                ))
              ) : builds.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="adm-build-empty">
                      <span>
                        <i className="bi bi-pc-display" />
                      </span>

                      <strong>Không tìm thấy cấu hình</strong>

                      <p>Hãy thử thay đổi bộ lọc hoặc tạo cấu hình mới.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                builds.map((build) => (
                  <tr key={build.id}>
                    <td>
                      <div className="adm-build-thumb">
                        <img
                          src={getImageUrl(build.image)}
                          alt={build.name}
                          onError={(event) => {
                            event.currentTarget.src = FALLBACK_IMAGE;
                          }}
                        />
                      </div>
                    </td>

                    <td>
                      <div className="adm-build-product-info">
                        <div className="adm-build-product-info__name">
                          <span className="adm-build-id">#{build.id}</span>

                          <strong>{build.name}</strong>
                        </div>

                        <p>{build.description || "Chưa có mô tả cấu hình."}</p>

                        <div className="adm-build-meta">
                          <span>
                            <i className="bi bi-boxes" />
                            {build.item_count || 0} nhóm linh kiện
                          </span>

                          {Number(build.is_featured) === 1 && (
                            <span className="adm-build-meta--featured">
                              <i className="bi bi-star-fill" />
                              Nổi bật
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <strong className="adm-build-price">
                        {formatMoney(build.total_price)}
                      </strong>
                    </td>

                    <td>
                      <div className="adm-build-toggle-stack">
                        <button
                          type="button"
                          className={`adm-build-toggle ${
                            Number(build.status) === 1
                              ? "adm-build-toggle--on"
                              : ""
                          }`}
                          onClick={() => handleToggleStatus(build)}
                        >
                          <span className="adm-build-toggle__switch">
                            <span />
                          </span>

                          <span>
                            {Number(build.status) === 1
                              ? "Hoạt động"
                              : "Đang ẩn"}
                          </span>
                        </button>

                        <button
                          type="button"
                          className={`adm-build-toggle adm-build-toggle--featured ${
                            Number(build.is_featured) === 1
                              ? "adm-build-toggle--on"
                              : ""
                          }`}
                          onClick={() => handleToggleFeatured(build)}
                        >
                          <span className="adm-build-toggle__switch">
                            <span />
                          </span>

                          <span>
                            {Number(build.is_featured) === 1
                              ? "Nổi bật"
                              : "Bình thường"}
                          </span>
                        </button>
                      </div>
                    </td>

                    <td>
                      <div className="adm-build-actions">
                        <button
                          type="button"
                          className="adm-build-action-btn adm-build-action-btn--view"
                          onClick={() => handleOpenViewModal(build.id)}
                          title="Xem chi tiết"
                        >
                          <i className="bi bi-eye" />
                        </button>

                        <button
                          type="button"
                          className="adm-build-action-btn adm-build-action-btn--edit"
                          onClick={async () => {
                            await handleOpenViewModal(build.id);

                            setModalMode("edit");
                          }}
                          title="Chỉnh sửa"
                        >
                          <i className="bi bi-pencil-square" />
                        </button>

                        <button
                          type="button"
                          className="adm-build-action-btn adm-build-action-btn--delete"
                          onClick={() => setDeleteTarget(build)}
                          title="Xóa"
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

        <div className="adm-build-pagination">
          <div>
            Trang <strong>{pagination.page}</strong> /{" "}
            <strong>{Math.max(pagination.totalPages, 1)}</strong>
          </div>

          <div className="adm-build-pagination__actions">
            <button
              type="button"
              disabled={!pagination.hasPrevPage || isLoadingBuilds}
              onClick={() => fetchBuilds(pagination.page - 1)}
            >
              <i className="bi bi-chevron-left" />
            </button>

            <span>{pagination.page}</span>

            <button
              type="button"
              disabled={!pagination.hasNextPage || isLoadingBuilds}
              onClick={() => fetchBuilds(pagination.page + 1)}
            >
              <i className="bi bi-chevron-right" />
            </button>
          </div>
        </div>
      </section>

      {/* BUILD MODAL */}

      {isModalOpen && (
        <div
          className="adm-build-overlay"
          onMouseDown={() => setIsModalOpen(false)}
        >
          <div
            className="adm-build-dialog adm-build-dialog--large"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="adm-build-dialog__header">
              <div>
                <span className="adm-build-dialog__eyebrow">
                  {modalMode === "add"
                    ? "New Build"
                    : modalMode === "edit"
                      ? "Edit Build"
                      : "Build Detail"}
                </span>

                <h2>
                  {modalMode === "add"
                    ? "Thiết kế bộ PC mới"
                    : modalMode === "edit"
                      ? "Chỉnh sửa cấu hình PC"
                      : "Chi tiết cấu hình PC"}
                </h2>
              </div>

              <button
                type="button"
                className="adm-build-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="adm-build-dialog-loading">
                <span className="adm-build-loader" />

                <strong>Đang tải cấu hình...</strong>
              </div>
            ) : (
              <form onSubmit={handleSaveBuild}>
                <div className="adm-build-dialog__body">
                  {/* INFO */}

                  <section className="adm-build-inner-card">
                    <div className="adm-build-inner-card__heading">
                      <span className="adm-build-section-icon">
                        <i className="bi bi-info-circle" />
                      </span>

                      <div>
                        <h3>Thông tin cấu hình</h3>

                        <p>Thiết lập thông tin hiển thị của bộ PC.</p>
                      </div>
                    </div>

                    <div className="adm-build-form-grid">
                      <div className="adm-build-field adm-build-span-5">
                        <label>
                          Tên cấu hình <b>*</b>
                        </label>

                        <input
                          disabled={modalMode === "view"}
                          className={`adm-build-control ${
                            formErrors.name ? "adm-build-control--error" : ""
                          }`}
                          value={formName}
                          onChange={(event) => setFormName(event.target.value)}
                        />

                        {formErrors.name && (
                          <small className="adm-build-error">
                            {formErrors.name}
                          </small>
                        )}
                      </div>

                      <div className="adm-build-field adm-build-span-4">
                        <label>Ảnh đại diện</label>

                        <input
                          disabled={modalMode === "view"}
                          className="adm-build-control"
                          value={formImage}
                          placeholder="/uploads/products/..."
                          onChange={(event) => setFormImage(event.target.value)}
                        />
                      </div>

                      <div className="adm-build-field adm-build-span-3">
                        <label>Trạng thái</label>

                        <select
                          disabled={modalMode === "view"}
                          className="adm-build-control"
                          value={formStatus}
                          onChange={(event) =>
                            setFormStatus(Number(event.target.value))
                          }
                        >
                          <option value={1}>Hoạt động</option>

                          <option value={0}>Đang ẩn</option>
                        </select>
                      </div>

                      <div className="adm-build-field adm-build-span-3">
                        <label>Hiển thị nổi bật</label>

                        <select
                          disabled={modalMode === "view"}
                          className="adm-build-control"
                          value={formFeatured}
                          onChange={(event) =>
                            setFormFeatured(Number(event.target.value))
                          }
                        >
                          <option value={0}>Bình thường</option>

                          <option value={1}>Nổi bật</option>
                        </select>
                      </div>

                      <div className="adm-build-field adm-build-span-12">
                        <label>Mô tả</label>

                        <textarea
                          rows={3}
                          disabled={modalMode === "view"}
                          className={`adm-build-control adm-build-control--textarea ${
                            formErrors.desc ? "adm-build-control--error" : ""
                          }`}
                          value={formDesc}
                          onChange={(event) => setFormDesc(event.target.value)}
                        />

                        {formErrors.desc && (
                          <small className="adm-build-error">
                            {formErrors.desc}
                          </small>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* AUTO BUILD */}

                  {modalMode !== "view" && (
                    <section className="adm-build-auto-card">
                      <div className="adm-build-inner-card__heading">
                        <span className="adm-build-section-icon adm-build-section-icon--amber">
                          <i className="bi bi-stars" />
                        </span>

                        <div>
                          <h3>Gợi ý cấu hình tự động</h3>

                          <p>
                            Hệ thống tự động tìm linh kiện theo ngân sách và chỉ
                            chấp nhận cấu hình vượt qua kiểm tra tương thích
                            Backend.
                          </p>
                        </div>
                      </div>

                      <div className="adm-build-auto-grid">
                        <div className="adm-build-field">
                          <label>Nhu cầu sử dụng</label>

                          <select
                            className="adm-build-control"
                            value={targetUsage}
                            disabled={isAutoBuilding}
                            onChange={(event) =>
                              setTargetUsage(event.target.value)
                            }
                          >
                            <option value="office">Văn phòng / Học tập</option>

                            <option value="gaming">Chơi game</option>

                            <option value="design">Đồ họa / Edit video</option>
                          </select>
                        </div>

                        <div className="adm-build-field">
                          <label>Ngân sách</label>

                          <input
                            type="number"
                            className="adm-build-control"
                            min="3000000"
                            step="500000"
                            disabled={isAutoBuilding}
                            value={targetBudget}
                            onChange={(event) =>
                              setTargetBudget(Number(event.target.value))
                            }
                          />
                        </div>

                        <button
                          type="button"
                          className="adm-build-auto-btn"
                          disabled={isAutoBuilding}
                          aria-busy={isAutoBuilding}
                          onClick={handleAutoBuild}
                        >
                          {isAutoBuilding ? (
                            <>
                              <span className="adm-build-loader adm-build-loader--button" />
                              Đang tối ưu...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-stars" />
                              Tự động chọn
                            </>
                          )}
                        </button>
                      </div>
                    </section>
                  )}

                  {/* COMPONENTS */}

                  <section className="adm-build-component-section">
                    <div className="adm-build-inner-card__heading">
                      <span className="adm-build-section-icon">
                        <i className="bi bi-diagram-3" />
                      </span>

                      <div>
                        <h3>Linh kiện cấu hình</h3>

                        <p>Lựa chọn linh kiện cho 8 nhóm Build PC.</p>
                      </div>
                    </div>

                    {formErrors.components && (
                      <div className="adm-build-form-alert adm-build-form-alert--error">
                        <i className="bi bi-exclamation-triangle-fill" />

                        <span>{formErrors.components}</span>
                      </div>
                    )}

                    {isLoadingCategories ? (
                      <div className="adm-build-dialog-loading">
                        <span className="adm-build-loader" />
                      </div>
                    ) : (
                      <div className="adm-build-component-grid">
                        {categories.map((category) => {
                          const item = selectedItems[category.key];

                          return (
                            <article
                              key={category.key}
                              className={`adm-build-component-card ${
                                item ? "adm-build-component-card--selected" : ""
                              }`}
                            >
                              <div className="adm-build-component-card__type">
                                <span>
                                  <i
                                    className={`bi ${
                                      CATEGORY_ICONS[category.key] || "bi-box"
                                    }`}
                                  />
                                </span>

                                <div>
                                  <strong>{category.key}</strong>

                                  <small>{category.label}</small>
                                </div>
                              </div>

                              <div className="adm-build-component-card__content">
                                {item ? (
                                  <>
                                    <strong>{item.name}</strong>

                                    <span className="adm-build-component-card__price">
                                      {formatMoney(item.price)}
                                    </span>

                                    <div className="adm-build-component-tags">
                                      {item.variant_id && (
                                        <span>Variant #{item.variant_id}</span>
                                      )}

                                      {item.socket && (
                                        <span>Socket {item.socket}</span>
                                      )}

                                      {item.ram_type && (
                                        <span>{item.ram_type}</span>
                                      )}

                                      {item.form_factor && (
                                        <span>{item.form_factor}</span>
                                      )}

                                      <span>Kho: {item.stock_quantity}</span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="adm-build-component-empty">
                                    <i className="bi bi-plus-circle" />
                                    Chưa chọn linh kiện
                                  </div>
                                )}
                              </div>

                              <div className="adm-build-component-card__actions">
                                {item && (
                                  <div className="adm-build-quantity">
                                    <span>SL</span>

                                    <input
                                      type="number"
                                      min="1"
                                      disabled={
                                        modalMode === "view" || isAutoBuilding
                                      }
                                      value={item.quantity || 1}
                                      onChange={(event) =>
                                        handleUpdateQuantity(
                                          category.key,
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </div>
                                )}

                                {modalMode !== "view" && (
                                  <>
                                    <button
                                      type="button"
                                      className="adm-build-component-change"
                                      disabled={isAutoBuilding}
                                      onClick={() =>
                                        handleOpenComponentModal(category.key)
                                      }
                                    >
                                      <i
                                        className={`bi ${
                                          item
                                            ? "bi-arrow-repeat"
                                            : "bi-plus-lg"
                                        }`}
                                      />

                                      {item ? "Thay" : "Lắp"}
                                    </button>

                                    {item && (
                                      <button
                                        type="button"
                                        className="adm-build-component-remove"
                                        disabled={isAutoBuilding}
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

                  {/* COMPATIBILITY */}

                  {isAutoBuilding ? (
                    <section className="adm-build-compat-card adm-build-compat-card--checking">
                      <span className="adm-build-loader adm-build-loader--small" />

                      <div>
                        <strong>Đang tối ưu cấu hình</strong>

                        <p>
                          Hệ thống đang thử các tổ hợp linh kiện và xác thực
                          từng phương án bằng Backend.
                        </p>
                      </div>
                    </section>
                  ) : isValidating ? (
                    <section className="adm-build-compat-card adm-build-compat-card--checking">
                      <span className="adm-build-loader adm-build-loader--small" />

                      <div>
                        <strong>Đang kiểm tra tương thích</strong>

                        <p>Backend đang kiểm tra cấu hình hiện tại.</p>
                      </div>
                    </section>
                  ) : compatibility ? (
                    <section
                      className={`adm-build-compat-card ${
                        compatibility.is_valid
                          ? "adm-build-compat-card--success"
                          : "adm-build-compat-card--error"
                      }`}
                    >
                      <span className="adm-build-compat-card__icon">
                        <i
                          className={`bi ${
                            compatibility.is_valid
                              ? "bi-shield-check"
                              : "bi-shield-exclamation"
                          }`}
                        />
                      </span>

                      <div className="adm-build-compat-card__content">
                        <strong>
                          {compatibility.is_valid
                            ? "Cấu hình tương thích"
                            : "Phát hiện xung đột phần cứng"}
                        </strong>

                        <div className="adm-build-check-grid">
                          {Array.isArray(compatibility.checks) &&
                            compatibility.checks.map((check, index) => (
                              <div
                                key={`${check.rule}-${index}`}
                                className={`adm-build-check-item ${
                                  check.passed
                                    ? "adm-build-check-item--pass"
                                    : "adm-build-check-item--fail"
                                }`}
                              >
                                <i
                                  className={`bi ${
                                    check.passed
                                      ? "bi-check-circle-fill"
                                      : "bi-x-circle-fill"
                                  }`}
                                />

                                <span>
                                  {COMPATIBILITY_LABELS[check.rule] ||
                                    check.rule}
                                </span>
                              </div>
                            ))}
                        </div>

                        {Array.isArray(compatibility.errors) &&
                          compatibility.errors.map((error, index) => (
                            <p
                              key={`error-${index}`}
                              className="adm-build-compat-message adm-build-compat-message--error"
                            >
                              <i className="bi bi-exclamation-circle-fill" />

                              {error.message || error.code}
                            </p>
                          ))}

                        {Array.isArray(compatibility.warnings) &&
                          compatibility.warnings.map((warning, index) => (
                            <p
                              key={`warning-${index}`}
                              className="adm-build-compat-message adm-build-compat-message--warning"
                            >
                              <i className="bi bi-exclamation-triangle-fill" />

                              {warning.message || warning.code}
                            </p>
                          ))}
                      </div>
                    </section>
                  ) : null}

                  {/* TOTAL */}

                  <section className="adm-build-total-card">
                    <div>
                      <span>Tổng giá trị cấu hình</span>

                      <p>
                        Giá được backend xác nhận từ Product / Variant hiện tại.
                      </p>
                    </div>

                    <strong>{formatMoney(displayedTotal)}</strong>
                  </section>
                </div>

                <div className="adm-build-dialog__footer">
                  <button
                    type="button"
                    className="adm-build-btn adm-build-btn--secondary"
                    disabled={isAutoBuilding}
                    onClick={() => setIsModalOpen(false)}
                  >
                    Đóng
                  </button>

                  {modalMode === "view" ? (
                    <button
                      type="button"
                      className="adm-build-btn adm-build-btn--primary"
                      onClick={() => setModalMode("edit")}
                    >
                      <i className="bi bi-pencil-square" />
                      Chỉnh sửa cấu hình
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSaving || isValidating || isAutoBuilding}
                      className="adm-build-btn adm-build-btn--success"
                    >
                      {isSaving ? (
                        <>
                          <span className="adm-build-loader adm-build-loader--button" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check2-circle" />

                          {modalMode === "add"
                            ? "Tạo cấu hình"
                            : "Lưu thay đổi"}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* COMPONENT PICKER */}

      {isComponentModalOpen && (
        <div
          className="adm-build-overlay adm-build-overlay--picker"
          onMouseDown={() => setIsComponentModalOpen(false)}
        >
          <div
            className="adm-build-dialog adm-build-dialog--picker"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="adm-build-picker-head">
              <div>
                <span className="adm-build-picker-head__icon">
                  <i
                    className={`bi ${
                      CATEGORY_ICONS[activeCategory] || "bi-box-seam"
                    }`}
                  />
                </span>

                <div>
                  <span>Component Library</span>

                  <h2>Chọn {activeCategory}</h2>
                </div>
              </div>

              <button
                type="button"
                className="adm-build-close-btn"
                onClick={() => setIsComponentModalOpen(false)}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="adm-build-picker-search">
              <i className="bi bi-search" />

              <input
                value={componentSearch}
                placeholder={`Tìm ${activeCategory} theo tên hoặc SKU...`}
                onChange={(event) => setComponentSearch(event.target.value)}
              />

              {componentSearch && (
                <button type="button" onClick={() => setComponentSearch("")}>
                  <i className="bi bi-x-circle-fill" />
                </button>
              )}
            </div>

            <div className="adm-build-picker-body">
              {isLoadingComponents ? (
                <div className="adm-build-dialog-loading">
                  <span className="adm-build-loader" />

                  <strong>Đang tải linh kiện...</strong>
                </div>
              ) : filteredComponents.length === 0 ? (
                <div className="adm-build-empty">
                  <span>
                    <i className="bi bi-search" />
                  </span>

                  <strong>Không tìm thấy linh kiện</strong>

                  <p>Thử từ khóa khác hoặc kiểm tra dữ liệu Build PC.</p>
                </div>
              ) : (
                <div className="adm-build-picker-list">
                  {filteredComponents.map((product) => {
                    const visible = Number(product.is_visible) !== 0;

                    const soldOut = Number(product.stock_quantity) <= 0;

                    const updating =
                      Number(visibilityUpdatingId) === Number(product.part_id);

                    return (
                      <article
                        key={product.part_id}
                        className={`adm-build-picker-item ${
                          !visible ? "adm-build-picker-item--hidden" : ""
                        }`}
                      >
                        <button
                          type="button"
                          className="adm-build-picker-item__select"
                          disabled={!visible || soldOut}
                          onClick={() => handleSelectComponent(product)}
                        >
                          <div className="adm-build-picker-item__image">
                            <img
                              src={getImageUrl(product.image)}
                              alt={product.name}
                              onError={(event) => {
                                event.currentTarget.src = FALLBACK_IMAGE;
                              }}
                            />
                          </div>

                          <div className="adm-build-picker-item__info">
                            <div className="adm-build-picker-item__name">
                              <strong>{product.name}</strong>

                              {product.variant_id && (
                                <span className="adm-build-chip adm-build-chip--variant">
                                  Variant
                                </span>
                              )}

                              {!visible && (
                                <span className="adm-build-chip adm-build-chip--danger">
                                  Đang ẩn
                                </span>
                              )}

                              {soldOut && (
                                <span className="adm-build-chip adm-build-chip--danger">
                                  Hết hàng
                                </span>
                              )}
                            </div>

                            <div className="adm-build-picker-item__meta">
                              <span>Part #{product.part_id}</span>

                              <span>SKU: {product.sku || "-"}</span>

                              {product.socket && (
                                <span>Socket {product.socket}</span>
                              )}

                              {product.ram_type && (
                                <span>{product.ram_type}</span>
                              )}

                              {product.form_factor && (
                                <span>{product.form_factor}</span>
                              )}

                              {product.power_recommend && (
                                <span>PSU {product.power_recommend}</span>
                              )}
                            </div>
                          </div>

                          <div className="adm-build-picker-item__price">
                            <strong>{formatMoney(product.price)}</strong>

                            <span>Kho: {product.stock_quantity}</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          disabled={updating}
                          className={`adm-build-visibility-btn ${
                            visible ? "" : "adm-build-visibility-btn--show"
                          }`}
                          onClick={() =>
                            handleToggleVisibility(
                              product.part_id,
                              product.is_visible,
                            )
                          }
                        >
                          {updating ? (
                            <span className="adm-build-loader adm-build-loader--tiny" />
                          ) : (
                            <i
                              className={`bi ${
                                visible ? "bi-eye-slash" : "bi-eye"
                              }`}
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

      {/* TRASH */}

      {isTrashOpen && (
        <div
          className="adm-build-overlay"
          onMouseDown={() => setIsTrashOpen(false)}
        >
          <div
            className="adm-build-dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="adm-build-dialog__header">
              <div>
                <span className="adm-build-dialog__eyebrow">Soft Delete</span>

                <h2>Thùng rác cấu hình PC</h2>
              </div>

              <button
                type="button"
                className="adm-build-close-btn"
                onClick={() => setIsTrashOpen(false)}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="adm-build-dialog__body">
              <form
                className="adm-build-trash-search"
                onSubmit={(event) => {
                  event.preventDefault();

                  fetchTrash(1);
                }}
              >
                <i className="bi bi-search" />

                <input
                  value={trashSearch}
                  placeholder="Tìm cấu hình đã xóa..."
                  onChange={(event) => setTrashSearch(event.target.value)}
                />

                <button type="submit">Tìm kiếm</button>
              </form>

              <div className="adm-build-trash-list">
                {isLoadingTrash ? (
                  <div className="adm-build-dialog-loading">
                    <span className="adm-build-loader" />
                  </div>
                ) : trashBuilds.length === 0 ? (
                  <div className="adm-build-empty">
                    <span>
                      <i className="bi bi-trash3" />
                    </span>

                    <strong>Thùng rác đang trống</strong>
                  </div>
                ) : (
                  trashBuilds.map((build) => (
                    <article key={build.id} className="adm-build-trash-item">
                      <div className="adm-build-trash-item__icon">
                        <i className="bi bi-pc-display" />
                      </div>

                      <div className="adm-build-trash-item__info">
                        <strong>{build.name}</strong>

                        <span>
                          #{build.id} • {formatMoney(build.total_price)}
                        </span>

                        <small>
                          Đã xóa:{" "}
                          {build.deleted_at
                            ? new Date(build.deleted_at).toLocaleString("vi-VN")
                            : "-"}
                        </small>
                      </div>

                      <button
                        type="button"
                        className="adm-build-restore-btn"
                        onClick={() => handleRestoreBuild(build.id)}
                      >
                        <i className="bi bi-arrow-counterclockwise" />
                        Khôi phục
                      </button>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className="adm-build-dialog__footer">
              <span className="adm-build-trash-page">
                Trang {trashPagination.page} /{" "}
                {Math.max(trashPagination.totalPages, 1)}
              </span>

              <div className="adm-build-pagination__actions">
                <button
                  type="button"
                  disabled={!trashPagination.hasPrevPage}
                  onClick={() => fetchTrash(trashPagination.page - 1)}
                >
                  <i className="bi bi-chevron-left" />
                </button>

                <button
                  type="button"
                  disabled={!trashPagination.hasNextPage}
                  onClick={() => fetchTrash(trashPagination.page + 1)}
                >
                  <i className="bi bi-chevron-right" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}

      {deleteTarget && (
        <div
          className="adm-build-overlay adm-build-overlay--confirm"
          onMouseDown={() => setDeleteTarget(null)}
        >
          <div
            className="adm-build-confirm"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className="adm-build-confirm__icon">
              <i className="bi bi-trash3" />
            </span>

            <h3>Xóa cấu hình PC?</h3>

            <p>
              Cấu hình <strong>{deleteTarget.name}</strong> sẽ được chuyển vào
              thùng rác và có thể khôi phục sau.
            </p>

            <div className="adm-build-confirm__actions">
              <button
                type="button"
                className="adm-build-btn adm-build-btn--secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Hủy
              </button>

              <button
                type="button"
                className="adm-build-btn adm-build-btn--danger"
                onClick={handleDeleteBuild}
              >
                <i className="bi bi-trash3" />
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
