const https = require("https");

const GHN_ENV =
    process.env.GHN_ENV || "test";

const GHN_BASE_URL =
    process.env.GHN_BASE_URL ||
    "https://dev-online-gateway.ghn.vn/shiip/public-api";

const GHN_TOKEN =
    process.env.GHN_TOKEN || "";

const GHN_SHOP_ID =
    Number(process.env.GHN_SHOP_ID) || 0;

const GHN_TIMEOUT_MS =
    Number(process.env.GHN_TIMEOUT_MS) ||
    15000;

const GHN_DEFAULT_WEIGHT =
    Number(process.env.GHN_DEFAULT_WEIGHT);

const GHN_DEFAULT_LENGTH =
    Number(process.env.GHN_DEFAULT_LENGTH);

const GHN_DEFAULT_WIDTH =
    Number(process.env.GHN_DEFAULT_WIDTH);

const GHN_DEFAULT_HEIGHT =
    Number(process.env.GHN_DEFAULT_HEIGHT);

const LIGHT_SERVICE_TYPE_ID = 2;

let cachedShop = null;
let cachedShopAt = 0;

const SHOP_CACHE_TTL =
    10 * 60 * 1000;

const createError = (
    message,
    code = "GHN_ERROR",
) => {
    const error = new Error(message);
    error.code = code;

    return error;
};

const isPositiveNumber = (value) => {
    return (
        Number.isFinite(Number(value)) &&
        Number(value) > 0
    );
};

const validateConfig = () => {
    if (!GHN_TOKEN) {
        throw createError(
            "Chưa cấu hình GHN_TOKEN",
            "GHN_TOKEN_MISSING",
        );
    }

    if (!GHN_SHOP_ID) {
        throw createError(
            "Chưa cấu hình GHN_SHOP_ID",
            "GHN_SHOP_ID_MISSING",
        );
    }
};

const getDefaultPackage = () => {
    const packageInfo = {
        weight: GHN_DEFAULT_WEIGHT,
        length: GHN_DEFAULT_LENGTH,
        width: GHN_DEFAULT_WIDTH,
        height: GHN_DEFAULT_HEIGHT,
    };

    const valid =
        isPositiveNumber(
            packageInfo.weight,
        ) &&
        isPositiveNumber(
            packageInfo.length,
        ) &&
        isPositiveNumber(
            packageInfo.width,
        ) &&
        isPositiveNumber(
            packageInfo.height,
        );

    if (!valid) {
        throw createError(
            "Chưa cấu hình đầy đủ thông số kiện hàng GHN trong .env",
            "GHN_PACKAGE_CONFIG_MISSING",
        );
    }

    return {
        weight: Math.round(
            packageInfo.weight,
        ),

        length: Math.round(
            packageInfo.length,
        ),

        width: Math.round(
            packageInfo.width,
        ),

        height: Math.round(
            packageInfo.height,
        ),
    };
};

const requestGhn = ({
    path,
    method = "POST",
    body = {},
    includeShopId = false,
}) => {
    validateConfig();

    return new Promise(
        (resolve, reject) => {
            try {
                const url = new URL(
                    `${GHN_BASE_URL}${path}`,
                );

                const payload =
                    body === undefined ||
                        body === null
                        ? ""
                        : JSON.stringify(body);

                const headers = {
                    Token: GHN_TOKEN,
                    "Content-Type":
                        "application/json",
                };

                if (includeShopId) {
                    headers.ShopId =
                        String(GHN_SHOP_ID);
                }

                if (payload) {
                    headers["Content-Length"] =
                        Buffer.byteLength(payload);
                }

                const request =
                    https.request(
                        {
                            protocol:
                                url.protocol,

                            hostname:
                                url.hostname,

                            port:
                                url.port || 443,

                            path:
                                `${url.pathname}${url.search}`,

                            method,

                            headers,
                        },
                        (response) => {
                            let rawData = "";

                            response.on(
                                "data",
                                (chunk) => {
                                    rawData += chunk;
                                },
                            );

                            response.on(
                                "end",
                                () => {
                                    try {
                                        const result =
                                            rawData
                                                ? JSON.parse(
                                                    rawData,
                                                )
                                                : {};

                                        if (
                                            response.statusCode <
                                            200 ||
                                            response.statusCode >=
                                            300
                                        ) {
                                            return reject(
                                                createError(
                                                    result?.message ||
                                                    `GHN HTTP ${response.statusCode}`,
                                                    result?.code ||
                                                    "GHN_HTTP_ERROR",
                                                ),
                                            );
                                        }

                                        if (
                                            Number(
                                                result?.code,
                                            ) !== 200
                                        ) {
                                            return reject(
                                                createError(
                                                    result?.message ||
                                                    "GHN trả về lỗi",
                                                    result?.code ||
                                                    "GHN_API_ERROR",
                                                ),
                                            );
                                        }

                                        return resolve(
                                            result,
                                        );
                                    } catch {
                                        return reject(
                                            createError(
                                                "Không thể đọc dữ liệu phản hồi từ GHN",
                                                "GHN_INVALID_RESPONSE",
                                            ),
                                        );
                                    }
                                },
                            );
                        },
                    );

                request.setTimeout(
                    GHN_TIMEOUT_MS,
                    () => {
                        request.destroy(
                            createError(
                                "Kết nối GHN quá thời gian chờ",
                                "GHN_TIMEOUT",
                            ),
                        );
                    },
                );

                request.on(
                    "error",
                    (error) => {
                        reject(error);
                    },
                );

                if (payload) {
                    request.write(payload);
                }

                request.end();
            } catch (error) {
                reject(error);
            }
        },
    );
};

const getProvinces = async () => {
    const response =
        await requestGhn({
            path:
                "/master-data/province",

            body: {},
        });

    return response.data || [];
};

const getDistricts = async (
    provinceId,
) => {
    const id =
        Number(provinceId);

    if (!id) {
        throw createError(
            "province_id không hợp lệ",
            "GHN_INVALID_PROVINCE",
        );
    }

    const response =
        await requestGhn({
            path:
                "/master-data/district",

            body: {
                province_id: id,
            },
        });

    return response.data || [];
};

const getWards = async (
    districtId,
) => {
    const id =
        Number(districtId);

    if (!id) {
        throw createError(
            "district_id không hợp lệ",
            "GHN_INVALID_DISTRICT",
        );
    }

    const response =
        await requestGhn({
            path:
                "/master-data/ward",

            body: {
                district_id: id,
            },
        });

    return response.data || [];
};

const getShops = async () => {
    const response =
        await requestGhn({
            path:
                "/v2/shop/all",

            body: {
                offset: 0,
                limit: 200,
                client_phone: "",
            },
        });

    return (
        response.data?.shops ||
        response.data ||
        []
    );
};

const getCurrentShop =
    async () => {
        const now =
            Date.now();

        if (
            cachedShop &&
            now - cachedShopAt <
            SHOP_CACHE_TTL
        ) {
            return cachedShop;
        }

        const shops =
            await getShops();

        const shop =
            shops.find(
                (item) =>
                    Number(
                        item?._id,
                    ) ===
                    GHN_SHOP_ID,
            );

        if (!shop) {
            throw createError(
                `Không tìm thấy Shop GHN ${GHN_SHOP_ID}`,
                "GHN_SHOP_NOT_FOUND",
            );
        }

        cachedShop = shop;
        cachedShopAt = now;

        return shop;
    };

const getAvailableServices =
    async ({
        toDistrictId,
    }) => {
        const destination =
            Number(
                toDistrictId,
            );

        if (!destination) {
            throw createError(
                "to_district_id không hợp lệ",
                "GHN_INVALID_TO_DISTRICT",
            );
        }

        const shop =
            await getCurrentShop();

        const fromDistrict =
            Number(
                shop?.district_id,
            );

        if (!fromDistrict) {
            throw createError(
                "Shop GHN chưa có district_id hợp lệ",
                "GHN_SHOP_DISTRICT_MISSING",
            );
        }

        const response =
            await requestGhn({
                path:
                    "/v2/shipping-order/available-services",

                body: {
                    shop_id:
                        GHN_SHOP_ID,

                    from_district:
                        fromDistrict,

                    to_district:
                        destination,
                },
            });

        return response.data || [];
    };

const getAutomaticService =
    async ({
        toDistrictId,
    }) => {
        const services =
            await getAvailableServices({
                toDistrictId,
            });

        const lightService =
            services.find(
                (service) =>
                    Number(
                        service?.service_type_id,
                    ) ===
                    LIGHT_SERVICE_TYPE_ID,
            );

        if (!lightService) {
            throw createError(
                "GHN không có dịch vụ Hàng nhẹ phù hợp cho địa chỉ này",
                "GHN_LIGHT_SERVICE_NOT_FOUND",
            );
        }

        return {
            service_id:
                Number(
                    lightService.service_id,
                ),

            service_type_id:
                Number(
                    lightService.service_type_id,
                ),

            short_name:
                lightService.short_name ||
                "Hàng nhẹ",
        };
    };

const calculateFee =
    async ({
        toDistrictId,
        toWardCode,
        insuranceValue = 0,
        codValue = 0,
    }) => {
        const districtId =
            Number(
                toDistrictId,
            );

        const wardCode =
            String(
                toWardCode || "",
            ).trim();

        if (!districtId) {
            throw createError(
                "to_district_id không hợp lệ",
                "GHN_INVALID_TO_DISTRICT",
            );
        }

        if (!wardCode) {
            throw createError(
                "to_ward_code không hợp lệ",
                "GHN_INVALID_TO_WARD",
            );
        }

        const packageInfo =
            getDefaultPackage();

        const selectedService =
            await getAutomaticService({
                toDistrictId:
                    districtId,
            });

        const response =
            await requestGhn({
                path:
                    "/v2/shipping-order/fee",

                includeShopId: true,

                body: {
                    to_district_id:
                        districtId,

                    to_ward_code:
                        wardCode,

                    service_id:
                        selectedService.service_id,

                    service_type_id:
                        selectedService.service_type_id,

                    weight:
                        packageInfo.weight,

                    length:
                        packageInfo.length,

                    width:
                        packageInfo.width,

                    height:
                        packageInfo.height,

                    insurance_value:
                        Math.max(
                            Number(
                                insuranceValue,
                            ) || 0,
                            0,
                        ),

                    cod_value:
                        Math.max(
                            Number(
                                codValue,
                            ) || 0,
                            0,
                        ),
                },
            });

        return {
            ...(response.data || {}),

            selected_service:
                selectedService,
        };
    };

const calculateLeadTime =
    async ({
        toDistrictId,
        toWardCode,
    }) => {
        const districtId =
            Number(
                toDistrictId,
            );

        const wardCode =
            String(
                toWardCode || "",
            ).trim();

        if (!districtId) {
            throw createError(
                "to_district_id không hợp lệ",
                "GHN_INVALID_TO_DISTRICT",
            );
        }

        if (!wardCode) {
            throw createError(
                "to_ward_code không hợp lệ",
                "GHN_INVALID_TO_WARD",
            );
        }

        const shop =
            await getCurrentShop();

        const fromDistrictId =
            Number(
                shop?.district_id,
            );

        const fromWardCode =
            String(
                shop?.ward_code || "",
            ).trim();

        if (!fromDistrictId) {
            throw createError(
                "Shop GHN chưa có district_id hợp lệ",
                "GHN_SHOP_DISTRICT_MISSING",
            );
        }

        if (!fromWardCode) {
            throw createError(
                "Shop GHN chưa có ward_code hợp lệ",
                "GHN_SHOP_WARD_MISSING",
            );
        }

        const selectedService =
            await getAutomaticService({
                toDistrictId:
                    districtId,
            });

        const response =
            await requestGhn({
                path:
                    "/v2/shipping-order/leadtime",

                includeShopId: true,

                body: {
                    from_district_id:
                        fromDistrictId,

                    from_ward_code:
                        fromWardCode,

                    to_district_id:
                        districtId,

                    to_ward_code:
                        wardCode,

                    service_id:
                        selectedService.service_id,
                },
            });

        return {
            ...(response.data || {}),

            selected_service:
                selectedService,
        };
    };

const getStatus = () => {
    const packageConfigured =
        isPositiveNumber(
            GHN_DEFAULT_WEIGHT,
        ) &&
        isPositiveNumber(
            GHN_DEFAULT_LENGTH,
        ) &&
        isPositiveNumber(
            GHN_DEFAULT_WIDTH,
        ) &&
        isPositiveNumber(
            GHN_DEFAULT_HEIGHT,
        );

    return {
        configured:
            Boolean(
                GHN_TOKEN &&
                GHN_SHOP_ID,
            ),

        environment:
            GHN_ENV,

        base_url:
            GHN_BASE_URL,

        shop_id:
            GHN_SHOP_ID,

        package_configured:
            packageConfigured,

        automatic_service_type:
            LIGHT_SERVICE_TYPE_ID,
    };
};

module.exports = {
    getStatus,
    getProvinces,
    getDistricts,
    getWards,
    getShops,
    getCurrentShop,
    getAvailableServices,
    getAutomaticService,
    calculateFee,
    calculateLeadTime,
    getDefaultPackage,
};