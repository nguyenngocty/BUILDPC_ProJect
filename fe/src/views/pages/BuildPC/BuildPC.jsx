import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate, useSearchParams } from "react-router-dom";

import toast from "react-hot-toast";

import "./BuildPC.css";
import "./BuildPCActions.css";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import buildPcService from "../../../services/buildPcService";

import useAuth from "../../../hooks/useAuth";

import { useCart } from "../../../context/CartContext";

import BuildPartRow from "./components/BuildPartRow";
import PartSelectorModal from "./components/PartSelectorModal";
import AutoBuildModal from "./components/AutoBuildModal";
import SaveBuildModal from "./components/SaveBuildModal";
import ResetBuildModal from "./components/ResetBuildModal";

// ============================================================
// CONSTANTS
// ============================================================

const BUILD_ORDER = [
  "cpu",
  "mainboard",
  "ram",
  "vga",
  "cooling",
  "psu",
  "storage",
  "case",
];

const TYPE_ICONS = {
  cpu: "bi-cpu",
  mainboard: "bi-motherboard",
  ram: "bi-memory",
  vga: "bi-gpu-card",
  cooling: "bi-fan",
  psu: "bi-lightning-charge",
  storage: "bi-device-ssd",
  case: "bi-pc-display",
};

const TYPE_SHORT_DESCRIPTION = {
  cpu: "Bộ xử lý trung tâm",
  mainboard: "Bo mạch chủ",
  ram: "Bộ nhớ hệ thống",
  vga: "Card đồ họa",
  cooling: "Tản nhiệt CPU",
  psu: "Nguồn máy tính",
  storage: "Thiết bị lưu trữ",
  case: "Vỏ máy tính",
};

const MULTI_QUANTITY_TYPES = new Set(["ram", "storage"]);

// ============================================================
// HELPERS
// ============================================================

const normalizeTypeCode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const formatPrice = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0đ";
  }

  return `${Math.round(number).toLocaleString("vi-VN")}đ`;
};

const getListData = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
};

const getSingleData = (response) => {
  return response?.data?.data ?? response?.data ?? null;
};

const getValidationData = (response) => {
  return response?.data?.data ?? response?.data ?? null;
};

const parseSpecifications = (value) => {
  if (!value) {
    return {};
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
};

const normalizePart = (part, quantity = 1) => {
  if (!part) {
    return null;
  }

  const specifications = parseSpecifications(part.specifications);

  const partId = Number(part.part_id ?? part.pc_part_id ?? part.id ?? 0);

  const productId = Number(part.product_id ?? 0);

  const rawVariantId = part.variant_id;

  const variantId =
    rawVariantId !== null && rawVariantId !== undefined && rawVariantId !== ""
      ? Number(rawVariantId)
      : null;

  const originalPrice = Number(
    part.variant_price ??
      part.product_price ??
      part.regular_price ??
      part.price ??
      part.unit_price ??
      0,
  );

  const salePrice = Number(
    part.variant_sale_price ?? part.product_sale_price ?? part.sale_price ?? 0,
  );

  const effectivePrice = Number(
    part.effective_price ??
      part.current_price ??
      part.final_price ??
      part.unit_price ??
      (salePrice > 0 && salePrice < originalPrice ? salePrice : originalPrice),
  );

  const stock = Math.max(
    0,
    Number(
      part.stock_quantity ??
        part.variant_stock ??
        part.product_quantity ??
        part.product_total_stock ??
        part.stock ??
        0,
    ),
  );

  const name =
    part.display_name ||
    part.variant_display_name ||
    part.variant_name ||
    part.product_name ||
    part.part_name ||
    part.name ||
    "Linh kiện";

  const sku =
    part.display_sku || part.variant_sku || part.product_sku || part.sku || "";

  const image =
    part.display_thumbnail ||
    part.display_image ||
    part.variant_thumbnail ||
    part.product_thumbnail ||
    part.thumbnail ||
    part.image ||
    "";

  const typeCode = normalizeTypeCode(
    part.type_code ||
      part.part_type_code ||
      part.category_code ||
      part.pc_part_type_code ||
      part.part_type?.type_code ||
      "",
  );

  return {
    ...part,

    id: partId,
    part_id: partId,

    product_id: productId,

    variant_id: Number.isInteger(variantId) && variantId > 0 ? variantId : null,

    type_code: typeCode,

    display_name: name,

    display_sku: sku,

    display_thumbnail: image,

    original_price: originalPrice,

    sale_price: salePrice,

    effective_price: effectivePrice,

    stock_quantity: stock,

    buildQuantity: Math.max(1, Number(quantity || 1)),

    specifications,

    socket: specifications.socket || part.socket || part.product_socket || "",

    ram_type:
      specifications.ram_type || part.ram_type || part.product_ram_type || "",

    form_factor: specifications.form_factor || part.form_factor || "",

    wattage: specifications.wattage || part.wattage || "",

    power_recommend:
      specifications.power_recommend || part.power_recommend || "",
  };
};

const buildSelectedPayload = (selectedParts) => {
  return Object.values(selectedParts)
    .flatMap((items) => (Array.isArray(items) ? items : []))
    .filter(Boolean)
    .map((item) => ({
      part_id: Number(item.part_id || item.id),

      quantity: Number(item.buildQuantity || 1),
    }))
    .filter(
      (item) =>
        Number.isInteger(item.part_id) &&
        item.part_id > 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0,
    );
};

const extractAutoBuildItems = (response) => {
  const data = getSingleData(response);

  const candidates = [
    data?.items,
    data?.parts,
    data?.components,
    data?.build?.items,
    data?.build?.parts,
    data?.recommendation?.items,
    data?.configuration?.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate;
    }
  }

  return [];
};

const extractAutoBuildOptions = (response) => {
  const data = getSingleData(response);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.usages)) {
    return data.usages;
  }

  if (Array.isArray(data?.options)) {
    return data.options;
  }

  return [];
};

// ============================================================
// SAVED BUILD HELPERS
// ============================================================

const extractSavedBuildItems = (build) => {
  const candidates = [
    build?.items,
    build?.build_items,
    build?.components,
    build?.parts,
    build?.pc_build_items,
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate) || candidate.length === 0) {
      continue;
    }

    const activeItems = candidate.filter(
      (item) => !item?.replaced_at && !item?.deleted_at,
    );

    if (activeItems.length > 0) {
      return activeItems;
    }
  }

  return [];
};

// ============================================================
// COMPONENT
// ============================================================

const BuildPC = () => {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const auth = useAuth();

  const { refreshCart } = useCart();

  const isLoggedIn = Boolean(auth?.isAuthenticated || auth?.currentUser);

  // ==========================================================
  // EDIT MODE
  // ==========================================================

  const editParam = searchParams.get("edit");

  const editBuildId = Number(editParam || 0);

  const isEditMode = Number.isInteger(editBuildId) && editBuildId > 0;

  const [editingBuild, setEditingBuild] = useState(null);

  const [editLoading, setEditLoading] = useState(false);

  const [editError, setEditError] = useState("");

  const loadedEditBuildRef = useRef(null);

  // ==========================================================
  // PART TYPES
  // ==========================================================

  const [partTypes, setPartTypes] = useState([]);

  const [partTypesLoading, setPartTypesLoading] = useState(true);

  const [partTypesError, setPartTypesError] = useState("");

  // ==========================================================
  // SELECTED BUILD
  // ==========================================================

  const [selectedParts, setSelectedParts] = useState({});

  // ==========================================================
  // SELECTOR
  // ==========================================================

  const [selectorOpen, setSelectorOpen] = useState(false);

  const [activePartType, setActivePartType] = useState(null);

  const [availableParts, setAvailableParts] = useState([]);

  const [partsLoading, setPartsLoading] = useState(false);

  const [partsError, setPartsError] = useState("");

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const [validation, setValidation] = useState(null);

  const [validating, setValidating] = useState(false);

  const [validationError, setValidationError] = useState("");

  // ==========================================================
  // AUTO BUILD
  // ==========================================================

  const [autoBuildOpen, setAutoBuildOpen] = useState(false);

  const [autoBuildOptions, setAutoBuildOptions] = useState([]);

  const [autoOptionsLoading, setAutoOptionsLoading] = useState(false);

  const [autoGenerating, setAutoGenerating] = useState(false);

  // ==========================================================
  // SAVE
  // ==========================================================

  const [saveModalOpen, setSaveModalOpen] = useState(false);

  const [saving, setSaving] = useState(false);

  // ==========================================================
  // CART / RESET
  // ==========================================================

  const [addingToCart, setAddingToCart] = useState(false);

  const [resetModalOpen, setResetModalOpen] = useState(false);

  // ==========================================================
  // LOAD TYPES
  // ==========================================================

  const loadPartTypes = useCallback(async () => {
    try {
      setPartTypesLoading(true);

      setPartTypesError("");

      const response = await buildPcService.getPartTypes();

      const rawTypes = getListData(response);

      const normalizedTypes = rawTypes
        .map((type) => ({
          ...type,

          id: Number(type.id || type.type_id),

          type_code: normalizeTypeCode(type.type_code),

          type_name: type.type_name || type.name || type.type_code,
        }))
        .filter((type) => type.id && type.type_code);

      normalizedTypes.sort((a, b) => {
        const aIndex = BUILD_ORDER.indexOf(a.type_code);

        const bIndex = BUILD_ORDER.indexOf(b.type_code);

        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });

      setPartTypes(normalizedTypes);

      setSelectedParts((previous) => {
        const next = {};

        normalizedTypes.forEach((type) => {
          next[type.type_code] = previous[type.type_code] || [];
        });

        return next;
      });
    } catch (error) {
      console.error("Lỗi lấy nhóm linh kiện:", error);

      setPartTypes([]);
      setSelectedParts({});

      setPartTypesError(
        error?.response?.data?.message ||
          "Không thể tải danh sách nhóm linh kiện Build PC.",
      );
    } finally {
      setPartTypesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPartTypes();
  }, [loadPartTypes]);

  // ==========================================================
  // LOAD SAVED BUILD FOR EDIT
  // ==========================================================

  useEffect(() => {
    if (!isEditMode || partTypesLoading || partTypes.length === 0) {
      return;
    }

    if (loadedEditBuildRef.current === editBuildId) {
      return;
    }

    let active = true;

    const loadSavedBuild = async () => {
      if (!isLoggedIn) {
        toast.error("Vui lòng đăng nhập để chỉnh sửa cấu hình.");

        navigate("/account/profile");

        return;
      }

      try {
        setEditLoading(true);

        setEditError("");

        const response = await buildPcService.getMyBuildById(editBuildId);

        const savedBuild = getSingleData(response);

        if (!savedBuild) {
          throw new Error("Không tìm thấy cấu hình đã lưu.");
        }

        const savedItems = extractSavedBuildItems(savedBuild);

        if (savedItems.length === 0) {
          throw new Error("Cấu hình đã lưu không có linh kiện.");
        }

        const refreshedItems = await Promise.all(
          savedItems.map(async (savedItem) => {
            const quantity = Math.max(1, Number(savedItem.quantity || 1));

            const partId = Number(
              savedItem.part_id ?? savedItem.pc_part_id ?? savedItem.id ?? 0,
            );

            if (!Number.isInteger(partId) || partId <= 0) {
              return normalizePart(savedItem, quantity);
            }

            try {
              const detailResponse = await buildPcService.getPartById(partId);

              const currentPart = getSingleData(detailResponse);

              /*
               * Saved Build giữ snapshot lịch sử.
               * Current PcPart phải thắng các field hiện tại như:
               * - giá
               * - tồn kho
               * - variant
               * - thumbnail
               * - type_code
               *
               * Quantity vẫn giữ theo Saved Build.
               */
              return normalizePart(
                {
                  ...savedItem,
                  ...(currentPart || {}),
                  part_id: partId,
                },
                quantity,
              );
            } catch (error) {
              /*
               * Nếu linh kiện hiện tại đã bị xóa / ẩn / không còn bán,
               * vẫn giữ snapshot để người dùng thấy cấu hình cũ.
               * Backend validate/update sẽ là nguồn quyết định cuối cùng.
               */
              return normalizePart(savedItem, quantity);
            }
          }),
        );

        if (!active) {
          return;
        }

        const next = {};

        partTypes.forEach((type) => {
          next[type.type_code] = [];
        });

        let mappedCount = 0;

        refreshedItems.forEach((item) => {
          if (!item) {
            return;
          }

          const code = normalizeTypeCode(item.type_code);

          if (!code || !Object.prototype.hasOwnProperty.call(next, code)) {
            return;
          }

          next[code] = [
            {
              ...item,

              type_code: code,

              buildQuantity: Math.max(
                1,
                Number(item.buildQuantity || item.quantity || 1),
              ),
            },
          ];

          mappedCount += 1;
        });

        if (mappedCount === 0) {
          throw new Error(
            "Không thể ánh xạ linh kiện của cấu hình đã lưu vào PC Builder.",
          );
        }

        setEditingBuild(savedBuild);

        setSelectedParts(next);

        loadedEditBuildRef.current = editBuildId;

        toast.success(
          `Đã tải cấu hình “${
            savedBuild.name || `#${editBuildId}`
          }” để chỉnh sửa.`,
        );
      } catch (error) {
        console.error("Lỗi tải cấu hình chỉnh sửa:", error);

        if (!active) {
          return;
        }

        setEditError(
          error?.response?.data?.message ||
            error?.message ||
            "Không thể tải cấu hình để chỉnh sửa.",
        );
      } finally {
        if (active) {
          setEditLoading(false);
        }
      }
    };

    loadSavedBuild();

    return () => {
      active = false;
    };
  }, [
    isEditMode,
    editBuildId,
    isLoggedIn,
    navigate,
    partTypes,
    partTypesLoading,
  ]);

  // ==========================================================
  // LOAD PARTS
  // ==========================================================

  const loadPartsByType = useCallback(async (partType) => {
    if (!partType?.id) {
      return;
    }

    try {
      setPartsLoading(true);

      setPartsError("");

      setAvailableParts([]);

      const response = await buildPcService.getParts({
        type_id: partType.id,

        in_stock: 1,

        page: 1,

        limit: 100,
      });

      const parts = getListData(response)
        .map((part) => normalizePart(part))
        .filter((part) => part && part.part_id > 0);

      setAvailableParts(parts);
    } catch (error) {
      console.error("Lỗi lấy linh kiện:", error);

      setAvailableParts([]);

      setPartsError(
        error?.response?.data?.message || "Không thể tải danh sách linh kiện.",
      );
    } finally {
      setPartsLoading(false);
    }
  }, []);

  // ==========================================================
  // SELECTOR
  // ==========================================================

  const handleOpenSelector = async (partType) => {
    if (!partType?.id) {
      return;
    }

    setActivePartType(partType);

    setSelectorOpen(true);

    await loadPartsByType(partType);
  };

  const handleCloseSelector = () => {
    setSelectorOpen(false);

    setActivePartType(null);

    setAvailableParts([]);

    setPartsError("");
  };

  const handleSelectPart = (part) => {
    if (!activePartType || !part) {
      return;
    }

    const typeCode = normalizeTypeCode(activePartType.type_code);

    const normalized = normalizePart(part);

    if (!typeCode || !normalized || normalized.stock_quantity <= 0) {
      return;
    }

    setSelectedParts((previous) => ({
      ...previous,

      [typeCode]: [
        {
          ...normalized,

          type_code: typeCode,

          buildQuantity: 1,
        },
      ],
    }));

    handleCloseSelector();
  };

  // ==========================================================
  // REMOVE
  // ==========================================================

  const handleRemovePart = (typeCode) => {
    const code = normalizeTypeCode(typeCode);

    if (!code) {
      return;
    }

    setSelectedParts((previous) => ({
      ...previous,

      [code]: [],
    }));
  };

  // ==========================================================
  // QUANTITY
  // ==========================================================

  const handleQuantityChange = (typeCode, partIndex, nextQuantity) => {
    const code = normalizeTypeCode(typeCode);

    if (!code || !MULTI_QUANTITY_TYPES.has(code)) {
      return;
    }

    setSelectedParts((previous) => {
      const items = [...(previous[code] || [])];

      const target = items[partIndex];

      if (!target) {
        return previous;
      }

      const stock = Math.max(0, Number(target.stock_quantity || 0));

      if (stock <= 0) {
        return previous;
      }

      let quantity = Number(nextQuantity);

      if (!Number.isFinite(quantity)) {
        quantity = 1;
      }

      quantity = Math.max(1, Math.floor(quantity));

      quantity = Math.min(quantity, stock);

      items[partIndex] = {
        ...target,

        buildQuantity: quantity,
      };

      return {
        ...previous,

        [code]: items,
      };
    });
  };

  // ==========================================================
  // PAYLOAD
  // ==========================================================

  const buildItems = useMemo(
    () => buildSelectedPayload(selectedParts),
    [selectedParts],
  );

  const selectedCount = buildItems.length;

  const hasSelectedParts = selectedCount > 0;

  // ==========================================================
  // PREVIEW TOTAL
  // ==========================================================

  const previewTotal = useMemo(() => {
    return Object.values(selectedParts)
      .flat()
      .filter(Boolean)
      .reduce(
        (total, item) =>
          total +
          Number(item.effective_price || 0) * Number(item.buildQuantity || 1),
        0,
      );
  }, [selectedParts]);

  const backendTotal =
    validation?.total_price ??
    validation?.total ??
    validation?.summary?.total_price;

  const displayedTotal =
    backendTotal !== undefined && backendTotal !== null
      ? Number(backendTotal)
      : previewTotal;

  // ==========================================================
  // REALTIME VALIDATE
  // ==========================================================

  useEffect(() => {
    if (buildItems.length === 0) {
      setValidation(null);

      setValidationError("");

      setValidating(false);

      return undefined;
    }

    let active = true;

    const timer = window.setTimeout(async () => {
      try {
        setValidating(true);

        setValidationError("");

        const response = await buildPcService.validateBuild(buildItems);

        if (!active) {
          return;
        }

        setValidation(getValidationData(response));
      } catch (error) {
        if (!active) {
          return;
        }

        console.error("Lỗi validate Build PC:", error);

        setValidation(null);

        setValidationError(
          error?.response?.data?.message ||
            "Không thể kiểm tra cấu hình lúc này.",
        );
      } finally {
        if (active) {
          setValidating(false);
        }
      }
    }, 350);

    return () => {
      active = false;

      window.clearTimeout(timer);
    };
  }, [buildItems]);

  // ==========================================================
  // RESET
  // ==========================================================

  const handleResetBuild = () => {
    if (!hasSelectedParts) {
      return;
    }

    setResetModalOpen(true);
  };

  const handleConfirmResetBuild = () => {
    const emptyBuild = {};

    partTypes.forEach((type) => {
      emptyBuild[type.type_code] = [];
    });

    setSelectedParts(emptyBuild);

    setValidation(null);

    setValidationError("");

    setResetModalOpen(false);

    toast.success("Đã làm mới cấu hình.", {
      icon: "✨",
    });
  };

  // ==========================================================
  // AUTO BUILD OPTIONS
  // ==========================================================

  const handleOpenAutoBuild = async () => {
    setAutoBuildOpen(true);

    if (autoBuildOptions.length > 0) {
      return;
    }

    try {
      setAutoOptionsLoading(true);

      const response = await buildPcService.getAutoBuildOptions();

      setAutoBuildOptions(extractAutoBuildOptions(response));
    } catch (error) {
      console.error("Lỗi lấy Auto Build options:", error);

      setAutoBuildOptions([]);
    } finally {
      setAutoOptionsLoading(false);
    }
  };

  // ==========================================================
  // AUTO BUILD GENERATE
  // ==========================================================

  const handleGenerateAutoBuild = async ({ usage, budget }) => {
    try {
      setAutoGenerating(true);

      const response = await buildPcService.autoBuild({
        usage,
        budget,
      });

      let rawItems = extractAutoBuildItems(response);

      if (!rawItems.length) {
        throw new Error("Hệ thống không trả về linh kiện cho cấu hình.");
      }

      rawItems = await Promise.all(
        rawItems.map(async (item) => {
          const current = normalizePart(item, item.quantity || 1);

          if (current?.type_code) {
            return current;
          }

          const partId = Number(item.part_id || item.id || 0);

          if (!partId) {
            return current;
          }

          try {
            const detailResponse = await buildPcService.getPartById(partId);

            const detail = getSingleData(detailResponse);

            return normalizePart(
              {
                ...item,
                ...(detail || {}),
                part_id: partId,
              },
              item.quantity || 1,
            );
          } catch {
            return current;
          }
        }),
      );

      const next = {};

      partTypes.forEach((type) => {
        next[type.type_code] = [];
      });

      let mappedCount = 0;

      rawItems.forEach((item) => {
        if (!item) {
          return;
        }

        const code = normalizeTypeCode(item.type_code);

        if (!code || !Object.prototype.hasOwnProperty.call(next, code)) {
          return;
        }

        next[code] = [
          {
            ...item,

            type_code: code,

            buildQuantity: Number(item.buildQuantity || item.quantity || 1),
          },
        ];

        mappedCount += 1;
      });

      if (mappedCount === 0) {
        throw new Error(
          "Không thể ánh xạ linh kiện Auto Build vào 8 nhóm Build PC.",
        );
      }

      setSelectedParts(next);

      setAutoBuildOpen(false);

      toast.success(
        `Đã tạo cấu hình tự động với ${mappedCount} nhóm linh kiện.`,
      );

      window.setTimeout(() => {
        window.scrollTo({
          top: Math.max(
            0,
            document.querySelector(".client-build-layout")?.offsetTop - 80 || 0,
          ),

          behavior: "smooth",
        });
      }, 100);
    } catch (error) {
      console.error("Lỗi Auto Build:", error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể tạo cấu hình tự động.",
      );
    } finally {
      setAutoGenerating(false);
    }
  };

  // ==========================================================
  // VALIDATION FLAGS
  // ==========================================================

  const validationIsValid = validation?.is_valid ?? validation?.valid;

  const isValid = validationIsValid === true;

  const isInvalid = validationIsValid === false;

  // ==========================================================
  // SAVE OPEN
  // ==========================================================

  const handleOpenSave = () => {
    if (!isLoggedIn) {
      toast.error("Vui lòng đăng nhập trước khi lưu cấu hình.");

      return;
    }

    if (!hasSelectedParts || !isValid) {
      toast.error("Cấu hình chưa hợp lệ để lưu.");

      return;
    }

    setSaveModalOpen(true);
  };

  // ==========================================================
  // SAVE / UPDATE
  // ==========================================================

  const handleSaveBuild = async ({ name, description }) => {
    if (!isLoggedIn) {
      toast.error("Phiên đăng nhập không còn hợp lệ.");

      setSaveModalOpen(false);

      return;
    }

    try {
      setSaving(true);

      const payload = {
        name,

        description: description || null,

        items: buildItems,
      };

      if (isEditMode && editBuildId) {
        await buildPcService.updateMyBuild(editBuildId, payload);

        setSaveModalOpen(false);

        toast.success("Đã cập nhật cấu hình thành công.");

        navigate(`/account/builds/${editBuildId}`);

        return;
      }

      await buildPcService.saveBuild(payload);

      setSaveModalOpen(false);

      toast.success("Đã lưu cấu hình vào My Builds.");
    } catch (error) {
      console.error(
        isEditMode ? "Lỗi cập nhật Build:" : "Lỗi lưu Build:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          (isEditMode
            ? "Không thể cập nhật cấu hình."
            : "Không thể lưu cấu hình."),
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // ADD BUILD TO CART
  // ==========================================================

  const handleAddBuildToCart = async () => {
    if (!isLoggedIn) {
      toast.error("Vui lòng đăng nhập trước khi thêm cấu hình vào giỏ hàng.");

      return;
    }

    if (!hasSelectedParts || !isValid) {
      toast.error("Cấu hình chưa hợp lệ để thêm vào giỏ.");

      return;
    }

    try {
      setAddingToCart(true);

      await buildPcService.addBuildToCart(buildItems);

      if (typeof refreshCart === "function") {
        await refreshCart({
          silent: true,
        });
      }

      toast.success("Đã thêm toàn bộ cấu hình vào giỏ hàng.");
    } catch (error) {
      console.error("Lỗi Build → Cart:", error);

      const details = error?.response?.data?.details;

      const message =
        error?.response?.data?.message ||
        details?.message ||
        error?.message ||
        "Không thể thêm cấu hình vào giỏ hàng.";

      toast.error(message);
    } finally {
      setAddingToCart(false);
    }
  };

  // ==========================================================
  // VALIDATION ARRAYS
  // ==========================================================

  const errors = Array.isArray(validation?.errors) ? validation.errors : [];

  const warnings = Array.isArray(validation?.warnings)
    ? validation.warnings
    : [];

  const checks = Array.isArray(validation?.checks) ? validation.checks : [];

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <Header />

      <main className="client-build-page">
        <div className="client-build-shell">
          {isEditMode && (
            <section
              style={{
                marginBottom: "16px",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                border: "1px solid rgba(239,35,60,.16)",
                borderRadius: "14px",
                background: "#fff",
                boxShadow: "0 8px 24px rgba(15,23,42,.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "11px",
                }}
              >
                <span
                  style={{
                    width: "40px",
                    height: "40px",
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "10px",
                    background: "#fff1f2",
                    color: "#ef233c",
                  }}
                >
                  <i className="bi bi-pencil-square" />
                </span>

                <div>
                  <strong
                    style={{
                      display: "block",
                      color: "#0f172a",
                      fontSize: "13px",
                    }}
                  >
                    Đang chỉnh sửa cấu hình
                  </strong>

                  <small
                    style={{
                      color: "#64748b",
                    }}
                  >
                    {editingBuild?.name || `Cấu hình #${editBuildId}`}
                  </small>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/account/builds/${editBuildId}`)}
                style={{
                  minHeight: "38px",
                  padding: "0 13px",
                  border: "1px solid #dfe5ec",
                  borderRadius: "9px",
                  background: "#fff",
                  color: "#475569",
                  cursor: "pointer",
                  fontWeight: "700",
                }}
              >
                <i className="bi bi-arrow-left" /> Hủy chỉnh sửa
              </button>
            </section>
          )}

          {editLoading && (
            <div className="client-build-state">
              <div className="client-build-spinner" />

              <strong>Đang tải cấu hình đã lưu</strong>

              <p>Hệ thống đang chuẩn bị các linh kiện để bạn chỉnh sửa.</p>
            </div>
          )}

          {editError && (
            <div className="client-build-state client-build-state--error">
              <div className="client-build-state-icon">
                <i className="bi bi-exclamation-triangle" />
              </div>

              <strong>Không thể tải cấu hình chỉnh sửa</strong>

              <p>{editError}</p>

              <button type="button" onClick={() => navigate("/account/builds")}>
                <i className="bi bi-arrow-left" />
                Cấu hình của tôi
              </button>
            </div>
          )}

          {!editLoading && !editError && (
            <>
              <section className="client-build-hero">
                <div className="client-build-hero-glow client-build-hero-glow--one" />
                <div className="client-build-hero-glow client-build-hero-glow--two" />

                <div className="client-build-hero-content">
                  <div className="client-build-eyebrow">
                    <span className="client-build-eyebrow-icon">
                      <i className="bi bi-pc-display-horizontal" />
                    </span>

                    <span>{isEditMode ? "EDIT PC BUILD" : "PC BUILDER"}</span>
                  </div>

                  <h1>
                    {isEditMode ? "Chỉnh sửa bộ PC" : "Xây dựng bộ PC"}

                    <span>
                      {isEditMode ? " đã lưu của bạn" : " dành riêng cho bạn"}
                    </span>
                  </h1>

                  <p>
                    {isEditMode
                      ? "Thay đổi linh kiện trong cấu hình đã lưu. Mọi thay đổi sẽ được Backend kiểm tra tương thích, giá và tồn kho trước khi cập nhật."
                      : "Tự chọn từng linh kiện hoặc để hệ thống gợi ý cấu hình theo ngân sách. Mọi cấu hình đều được kiểm tra tương thích, giá và tồn kho trực tiếp từ Backend."}
                  </p>

                  <div className="client-build-hero-features">
                    <span>
                      <i className="bi bi-shield-check" />
                      Kiểm tra tương thích
                    </span>

                    <span>
                      <i className="bi bi-box-seam" />
                      Đồng bộ tồn kho
                    </span>

                    <span>
                      <i className="bi bi-tags" />
                      Giá hiện tại
                    </span>
                  </div>
                </div>

                <div className="client-build-hero-actions">
                  <button
                    type="button"
                    className="client-build-auto-button"
                    onClick={handleOpenAutoBuild}
                    disabled={partTypesLoading}
                  >
                    <i className="bi bi-stars" />
                    <span>Build tự động</span>
                    <small>Theo ngân sách</small>
                  </button>

                  <button
                    type="button"
                    className="client-build-reset-button"
                    onClick={handleResetBuild}
                    disabled={!hasSelectedParts}
                  >
                    <i className="bi bi-arrow-counterclockwise" />
                    Làm mới
                  </button>
                </div>
              </section>

              <section className="client-build-steps">
                <div className="client-build-step client-build-step--active">
                  <span>01</span>

                  <div>
                    <strong>Chọn linh kiện</strong>
                    <small>Manual / Auto</small>
                  </div>
                </div>

                <div className="client-build-step-line" />

                <div
                  className={`client-build-step ${
                    hasSelectedParts ? "client-build-step--active" : ""
                  }`}
                >
                  <span>02</span>

                  <div>
                    <strong>Kiểm tra</strong>
                    <small>Compatibility</small>
                  </div>
                </div>

                <div className="client-build-step-line" />

                <div
                  className={`client-build-step ${
                    isValid ? "client-build-step--active" : ""
                  }`}
                >
                  <span>03</span>

                  <div>
                    <strong>{isEditMode ? "Cập nhật" : "Hoàn tất"}</strong>
                    <small>{isEditMode ? "Save changes" : "Lưu / Cart"}</small>
                  </div>
                </div>
              </section>

              <div className="client-build-layout">
                <section className="client-build-board">
                  <div className="client-build-board-header">
                    <div>
                      <span className="client-build-section-kicker">
                        {isEditMode ? "CHỈNH SỬA CẤU HÌNH" : "CẤU HÌNH CỦA BẠN"}
                      </span>

                      <h2>Chọn linh kiện</h2>

                      <p>Bạn có thể thay đổi từng linh kiện bất cứ lúc nào.</p>
                    </div>

                    <div className="client-build-board-progress">
                      <strong>{selectedCount}</strong>
                      <span>/ {partTypes.length || 8} nhóm</span>
                    </div>
                  </div>

                  {partTypesLoading && (
                    <div className="client-build-state">
                      <div className="client-build-spinner" />

                      <strong>Đang chuẩn bị PC Builder</strong>

                      <p>Hệ thống đang tải các nhóm linh kiện...</p>
                    </div>
                  )}

                  {!partTypesLoading && partTypesError && (
                    <div className="client-build-state client-build-state--error">
                      <div className="client-build-state-icon">
                        <i className="bi bi-exclamation-triangle" />
                      </div>

                      <strong>Không thể tải Build PC</strong>

                      <p>{partTypesError}</p>

                      <button type="button" onClick={loadPartTypes}>
                        <i className="bi bi-arrow-clockwise" />
                        Thử lại
                      </button>
                    </div>
                  )}

                  {!partTypesLoading &&
                    !partTypesError &&
                    partTypes.length === 0 && (
                      <div className="client-build-state">
                        <div className="client-build-state-icon">
                          <i className="bi bi-inbox" />
                        </div>

                        <strong>Chưa có nhóm linh kiện</strong>

                        <p>Hệ thống chưa cấu hình dữ liệu Build PC.</p>
                      </div>
                    )}

                  {!partTypesLoading &&
                    !partTypesError &&
                    partTypes.length > 0 && (
                      <div className="client-build-part-list">
                        {partTypes.map((partType, index) => {
                          const typeCode = normalizeTypeCode(
                            partType.type_code,
                          );

                          return (
                            <BuildPartRow
                              key={partType.id}
                              index={index + 1}
                              typeCode={typeCode}
                              icon={TYPE_ICONS[typeCode] || "bi-pc"}
                              partType={{
                                ...partType,

                                description:
                                  partType.description ||
                                  partType.type_description ||
                                  TYPE_SHORT_DESCRIPTION[typeCode] ||
                                  "",
                              }}
                              selectedItems={selectedParts[typeCode] || []}
                              allowQuantity={MULTI_QUANTITY_TYPES.has(typeCode)}
                              onSelect={() => handleOpenSelector(partType)}
                              onReplace={() => handleOpenSelector(partType)}
                              onRemove={() => handleRemovePart(typeCode)}
                              onQuantityChange={(partIndex, quantity) =>
                                handleQuantityChange(
                                  typeCode,
                                  partIndex,
                                  quantity,
                                )
                              }
                            />
                          );
                        })}
                      </div>
                    )}
                </section>

                <aside className="client-build-summary-wrap">
                  <section className="client-build-summary">
                    <div className="client-build-summary-header">
                      <div>
                        <span className="client-build-section-kicker">
                          TỔNG QUAN
                        </span>

                        <h2>Cấu hình hiện tại</h2>
                      </div>

                      <div
                        className={`client-build-health ${
                          validating
                            ? "client-build-health--loading"
                            : isValid
                              ? "client-build-health--valid"
                              : isInvalid
                                ? "client-build-health--invalid"
                                : ""
                        }`}
                      >
                        {validating ? (
                          <i className="bi bi-arrow-repeat" />
                        ) : isValid ? (
                          <i className="bi bi-check-lg" />
                        ) : isInvalid ? (
                          <i className="bi bi-x-lg" />
                        ) : (
                          <i className="bi bi-cpu" />
                        )}
                      </div>
                    </div>

                    <div className="client-build-summary-stats">
                      <div>
                        <span>Đã chọn</span>

                        <strong>
                          {selectedCount}/{partTypes.length || 8}
                        </strong>
                      </div>

                      <div>
                        <span>Trạng thái</span>

                        <strong>
                          {validating
                            ? "Đang kiểm tra"
                            : isValid
                              ? "Tương thích"
                              : isInvalid
                                ? "Cần điều chỉnh"
                                : "Chưa kiểm tra"}
                        </strong>
                      </div>
                    </div>

                    <div className="client-build-summary-list">
                      {partTypes.map((type) => {
                        const code = normalizeTypeCode(type.type_code);

                        const item = selectedParts[code]?.[0];

                        if (!item) {
                          return null;
                        }

                        return (
                          <div
                            className="client-build-summary-item"
                            key={type.id}
                          >
                            <div className="client-build-summary-item-icon">
                              <i
                                className={`bi ${TYPE_ICONS[code] || "bi-pc"}`}
                              />
                            </div>

                            <div className="client-build-summary-item-info">
                              <span>{type.type_name}</span>

                              <strong>{item.display_name}</strong>
                            </div>

                            <span className="client-build-summary-item-price">
                              {formatPrice(
                                Number(item.effective_price || 0) *
                                  Number(item.buildQuantity || 1),
                              )}
                            </span>
                          </div>
                        );
                      })}

                      {!hasSelectedParts && (
                        <div className="client-build-summary-empty">
                          <span>
                            <i className="bi bi-box" />
                          </span>

                          <strong>Chưa có linh kiện</strong>

                          <p>
                            Chọn thủ công hoặc dùng Build tự động để bắt đầu.
                          </p>
                        </div>
                      )}
                    </div>

                    {hasSelectedParts && (
                      <div className="client-build-compatibility">
                        <div className="client-build-compatibility-title">
                          <span>
                            <i className="bi bi-diagram-3" />
                            Kiểm tra tương thích
                          </span>

                          {validating && <small>Đang xử lý...</small>}
                        </div>

                        {validationError && (
                          <div className="client-build-compat-message client-build-compat-message--error">
                            <i className="bi bi-exclamation-circle" />
                            <span>{validationError}</span>
                          </div>
                        )}

                        {!validating && !validationError && isValid && (
                          <div className="client-build-compat-message client-build-compat-message--success">
                            <i className="bi bi-shield-check" />
                            <span>
                              Các linh kiện hiện tại tương thích với nhau.
                            </span>
                          </div>
                        )}

                        {!validating &&
                          errors.map((error, index) => (
                            <div
                              className="client-build-compat-message client-build-compat-message--error"
                              key={`error-${index}`}
                            >
                              <i className="bi bi-x-circle" />

                              <span>
                                {typeof error === "string"
                                  ? error
                                  : error.message ||
                                    error.code ||
                                    "Linh kiện không tương thích"}
                              </span>
                            </div>
                          ))}

                        {!validating &&
                          warnings.map((warning, index) => (
                            <div
                              className="client-build-compat-message client-build-compat-message--warning"
                              key={`warning-${index}`}
                            >
                              <i className="bi bi-exclamation-triangle" />

                              <span>
                                {typeof warning === "string"
                                  ? warning
                                  : warning.message ||
                                    warning.code ||
                                    "Thiếu dữ liệu kiểm tra"}
                              </span>
                            </div>
                          ))}

                        {!validating && checks.length > 0 && (
                          <details className="client-build-check-details">
                            <summary>
                              Xem {checks.length} kiểm tra kỹ thuật
                            </summary>

                            <div>
                              {checks.map((check, index) => (
                                <p key={`check-${index}`}>
                                  <i className="bi bi-check-circle" />

                                  <span>
                                    {check.message ||
                                      check.rule ||
                                      check.code ||
                                      `Kiểm tra ${index + 1}`}
                                  </span>
                                </p>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    )}

                    <div className="client-build-total">
                      <div>
                        <span>Tổng giá trị cấu hình</span>
                        <small>Giá được xác minh bởi Backend</small>
                      </div>

                      <strong>{formatPrice(displayedTotal)}</strong>
                    </div>

                    <div className="client-build-summary-actions">
                      <button
                        type="button"
                        className={`client-build-primary-action ${
                          addingToCart ? "client-build-main-action-loading" : ""
                        }`}
                        disabled={
                          !hasSelectedParts ||
                          validating ||
                          !isValid ||
                          addingToCart ||
                          saving
                        }
                        onClick={handleAddBuildToCart}
                      >
                        <i
                          className={
                            addingToCart
                              ? "bi bi-arrow-repeat"
                              : "bi bi-cart-plus"
                          }
                        />

                        {addingToCart
                          ? "Đang thêm vào giỏ..."
                          : "Thêm cấu hình vào giỏ"}
                      </button>

                      <button
                        type="button"
                        className="client-build-secondary-action"
                        disabled={
                          !hasSelectedParts ||
                          validating ||
                          !isValid ||
                          saving ||
                          addingToCart
                        }
                        onClick={handleOpenSave}
                      >
                        <i
                          className={
                            isEditMode
                              ? "bi bi-pencil-square"
                              : "bi bi-bookmark"
                          }
                        />

                        {isEditMode ? "Cập nhật cấu hình" : "Lưu cấu hình"}
                      </button>
                    </div>

                    <p className="client-build-summary-note">
                      <i className="bi bi-info-circle" />
                      Giá và tồn kho được Backend xác minh lại khi lưu, cập nhật
                      hoặc thêm vào giỏ hàng.
                    </p>
                  </section>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>

      <PartSelectorModal
        open={selectorOpen}
        partType={activePartType}
        parts={availableParts}
        selectedParts={
          activePartType
            ? selectedParts[normalizeTypeCode(activePartType.type_code)] || []
            : []
        }
        loading={partsLoading}
        error={partsError}
        onClose={handleCloseSelector}
        onSelect={handleSelectPart}
        onRetry={() => {
          if (activePartType) {
            loadPartsByType(activePartType);
          }
        }}
      />

      <AutoBuildModal
        open={autoBuildOpen}
        options={autoBuildOptions}
        loadingOptions={autoOptionsLoading}
        generating={autoGenerating}
        onClose={() => {
          if (!autoGenerating) {
            setAutoBuildOpen(false);
          }
        }}
        onGenerate={handleGenerateAutoBuild}
      />

      <SaveBuildModal
        open={saveModalOpen}
        saving={saving}
        mode={isEditMode ? "edit" : "create"}
        initialName={editingBuild?.name || ""}
        initialDescription={editingBuild?.description || ""}
        totalPrice={displayedTotal}
        itemCount={selectedCount}
        onClose={() => {
          if (!saving) {
            setSaveModalOpen(false);
          }
        }}
        onSave={handleSaveBuild}
      />

      <ResetBuildModal
        open={resetModalOpen}
        itemCount={selectedCount}
        onClose={() => setResetModalOpen(false)}
        onConfirm={handleConfirmResetBuild}
      />

      <Footer />
    </>
  );
};

export default BuildPC;
