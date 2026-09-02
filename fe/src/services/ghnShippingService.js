import api from "./api";

const ghnShippingService = {
  // ============================================================
  // STATUS
  //
  // GET /api/client/shipping/ghn/status
  // ============================================================

  getStatus: () => {
    return api.get("/client/shipping/ghn/status");
  },

  // ============================================================
  // PROVINCES
  //
  // GET /api/client/shipping/ghn/provinces
  // ============================================================

  getProvinces: () => {
    return api.get("/client/shipping/ghn/provinces");
  },

  // ============================================================
  // DISTRICTS
  //
  // GET /api/client/shipping/ghn/districts/:provinceId
  // ============================================================

  getDistricts: (provinceId) => {
    return api.get(`/client/shipping/ghn/districts/${provinceId}`);
  },

  // ============================================================
  // WARDS
  //
  // GET /api/client/shipping/ghn/wards/:districtId
  // ============================================================

  getWards: (districtId) => {
    return api.get(`/client/shipping/ghn/wards/${districtId}`);
  },

  // ============================================================
  // FEE
  //
  // POST /api/client/shipping/ghn/fee
  //
  // Có thể giữ lại cho những nơi khác cần tính riêng phí ship.
  // Checkout chính hiện tại dùng getQuote().
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

        to_ward_code: String(toWardCode || "").trim(),

        insurance_value: Math.max(Number(insuranceValue) || 0, 0),

        cod_value: Math.max(Number(codValue) || 0, 0),
      },
    );
  },

  // ============================================================
  // LEAD TIME
  //
  // POST /api/client/shipping/ghn/lead-time
  //
  // Có thể giữ lại cho những nơi khác cần tính riêng thời gian.
  // ============================================================

  calculateLeadTime: ({ toDistrictId, toWardCode }) => {
    return api.post(
      "/client/shipping/ghn/lead-time",

      {
        to_district_id: Number(toDistrictId),

        to_ward_code: String(toWardCode || "").trim(),
      },
    );
  },

  // ============================================================
  // FULL QUOTE
  //
  // POST /api/client/shipping/ghn/quote
  //
  // Đây là hàm Checkout đang sử dụng.
  //
  // Backend sẽ:
  //
  // 1. Validate Province
  // 2. Validate District
  // 3. Validate Ward
  // 4. Tự chọn GHN service
  // 5. Tính shipping fee
  // 6. Tính lead time
  //
  // FE không tự quyết định service_id.
  // ============================================================

  getQuote: ({
    provinceId,
    districtId,
    wardCode,
    insuranceValue = 0,
    codValue = 0,
  }) => {
    const normalizedProvinceId = Number(provinceId);

    const normalizedDistrictId = Number(districtId);

    const normalizedWardCode = String(wardCode || "").trim();

    const normalizedInsuranceValue = Math.max(Number(insuranceValue) || 0, 0);

    const normalizedCodValue = Math.max(Number(codValue) || 0, 0);

    return api.post(
      "/client/shipping/ghn/quote",

      {
        province_id: normalizedProvinceId,

        district_id: normalizedDistrictId,

        ward_code: normalizedWardCode,

        insurance_value: normalizedInsuranceValue,

        cod_value: normalizedCodValue,
      },
    );
  },
};

export default ghnShippingService;
