const PcPart = require("./PcPart");
const PcBuild = require("./PcBuild");

// ============================================================
// CONSTANTS
// ============================================================

const SUPPORTED_USAGES = new Set([
  "office",
  "gaming",
  "design",
]);

const TYPE_CODES = [
  "CPU",
  "MAINBOARD",
  "RAM",
  "VGA",
  "COOLING",
  "PSU",
  "STORAGE",
  "CASE",
];

// ============================================================
// USAGE PROFILE
//
// targetRatio:
// Tỷ trọng mong muốn.
//
// weight:
// Mức quan trọng khi chấm điểm.
//
// required:
// Nhóm bắt buộc phải có.
//
// VGA của office không bắt buộc vì có thể dùng CPU/iGPU.
// ============================================================

const USAGE_PROFILES = {
  office: {
    label: "Văn phòng / Học tập",

    targetRatio: {
      CPU: 0.28,
      MAINBOARD: 0.18,
      RAM: 0.16,
      STORAGE: 0.16,
      PSU: 0.1,
      CASE: 0.07,
      COOLING: 0.05,
      VGA: 0,
    },

    weight: {
      CPU: 1.2,
      MAINBOARD: 1,
      RAM: 1.1,
      STORAGE: 1.2,
      PSU: 0.8,
      CASE: 0.6,
      COOLING: 0.5,
      VGA: 0,
    },

    required: [
      "CPU",
      "MAINBOARD",
      "RAM",
      "STORAGE",
      "PSU",
      "CASE",
    ],

    optional: [
      "COOLING",
    ],
  },

  gaming: {
    label: "Gaming",

    targetRatio: {
      VGA: 0.36,
      CPU: 0.2,
      MAINBOARD: 0.12,
      RAM: 0.09,
      STORAGE: 0.08,
      PSU: 0.06,
      COOLING: 0.05,
      CASE: 0.04,
    },

    weight: {
      VGA: 1.8,
      CPU: 1.4,
      MAINBOARD: 1,
      RAM: 1,
      STORAGE: 0.9,
      PSU: 1,
      COOLING: 0.7,
      CASE: 0.6,
    },

    required: [
      "CPU",
      "MAINBOARD",
      "RAM",
      "VGA",
      "STORAGE",
      "PSU",
      "CASE",
    ],

    optional: [
      "COOLING",
    ],
  },

  design: {
    label: "Đồ họa / Thiết kế",

    targetRatio: {
      CPU: 0.24,
      VGA: 0.23,
      RAM: 0.17,
      STORAGE: 0.12,
      MAINBOARD: 0.09,
      PSU: 0.06,
      COOLING: 0.05,
      CASE: 0.04,
    },

    weight: {
      CPU: 1.7,
      VGA: 1.5,
      RAM: 1.5,
      STORAGE: 1.2,
      MAINBOARD: 1,
      PSU: 1,
      COOLING: 0.8,
      CASE: 0.6,
    },

    required: [
      "CPU",
      "MAINBOARD",
      "RAM",
      "VGA",
      "STORAGE",
      "PSU",
      "CASE",
    ],

    optional: [
      "COOLING",
    ],
  },
};

// ============================================================
// SEARCH SETTINGS
// ============================================================

// Số candidate tối đa giữ lại mỗi nhóm.
// DB hiện tại nhỏ nên 10 là hợp lý.
const MAX_CANDIDATES_PER_TYPE = 10;

// Số state tốt nhất giữ lại sau mỗi bước.
const BEAM_WIDTH = 20;

// Không để search bùng nổ nếu DB lớn hơn về sau.
const MAX_EXPANSIONS = 2500;

// Tối đa 500 PcPart khả dụng.
// Nếu tương lai >500, nên chuyển sang query chuyên dụng.
const ALL_PARTS_LIMIT = 100;

// ============================================================
// HELPERS
// ============================================================

const createBusinessError = (
  message,
  statusCode = 400,
  details = null,
) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.status = statusCode;

  if (details) {
    error.details = details;
  }

  return error;
};

const normalizeUsage = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeBudget = (value) => {
  const budget = Number(value);

  if (!Number.isFinite(budget)) {
    return 0;
  }

  return Math.floor(budget);
};

const getTypeCode = (part) =>
  String(part?.type_code || "")
    .trim()
    .toUpperCase();

const getPartId = (part) =>
  Number(part?.part_id ?? part?.id ?? 0);

const getPrice = (part) => {
  const price = Number(
    part?.effective_price ??
      part?.current_price ??
      part?.price ??
      0,
  );

  return Number.isFinite(price) ? price : 0;
};

const getStock = (part) => {
  const stock = Number(part?.stock_quantity ?? 0);

  return Number.isFinite(stock) ? stock : 0;
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

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const normalizeCompatibilityList = (value) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  const values = Array.isArray(value)
    ? value
    : String(value)
        .split(/[,;/|]+/)
        .map((item) => item.trim());

  return [
    ...new Set(
      values
        .map(normalizeText)
        .filter(Boolean),
    ),
  ];
};

const parsePowerValue = (value) => {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const match = String(value)
    .trim()
    .replace(",", ".")
    .match(/(\d+(?:\.\d+)?)/);

  if (!match) {
    return 0;
  }

  const parsed = Number(match[1]);

  return Number.isFinite(parsed) ? parsed : 0;
};

const getSpecs = (part) =>
  parseSpecifications(part?.specifications);

// ============================================================
// COMPATIBILITY FIELD HELPERS
// ============================================================

const getCpuSocket = (part) => {
  const specs = getSpecs(part);

  return normalizeText(
    specs.socket ||
      part?.product_socket ||
      "",
  );
};

const getMainboardSocket = (part) => {
  const specs = getSpecs(part);

  return normalizeText(
    specs.socket ||
      part?.product_socket ||
      "",
  );
};

const getRamType = (part) => {
  const specs = getSpecs(part);

  return normalizeText(
    specs.ram_type ||
      part?.product_ram_type ||
      "",
  );
};

const getMainboardFormFactor = (part) => {
  const specs = getSpecs(part);

  return normalizeText(
    specs.form_factor ||
      specs.formfactor ||
      specs.board_form_factor ||
      "",
  );
};

const getCaseFormFactors = (part) => {
  const specs = getSpecs(part);

  return normalizeCompatibilityList(
    specs.form_factor ||
      specs.formfactor ||
      specs.supported_form_factor ||
      specs.supported_form_factors ||
      "",
  );
};

const getCoolingSockets = (part) => {
  const specs = getSpecs(part);

  return normalizeCompatibilityList(
    specs.socket ||
      specs.sockets ||
      specs.supported_socket ||
      specs.supported_sockets ||
      "",
  );
};

const getRecommendedPsu = (part) => {
  const specs = getSpecs(part);

  return parsePowerValue(
    specs.recommended_psu ??
      specs.power_recommend ??
      specs.recommended_psu_w ??
      0,
  );
};

const getPsuWattage = (part) => {
  const specs = getSpecs(part);

  return parsePowerValue(
    specs.wattage ??
      specs.power ??
      specs.capacity_w ??
      0,
  );
};

// ============================================================
// LOCAL COMPATIBILITY PREFILTER
//
// Đây KHÔNG phải source of truth.
//
// Chỉ dùng để giảm số tổ hợp cần thử.
// Nếu thiếu specifications => KHÔNG reject.
//
// PcBuild.validateItems() vẫn kiểm tra cuối cùng.
// ============================================================

const isCpuMainboardCompatible = (cpu, mainboard) => {
  if (!cpu || !mainboard) {
    return true;
  }

  const cpuSocket = getCpuSocket(cpu);
  const mainboardSocket = getMainboardSocket(mainboard);

  if (!cpuSocket || !mainboardSocket) {
    return true;
  }

  return cpuSocket === mainboardSocket;
};

const isMainboardRamCompatible = (mainboard, ram) => {
  if (!mainboard || !ram) {
    return true;
  }

  const boardRam = getRamType(mainboard);
  const ramType = getRamType(ram);

  if (!boardRam || !ramType) {
    return true;
  }

  return boardRam === ramType;
};

const isCpuCoolingCompatible = (cpu, cooling) => {
  if (!cpu || !cooling) {
    return true;
  }

  const cpuSocket = getCpuSocket(cpu);
  const coolingSockets = getCoolingSockets(cooling);

  if (!cpuSocket || !coolingSockets.length) {
    return true;
  }

  return coolingSockets.includes(cpuSocket);
};

const isMainboardCaseCompatible = (
  mainboard,
  casePart,
) => {
  if (!mainboard || !casePart) {
    return true;
  }

  const boardFormFactor =
    getMainboardFormFactor(mainboard);

  const caseFormFactors =
    getCaseFormFactors(casePart);

  if (!boardFormFactor || !caseFormFactors.length) {
    return true;
  }

  return caseFormFactors.includes(boardFormFactor);
};

const isVgaPsuCompatible = (vga, psu) => {
  if (!vga || !psu) {
    return true;
  }

  const recommended = getRecommendedPsu(vga);
  const wattage = getPsuWattage(psu);

  if (!recommended || !wattage) {
    return true;
  }

  return wattage >= recommended;
};

// ============================================================
// GET SELECTED PART
// ============================================================

const getSelectedPart = (selection, typeCode) =>
  selection[typeCode] || null;

// ============================================================
// CHECK NEW CANDIDATE LOCALLY
// ============================================================

const isLocallyCompatible = (
  selection,
  candidate,
) => {
  const typeCode = getTypeCode(candidate);

  const cpu =
    typeCode === "CPU"
      ? candidate
      : getSelectedPart(selection, "CPU");

  const mainboard =
    typeCode === "MAINBOARD"
      ? candidate
      : getSelectedPart(selection, "MAINBOARD");

  const ram =
    typeCode === "RAM"
      ? candidate
      : getSelectedPart(selection, "RAM");

  const vga =
    typeCode === "VGA"
      ? candidate
      : getSelectedPart(selection, "VGA");

  const cooling =
    typeCode === "COOLING"
      ? candidate
      : getSelectedPart(selection, "COOLING");

  const psu =
    typeCode === "PSU"
      ? candidate
      : getSelectedPart(selection, "PSU");

  const casePart =
    typeCode === "CASE"
      ? candidate
      : getSelectedPart(selection, "CASE");

  return (
    isCpuMainboardCompatible(cpu, mainboard) &&
    isMainboardRamCompatible(mainboard, ram) &&
    isCpuCoolingCompatible(cpu, cooling) &&
    isMainboardCaseCompatible(
      mainboard,
      casePart,
    ) &&
    isVgaPsuCompatible(vga, psu)
  );
};

// ============================================================
// BUILD PAYLOAD
// ============================================================

const selectionToPayload = (selection) =>
  TYPE_CODES
    .map((typeCode) => selection[typeCode])
    .filter(Boolean)
    .map((part) => ({
      part_id: getPartId(part),
      quantity: 1,
    }));

// ============================================================
// CALCULATE TOTAL
// ============================================================

const calculateTotal = (selection) =>
  Object.values(selection)
    .filter(Boolean)
    .reduce(
      (sum, part) => sum + getPrice(part),
      0,
    );

// ============================================================
// CANDIDATE RANKING
//
// Chọn các candidate quanh target budget của từng nhóm,
// nhưng vẫn giữ cả linh kiện rẻ để thuật toán có đường lùi.
// ============================================================

const rankCandidatesForType = (
  parts,
  typeCode,
  budget,
  profile,
) => {
  const targetRatio =
    Number(profile.targetRatio[typeCode] || 0);

  const targetPrice = budget * targetRatio;

  const validParts = parts
    .filter(
      (part) =>
        getTypeCode(part) === typeCode &&
        getPartId(part) > 0 &&
        getPrice(part) > 0 &&
        getStock(part) > 0 &&
        Number(part.is_visible ?? 1) === 1 &&
        Number(part.product_status ?? 1) === 1 &&
        (
          part.variant_id === null ||
          part.variant_id === undefined ||
          Number(part.variant_status ?? 1) === 1
        ),
    )
    .map((part) => {
      const price = getPrice(part);

      const distance =
        targetPrice > 0
          ? Math.abs(price - targetPrice) /
            targetPrice
          : price / Math.max(budget, 1);

      return {
        part,
        price,
        distance,
      };
    });

  validParts.sort((a, b) => {
    if (a.distance !== b.distance) {
      return a.distance - b.distance;
    }

    return b.price - a.price;
  });

  const closest = validParts
    .slice(0, MAX_CANDIDATES_PER_TYPE)
    .map((item) => item.part);

  // Bổ sung một số lựa chọn rẻ nhất để tránh trường hợp
  // candidate gần target làm tổng build vượt budget.
  const cheapest = [...validParts]
    .sort((a, b) => a.price - b.price)
    .slice(0, 3)
    .map((item) => item.part);

  const map = new Map();

  [...closest, ...cheapest].forEach((part) => {
    map.set(getPartId(part), part);
  });

  return [...map.values()];
};

// ============================================================
// STATE SCORE
//
// Score thấp hơn = tốt hơn.
//
// Trong lúc beam-search:
// - phạt vượt budget rất mạnh
// - phạt lệch target từng nhóm
// - ưu tiên tận dụng ngân sách
// ============================================================

const calculateStateScore = (
  selection,
  budget,
  profile,
) => {
  const total = calculateTotal(selection);

  let score = 0;

  if (total > budget) {
    const overRatio =
      (total - budget) / Math.max(budget, 1);

    score += 10000 + overRatio * 10000;
  }

  for (const [typeCode, part] of Object.entries(
    selection,
  )) {
    if (!part) {
      continue;
    }

    const ratio =
      Number(profile.targetRatio[typeCode] || 0);

    const weight =
      Number(profile.weight[typeCode] || 1);

    if (ratio <= 0) {
      continue;
    }

    const targetPrice = budget * ratio;

    const distance =
      Math.abs(getPrice(part) - targetPrice) /
      Math.max(targetPrice, 1);

    score += distance * weight * 100;
  }

  // Khi chưa vượt budget, ưu tiên dùng ngân sách tốt hơn.
  if (total <= budget) {
    const unusedRatio =
      (budget - total) / Math.max(budget, 1);

    score += unusedRatio * 25;
  }

  return score;
};

// ============================================================
// FINAL SCORE
//
// Final candidate:
// 1. Không vượt budget
// 2. Đủ required groups
// 3. Tận dụng budget
// 4. Phù hợp usage profile
// ============================================================

const calculateFinalScore = (
  selection,
  budget,
  profile,
) => {
  const total = calculateTotal(selection);

  let score = calculateStateScore(
    selection,
    budget,
    profile,
  );

  const selectedTypes = new Set(
    Object.keys(selection).filter(
      (key) => selection[key],
    ),
  );

  for (const requiredType of profile.required) {
    if (!selectedTypes.has(requiredType)) {
      score += 50000;
    }
  }

  if (total <= budget) {
    const budgetUsage =
      total / Math.max(budget, 1);

    // Gần 100% budget hơn sẽ tốt hơn.
    score += Math.abs(1 - budgetUsage) * 50;
  } else {
    score += 100000;
  }

  return score;
};

// ============================================================
// LOAD ALL AVAILABLE PARTS
//
// PcPart.getAll giới hạn tối đa 100 / page.
// Vì vậy phải paginate, KHÔNG được chỉ lấy page 1.
// ============================================================

const loadAllAvailableParts = async () => {
  const allParts = [];

  let page = 1;
  let totalPages = 1;

  do {
    const result = await PcPart.getAll({
      is_visible: 1,
      product_status: 1,
      in_stock: 1,
      page,
      limit: ALL_PARTS_LIMIT,
    });

    const rows = Array.isArray(result?.data)
      ? result.data
      : [];

    allParts.push(...rows);

    totalPages = Math.max(
      Number(result?.pagination?.totalPages || 1),
      1,
    );

    page += 1;
  } while (page <= totalPages);

  // Variant status cần lọc riêng vì PcPart.getAll hiện
  // mới filter Product status.
  return allParts.filter((part) => {
    if (
      part.variant_id !== null &&
      part.variant_id !== undefined
    ) {
      return (
        part.variant_record_id &&
        Number(part.variant_status) === 1
      );
    }

    return true;
  });
};

// ============================================================
// VALIDATE DATABASE INVENTORY
// ============================================================

const validateAvailableGroups = (
  candidatesByType,
  profile,
) => {
  const missing = profile.required.filter(
    (typeCode) =>
      !Array.isArray(candidatesByType[typeCode]) ||
      candidatesByType[typeCode].length === 0,
  );

  if (missing.length) {
    throw createBusinessError(
      "Không đủ dữ liệu linh kiện để tạo cấu hình tự động",
      422,
      {
        missing_types: missing,
      },
    );
  }
};

// ============================================================
// SEARCH ORDER
//
// Dependency-aware:
// CPU trước Mainboard.
// Mainboard trước RAM.
// VGA trước PSU.
// Mainboard trước Case.
// CPU trước Cooling.
// ============================================================

const getSearchOrder = (usage) => {
  if (usage === "gaming") {
    return [
      "VGA",
      "CPU",
      "MAINBOARD",
      "RAM",
      "PSU",
      "STORAGE",
      "CASE",
      "COOLING",
    ];
  }

  if (usage === "design") {
    return [
      "CPU",
      "MAINBOARD",
      "RAM",
      "VGA",
      "PSU",
      "STORAGE",
      "CASE",
      "COOLING",
    ];
  }

  return [
    "CPU",
    "MAINBOARD",
    "RAM",
    "STORAGE",
    "PSU",
    "CASE",
    "COOLING",
  ];
};

// ============================================================
// BEAM SEARCH
// ============================================================

const searchCandidates = (
  candidatesByType,
  usage,
  budget,
  profile,
) => {
  const searchOrder = getSearchOrder(usage);

  let states = [
    {
      selection: {},
      total: 0,
      score: 0,
    },
  ];

  let expansions = 0;

  for (const typeCode of searchOrder) {
    const candidates =
      candidatesByType[typeCode] || [];

    const isRequired =
      profile.required.includes(typeCode);

    const nextStates = [];

    for (const state of states) {
      // Optional component có quyền bỏ qua.
      if (!isRequired) {
        nextStates.push({
          ...state,
          selection: {
            ...state.selection,
          },
        });
      }

      for (const candidate of candidates) {
        if (expansions >= MAX_EXPANSIONS) {
          break;
        }

        expansions += 1;

        if (
          !isLocallyCompatible(
            state.selection,
            candidate,
          )
        ) {
          continue;
        }

        const candidatePrice = getPrice(candidate);

        const newTotal =
          state.total + candidatePrice;

        // Required groups vẫn không cần giữ state vượt budget,
        // vì final build mục tiêu phải <= budget.
        if (newTotal > budget) {
          continue;
        }

        const selection = {
          ...state.selection,
          [typeCode]: candidate,
        };

        nextStates.push({
          selection,

          total: newTotal,

          score: calculateStateScore(
            selection,
            budget,
            profile,
          ),
        });
      }

      if (expansions >= MAX_EXPANSIONS) {
        break;
      }
    }

    if (!nextStates.length) {
      return {
        states: [],
        expansions,
      };
    }

    nextStates.sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }

      return b.total - a.total;
    });

    states = nextStates.slice(0, BEAM_WIDTH);
  }

  return {
    states,
    expansions,
  };
};

// ============================================================
// CHECK REQUIRED TYPES
// ============================================================

const hasRequiredTypes = (
  selection,
  profile,
) =>
  profile.required.every(
    (typeCode) => Boolean(selection[typeCode]),
  );

// ============================================================
// FORMAT ITEM
// ============================================================

const formatRecommendedItem = (part) => ({
  part_id: getPartId(part),

  type_id: Number(part.type_id || 0),

  type_code: getTypeCode(part),

  type_name: part.type_name || "",

  product_id: Number(part.product_id || 0),

  variant_id:
    part.variant_id !== null &&
    part.variant_id !== undefined
      ? Number(part.variant_id)
      : null,

  name:
    part.display_name ||
    part.product_name ||
    "Linh kiện",

  sku:
    part.display_sku ||
    part.product_sku ||
    "",

  image:
    part.display_thumbnail ||
    part.product_thumbnail ||
    null,

  price: getPrice(part),

  quantity: 1,

  stock_quantity: getStock(part),

  specifications: getSpecs(part),

  has_variant: Boolean(part.has_variant),
});

// ============================================================
// BUILD RECOMMENDER
// ============================================================

class BuildRecommender {
  // ==========================================================
  // GET SUPPORTED USAGES
  // ==========================================================

  static getSupportedUsages() {
    return Object.entries(USAGE_PROFILES).map(
      ([code, profile]) => ({
        code,
        label: profile.label,
      }),
    );
  }

  // ==========================================================
  // RECOMMEND
  // ==========================================================

  static async recommend({
    usage,
    budget,
  } = {}) {
    const normalizedUsage =
      normalizeUsage(usage);

    const normalizedBudget =
      normalizeBudget(budget);

    // --------------------------------------------------------
    // INPUT
    // --------------------------------------------------------

    if (!SUPPORTED_USAGES.has(normalizedUsage)) {
      throw createBusinessError(
        "Nhu cầu Build PC không hợp lệ. Chỉ hỗ trợ: office, gaming, design",
        400,
        {
          supported_usages:
            this.getSupportedUsages(),
        },
      );
    }

    if (normalizedBudget <= 0) {
      throw createBusinessError(
        "Ngân sách Build PC phải lớn hơn 0",
        400,
      );
    }

    // Mức tối thiểu này chỉ để loại input vô nghĩa.
    // Khả năng build thật vẫn do giá DB quyết định.
    if (normalizedBudget < 3000000) {
      throw createBusinessError(
        "Ngân sách quá thấp để tạo một cấu hình PC hoàn chỉnh",
        422,
        {
          minimum_input_budget: 3000000,
        },
      );
    }

    const profile =
      USAGE_PROFILES[normalizedUsage];

    // --------------------------------------------------------
    // LOAD CURRENT INVENTORY
    // --------------------------------------------------------

    const allParts =
      await loadAllAvailableParts();

    if (!allParts.length) {
      throw createBusinessError(
        "Hiện không có linh kiện khả dụng để tạo cấu hình",
        422,
      );
    }

    // --------------------------------------------------------
    // BUILD CANDIDATE POOLS
    // --------------------------------------------------------

    const candidatesByType = {};

    for (const typeCode of TYPE_CODES) {
      // Office không cần VGA.
      if (
        normalizedUsage === "office" &&
        typeCode === "VGA"
      ) {
        candidatesByType[typeCode] = [];
        continue;
      }

      candidatesByType[typeCode] =
        rankCandidatesForType(
          allParts,
          typeCode,
          normalizedBudget,
          profile,
        );
    }

    validateAvailableGroups(
      candidatesByType,
      profile,
    );

    // --------------------------------------------------------
    // MINIMUM BUILD COST
    //
    // Đây chỉ là lower bound theo từng nhóm,
    // chưa chắc các món rẻ nhất tương thích với nhau.
    // --------------------------------------------------------

    const minimumGroupCost =
      profile.required.reduce(
        (sum, typeCode) => {
          const candidates =
            candidatesByType[typeCode] || [];

          if (!candidates.length) {
            return sum;
          }

          const cheapest = Math.min(
            ...candidates.map(getPrice),
          );

          return sum + cheapest;
        },
        0,
      );

    if (minimumGroupCost > normalizedBudget) {
      throw createBusinessError(
        "Ngân sách hiện tại chưa đủ cho các nhóm linh kiện bắt buộc",
        422,
        {
          budget: normalizedBudget,
          estimated_minimum_group_cost:
            minimumGroupCost,
          shortage:
            minimumGroupCost -
            normalizedBudget,
        },
      );
    }

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    const searchResult = searchCandidates(
      candidatesByType,
      normalizedUsage,
      normalizedBudget,
      profile,
    );

    let candidateStates =
      searchResult.states.filter((state) =>
        hasRequiredTypes(
          state.selection,
          profile,
        ),
      );

    if (!candidateStates.length) {
      throw createBusinessError(
        "Không tìm thấy tổ hợp linh kiện phù hợp với ngân sách và điều kiện tương thích hiện tại",
        422,
        {
          usage: normalizedUsage,
          budget: normalizedBudget,
          search_expansions:
            searchResult.expansions,
        },
      );
    }

    // --------------------------------------------------------
    // SORT BEFORE AUTHORITATIVE VALIDATION
    // --------------------------------------------------------

    candidateStates = candidateStates
      .map((state) => ({
        ...state,

        finalScore: calculateFinalScore(
          state.selection,
          normalizedBudget,
          profile,
        ),
      }))
      .sort((a, b) => {
        if (a.finalScore !== b.finalScore) {
          return a.finalScore - b.finalScore;
        }

        return b.total - a.total;
      });

    // --------------------------------------------------------
    // BACKEND AUTHORITATIVE VALIDATION
    //
    // Đây mới là source of truth.
    // Không tin local prefilter.
    // --------------------------------------------------------

    let winner = null;

    let authoritativeValidation = null;

    let validationAttempts = 0;

    const MAX_FINAL_VALIDATIONS = Math.min(
      candidateStates.length,
      20,
    );

    for (
      let index = 0;
      index < MAX_FINAL_VALIDATIONS;
      index += 1
    ) {
      const state = candidateStates[index];

      const payload =
        selectionToPayload(state.selection);

      try {
        validationAttempts += 1;

        const validation =
          await PcBuild.validateItems(payload);

        if (!validation.is_valid) {
          continue;
        }

        const backendTotal =
          Number(validation.total_price || 0);

        if (backendTotal > normalizedBudget) {
          continue;
        }

        winner = state;

        authoritativeValidation =
          validation;

        break;
      } catch (error) {
        // Candidate có thể trở nên không hợp lệ do
        // stock/status thay đổi trong lúc search.
        // Thử candidate kế tiếp.
      }
    }

    if (
      !winner ||
      !authoritativeValidation
    ) {
      throw createBusinessError(
        "Không tìm được cấu hình vượt qua kiểm tra tương thích cuối cùng",
        422,
        {
          usage: normalizedUsage,
          budget: normalizedBudget,
          validation_attempts:
            validationAttempts,
        },
      );
    }

    // --------------------------------------------------------
    // FINAL DATA
    //
    // Dùng items từ PcBuild.validateItems()
    // để total/variant/stock là dữ liệu authoritative.
    // --------------------------------------------------------

    const validatedByPartId = new Map(
      authoritativeValidation.items.map(
        (item) => [
          Number(item.part_id),
          item,
        ],
      ),
    );

    const recommendedItems =
      TYPE_CODES
        .map(
          (typeCode) =>
            winner.selection[typeCode],
        )
        .filter(Boolean)
        .map((part) => {
          const formatted =
            formatRecommendedItem(part);

          const validated =
            validatedByPartId.get(
              formatted.part_id,
            );

          return {
            ...formatted,

            // Giá cuối cùng lấy từ validation backend.
            price: Number(
              validated?.price ??
                formatted.price,
            ),

            stock_quantity: Number(
              validated?.stock_quantity ??
                formatted.stock_quantity,
            ),

            product_id: Number(
              validated?.product_id ??
                formatted.product_id,
            ),

            variant_id:
              validated?.variant_id !==
                undefined
                ? validated.variant_id
                : formatted.variant_id,

            specifications:
              validated?.specifications ||
              formatted.specifications,
          };
        });

    const totalPrice = Number(
      authoritativeValidation.total_price || 0,
    );

    const remainingBudget =
      normalizedBudget - totalPrice;

    // --------------------------------------------------------
    // EXPLANATION
    // --------------------------------------------------------

    const explanation = [];

    if (normalizedUsage === "gaming") {
      explanation.push(
        "Cấu hình ưu tiên ngân sách cho card đồ họa và CPU để phục vụ chơi game.",
      );
    }

    if (normalizedUsage === "design") {
      explanation.push(
        "Cấu hình ưu tiên CPU, GPU, RAM và lưu trữ cho công việc thiết kế và xử lý nội dung.",
      );
    }

    if (normalizedUsage === "office") {
      explanation.push(
        "Cấu hình ưu tiên tính cân bằng, bộ nhớ và lưu trữ cho học tập và công việc văn phòng.",
      );
    }

    explanation.push(
      "Tất cả linh kiện được lấy từ dữ liệu sản phẩm và tồn kho hiện tại.",
    );

    explanation.push(
      "Cấu hình đã vượt qua bộ kiểm tra tương thích của Backend.",
    );

    return {
      usage: normalizedUsage,

      usage_label: profile.label,

      budget: normalizedBudget,

      total_price: totalPrice,

      remaining_budget:
        remainingBudget,

      budget_usage_percent:
        normalizedBudget > 0
          ? Number(
              (
                (totalPrice /
                  normalizedBudget) *
                100
              ).toFixed(2),
            )
          : 0,

      is_valid:
        authoritativeValidation.is_valid,

      items: recommendedItems,

      compatibility: {
        is_valid:
          authoritativeValidation.is_valid,

        errors:
          authoritativeValidation.errors ||
          [],

        warnings:
          authoritativeValidation.warnings ||
          [],

        checks:
          authoritativeValidation.checks ||
          [],
      },

      explanation,

      meta: {
        algorithm:
          "budget_compatibility_beam_search",

        is_ai: false,

        candidate_expansions:
          searchResult.expansions,

        final_validation_attempts:
          validationAttempts,
      },
    };
  }
}

module.exports = BuildRecommender;