const ghnService = require("../../services/ghnService");

// ============================================================
// HELPERS
// ============================================================

const normalizePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const normalizeMoney = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(number, 0);
};

const normalizeText = (value) => {
  return String(value || "").trim();
};

// ============================================================
// GHN ERROR
// ============================================================

const handleGhnError = (
  res,
  error,
  fallback = "Không thể xử lý yêu cầu GHN.",
) => {
  console.error("[GHN]", error?.code || "GHN_ERROR", error?.message || error);

  const code = error?.code || "GHN_ERROR";

  const configErrors = [
    "GHN_TOKEN_MISSING",
    "GHN_SHOP_ID_MISSING",
    "GHN_PACKAGE_CONFIG_MISSING",
    "GHN_SHOP_NOT_FOUND",
    "GHN_SHOP_DISTRICT_MISSING",
    "GHN_SHOP_WARD_MISSING",
  ];

  const status = configErrors.includes(code) ? 500 : 400;

  return res.status(status).json({
    success: false,

    message: error?.message || fallback,

    code,
  });
};

// ============================================================
// GET STATUS
//
// GET /api/client/shipping/ghn/status
// ============================================================

exports.getGhnStatus = async (req, res) => {
  try {
    const data = ghnService.getStatus();

    return res.status(200).json({
      success: true,

      message: "Lấy trạng thái GHN thành công.",

      data,
    });
  } catch (error) {
    return handleGhnError(res, error, "Không thể kiểm tra cấu hình GHN.");
  }
};

// ============================================================
// GET PROVINCES
//
// GET /api/client/shipping/ghn/provinces
// ============================================================

exports.getGhnProvinces = async (req, res) => {
  try {
    const provinces = await ghnService.getProvinces();

    return res.status(200).json({
      success: true,

      message: "Lấy danh sách tỉnh/thành GHN thành công.",

      data: Array.isArray(provinces) ? provinces : [],
    });
  } catch (error) {
    return handleGhnError(
      res,
      error,
      "Không thể tải danh sách tỉnh/thành GHN.",
    );
  }
};

// ============================================================
// GET DISTRICTS
//
// GET /api/client/shipping/ghn/districts/:provinceId
// ============================================================

exports.getGhnDistricts = async (req, res) => {
  try {
    const provinceId = normalizePositiveInt(req.params?.provinceId);

    if (!provinceId) {
      return res.status(400).json({
        success: false,

        message: "province_id không hợp lệ.",

        code: "GHN_INVALID_PROVINCE",
      });
    }

    const districts = await ghnService.getDistricts(provinceId);

    return res.status(200).json({
      success: true,

      message: "Lấy danh sách quận/huyện GHN thành công.",

      data: Array.isArray(districts) ? districts : [],
    });
  } catch (error) {
    return handleGhnError(
      res,
      error,
      "Không thể tải danh sách quận/huyện GHN.",
    );
  }
};

// ============================================================
// GET WARDS
//
// GET /api/client/shipping/ghn/wards/:districtId
// ============================================================

exports.getGhnWards = async (req, res) => {
  try {
    const districtId = normalizePositiveInt(req.params?.districtId);

    if (!districtId) {
      return res.status(400).json({
        success: false,

        message: "district_id không hợp lệ.",

        code: "GHN_INVALID_DISTRICT",
      });
    }

    const wards = await ghnService.getWards(districtId);

    return res.status(200).json({
      success: true,

      message: "Lấy danh sách phường/xã GHN thành công.",

      data: Array.isArray(wards) ? wards : [],
    });
  } catch (error) {
    return handleGhnError(res, error, "Không thể tải danh sách phường/xã GHN.");
  }
};

// ============================================================
// CALCULATE FEE
//
// POST /api/client/shipping/ghn/fee
//
// BODY:
//
// {
//   "to_district_id": 1572,
//   "to_ward_code": "550307",
//   "insurance_value": 1000000,
//   "cod_value": 1000000
// }
// ============================================================

exports.calculateGhnFee = async (req, res) => {
  try {
    const toDistrictId = normalizePositiveInt(req.body?.to_district_id);

    const toWardCode = normalizeText(req.body?.to_ward_code);

    if (!toDistrictId) {
      return res.status(400).json({
        success: false,

        message: "Quận/huyện nhận hàng không hợp lệ.",

        code: "GHN_INVALID_TO_DISTRICT",
      });
    }

    if (!toWardCode) {
      return res.status(400).json({
        success: false,

        message: "Phường/xã nhận hàng không hợp lệ.",

        code: "GHN_INVALID_TO_WARD",
      });
    }

    const data = await ghnService.calculateFee({
      toDistrictId,

      toWardCode,

      insuranceValue: normalizeMoney(req.body?.insurance_value),

      codValue: normalizeMoney(req.body?.cod_value),
    });

    return res.status(200).json({
      success: true,

      message: "Tính phí vận chuyển GHN thành công.",

      data,
    });
  } catch (error) {
    return handleGhnError(res, error, "Không thể tính phí vận chuyển GHN.");
  }
};

// ============================================================
// CALCULATE LEAD TIME
//
// POST /api/client/shipping/ghn/lead-time
// ============================================================

exports.calculateGhnLeadTime = async (req, res) => {
  try {
    const toDistrictId = normalizePositiveInt(req.body?.to_district_id);

    const toWardCode = normalizeText(req.body?.to_ward_code);

    if (!toDistrictId) {
      return res.status(400).json({
        success: false,

        message: "Quận/huyện nhận hàng không hợp lệ.",

        code: "GHN_INVALID_TO_DISTRICT",
      });
    }

    if (!toWardCode) {
      return res.status(400).json({
        success: false,

        message: "Phường/xã nhận hàng không hợp lệ.",

        code: "GHN_INVALID_TO_WARD",
      });
    }

    const data = await ghnService.calculateLeadTime({
      toDistrictId,

      toWardCode,
    });

    return res.status(200).json({
      success: true,

      message: "Tính thời gian giao hàng GHN thành công.",

      data,
    });
  } catch (error) {
    return handleGhnError(
      res,
      error,
      "Không thể tính thời gian giao hàng GHN.",
    );
  }
};

// ============================================================
// FULL QUOTE
//
// POST /api/client/shipping/ghn/quote
//
// BODY:
//
// {
//   "province_id": 202,
//   "district_id": 1572,
//   "ward_code": "550307",
//   "insurance_value": 1000000,
//   "cod_value": 1000000
// }
// ============================================================

exports.getGhnQuote = async (req, res) => {
  try {
    const provinceId = normalizePositiveInt(req.body?.province_id);

    const districtId = normalizePositiveInt(req.body?.district_id);

    const wardCode = normalizeText(req.body?.ward_code);

    // ========================================================
    // VALIDATE
    // ========================================================

    if (!provinceId) {
      return res.status(400).json({
        success: false,

        message: "Tỉnh / thành phố nhận hàng không hợp lệ.",

        code: "GHN_INVALID_PROVINCE",
      });
    }

    if (!districtId) {
      return res.status(400).json({
        success: false,

        message: "Quận / huyện nhận hàng không hợp lệ.",

        code: "GHN_INVALID_DISTRICT",
      });
    }

    if (!wardCode) {
      return res.status(400).json({
        success: false,

        message: "Phường / xã nhận hàng không hợp lệ.",

        code: "GHN_INVALID_WARD",
      });
    }

    // ========================================================
    // GET QUOTE
    // ========================================================

    const data = await ghnService.getShippingQuote({
      provinceId,

      districtId,

      wardCode,

      insuranceValue: normalizeMoney(req.body?.insurance_value),

      codValue: normalizeMoney(req.body?.cod_value),
    });

    return res.status(200).json({
      success: true,

      message: "Lấy báo giá vận chuyển GHN thành công.",

      data,
    });
  } catch (error) {
    return handleGhnError(res, error, "Không thể lấy báo giá vận chuyển GHN.");
  }
};
