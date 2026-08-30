const ghnService = require(
    "../../services/ghnService"
);

const sendError = (
    res,
    error,
    fallbackMessage
) => {
    console.error("[GHN]", error);

    return res.status(400).json({
        success: false,
        message:
            error?.message ||
            fallbackMessage,
        code:
            error?.code ||
            "GHN_ERROR",
    });
};

exports.getStatus = async (
    req,
    res
) => {
    try {
        const data =
            ghnService.getStatus();

        return res.json({
            success: true,
            message:
                "Lấy trạng thái GHN thành công",
            data,
        });
    } catch (error) {
        return sendError(
            res,
            error,
            "Không thể kiểm tra trạng thái GHN"
        );
    }
};

exports.getProvinces = async (
    req,
    res
) => {
    try {
        const data =
            await ghnService.getProvinces();

        return res.json({
            success: true,
            message:
                "Lấy danh sách tỉnh/thành GHN thành công",
            data,
        });
    } catch (error) {
        return sendError(
            res,
            error,
            "Không thể lấy danh sách tỉnh/thành"
        );
    }
};

exports.getDistricts = async (
    req,
    res
) => {
    try {
        const provinceId =
            Number(
                req.params.provinceId
            );

        if (!provinceId) {
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "province_id không hợp lệ",
                    code:
                        "INVALID_PROVINCE_ID",
                });
        }

        const data =
            await ghnService.getDistricts(
                provinceId
            );

        return res.json({
            success: true,
            message:
                "Lấy danh sách quận/huyện GHN thành công",
            data,
        });
    } catch (error) {
        return sendError(
            res,
            error,
            "Không thể lấy danh sách quận/huyện"
        );
    }
};

exports.getWards = async (
    req,
    res
) => {
    try {
        const districtId =
            Number(
                req.params.districtId
            );

        if (!districtId) {
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "district_id không hợp lệ",
                    code:
                        "INVALID_DISTRICT_ID",
                });
        }

        const data =
            await ghnService.getWards(
                districtId
            );

        return res.json({
            success: true,
            message:
                "Lấy danh sách phường/xã GHN thành công",
            data,
        });
    } catch (error) {
        return sendError(
            res,
            error,
            "Không thể lấy danh sách phường/xã"
        );
    }
};

exports.getServices = async (
    req,
    res
) => {
    try {
        const toDistrictId =
            Number(
                req.body
                    ?.to_district_id
            );

        if (!toDistrictId) {
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "to_district_id không hợp lệ",
                    code:
                        "INVALID_TO_DISTRICT",
                });
        }

        const data =
            await ghnService.getAutomaticService(
                {
                    toDistrictId,
                }
            );

        return res.json({
            success: true,
            message:
                "Xác định dịch vụ GHN thành công",
            data,
        });
    } catch (error) {
        return sendError(
            res,
            error,
            "Không thể xác định dịch vụ GHN"
        );
    }
};

exports.calculateFee = async (
    req,
    res
) => {
    try {
        const {
            to_district_id,
            to_ward_code,
            insurance_value,
            cod_value,
        } = req.body || {};

        const toDistrictId =
            Number(
                to_district_id
            );

        const toWardCode =
            String(
                to_ward_code || ""
            ).trim();

        if (!toDistrictId) {
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "to_district_id không hợp lệ",
                    code:
                        "INVALID_TO_DISTRICT",
                });
        }

        if (!toWardCode) {
            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "to_ward_code không hợp lệ",
                    code:
                        "INVALID_TO_WARD",
                });
        }

        const data =
            await ghnService.calculateFee(
                {
                    toDistrictId,
                    toWardCode,

                    insuranceValue:
                        Math.max(
                            Number(
                                insurance_value
                            ) || 0,
                            0
                        ),

                    codValue:
                        Math.max(
                            Number(
                                cod_value
                            ) || 0,
                            0
                        ),
                }
            );

        return res.json({
            success: true,
            message:
                "Tính phí vận chuyển GHN thành công",
            data,
        });
    } catch (error) {
        return sendError(
            res,
            error,
            "Không thể tính phí vận chuyển GHN"
        );
    }
};

exports.calculateLeadTime =
    async (
        req,
        res
    ) => {
        try {
            const {
                to_district_id,
                to_ward_code,
            } = req.body || {};

            const toDistrictId =
                Number(
                    to_district_id
                );

            const toWardCode =
                String(
                    to_ward_code || ""
                ).trim();

            if (!toDistrictId) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "to_district_id không hợp lệ",
                        code:
                            "INVALID_TO_DISTRICT",
                    });
            }

            if (!toWardCode) {
                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "to_ward_code không hợp lệ",
                        code:
                            "INVALID_TO_WARD",
                    });
            }

            const data =
                await ghnService.calculateLeadTime(
                    {
                        toDistrictId,
                        toWardCode,
                    }
                );

            return res.json({
                success: true,
                message:
                    "Lấy thời gian giao hàng GHN thành công",
                data,
            });
        } catch (error) {
            return sendError(
                res,
                error,
                "Không thể lấy thời gian giao hàng GHN"
            );
        }
    };