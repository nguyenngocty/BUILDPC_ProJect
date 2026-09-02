import api from "./api";

const ghnShippingService = {
  // ============================================================
  // STATUS
  // ============================================================

  getStatus: () => {
    return api.get("/client/shipping/ghn/status");
  },

  // ============================================================
  // PROVINCES
  // ============================================================

  getProvinces: () => {
    return api.get("/client/shipping/ghn/provinces");
  },

  // ============================================================
  // DISTRICTS
  // ============================================================

  getDistricts: (provinceId) => {
    return api.get(`/client/shipping/ghn/districts/${provinceId}`);
  },

  // ============================================================
  // WARDS
  // ============================================================

  getWards: (districtId) => {
    return api.get(`/client/shipping/ghn/wards/${districtId}`);
  },

  // ============================================================
  // FEE
  // ============================================================

  calculateFee: ({
    toDistrictId,
    toWardCode,
    insuranceValue = 0,
    codValue = 0,
  }) => {
    return api.post(
      "/client/shipping/ghn/fee",

      {
        to_district_id: Number(toDistrictId),

        to_ward_code: String(toWardCode || ""),

        insurance_value: Math.max(Number(insuranceValue) || 0, 0),

        cod_value: Math.max(Number(codValue) || 0, 0),
      },
    );
  },

  // ============================================================
  // LEAD TIME
  // ============================================================

  calculateLeadTime: ({ toDistrictId, toWardCode }) => {
    return api.post(
      "/client/shipping/ghn/lead-time",

      {
        to_district_id: Number(toDistrictId),

        to_ward_code: String(toWardCode || ""),
      },
    );
  },

  // ============================================================
  // FULL QUOTE
  // ============================================================

  getQuote: ({
    provinceId,
    districtId,
    wardCode,
    insuranceValue = 0,
    codValue = 0,
  }) => {
    return api.post(
      "/client/shipping/ghn/quote",

      {
        province_id: Number(provinceId),

        district_id: Number(districtId),

        ward_code: String(wardCode || "").trim(),

        insurance_value: Math.max(Number(insuranceValue) || 0, 0),

        cod_value: Math.max(Number(codValue) || 0, 0),
      },
    );
  },
};

export default ghnShippingService;
