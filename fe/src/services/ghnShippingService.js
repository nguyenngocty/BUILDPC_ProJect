import api from "./api";

const ghnShippingService = {
    getStatus: () => {
        return api.get(
            "/client/shipping/ghn/status"
        );
    },

    getProvinces: () => {
        return api.get(
            "/client/shipping/ghn/provinces"
        );
    },

    getDistricts: (provinceId) => {
        return api.get(
            `/client/shipping/ghn/districts/${provinceId}`
        );
    },

    getWards: (districtId) => {
        return api.get(
            `/client/shipping/ghn/wards/${districtId}`
        );
    },

    calculateFee: ({
        toDistrictId,
        toWardCode,
        insuranceValue = 0,
        codValue = 0,
    }) => {
        return api.post(
            "/client/shipping/ghn/fee",
            {
                to_district_id: Number(
                    toDistrictId
                ),

                to_ward_code: String(
                    toWardCode || ""
                ),

                insurance_value:
                    Math.max(
                        Number(
                            insuranceValue
                        ) || 0,
                        0
                    ),

                cod_value:
                    Math.max(
                        Number(codValue) || 0,
                        0
                    ),
            }
        );
    },

    calculateLeadTime: ({
        toDistrictId,
        toWardCode,
    }) => {
        return api.post(
            "/client/shipping/ghn/lead-time",
            {
                to_district_id: Number(
                    toDistrictId
                ),

                to_ward_code: String(
                    toWardCode || ""
                ),
            }
        );
    },
};

export default ghnShippingService;