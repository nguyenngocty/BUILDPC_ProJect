const {
    createChatResponse,
    getStatus,
    isConfigured,
} = require("../../services/geminiService");

// ======================================================
// CONFIG
// ======================================================

const MAX_MESSAGE_LENGTH = Number(
    process.env.AI_MAX_MESSAGE_LENGTH || 1500
);

const RATE_LIMIT_WINDOW_MS = Number(
    process.env.AI_RATE_LIMIT_WINDOW_MS ||
    10 * 60 * 1000
);

const RATE_LIMIT_MAX_REQUESTS = Number(
    process.env.AI_RATE_LIMIT_MAX_REQUESTS || 15
);

// ======================================================
// IN-MEMORY RATE LIMIT STORE
// ======================================================

const rateLimitStore = new Map();

// ======================================================
// HELPERS
// ======================================================

const normalizeText = (value) => {
    return String(value || "")
        .replace(/\u0000/g, "")
        .trim();
};

const normalizePreviousResponseId = (value) => {
    const id = normalizeText(value);

    if (!id) {
        return null;
    }

    if (id.length > 200) {
        return null;
    }

    return id;
};

const getClientIp = (req) => {
    const forwarded =
        req.headers["x-forwarded-for"];

    if (forwarded) {
        return String(forwarded)
            .split(",")[0]
            .trim();
    }

    return (
        req.ip ||
        req.socket?.remoteAddress ||
        "unknown"
    );
};

// ======================================================
// CLEAN EXPIRED RATE LIMIT DATA
// ======================================================

const cleanupRateLimitStore = () => {
    const now = Date.now();

    for (const [key, value] of rateLimitStore.entries()) {
        if (
            !value ||
            now - value.windowStart >
            RATE_LIMIT_WINDOW_MS
        ) {
            rateLimitStore.delete(key);
        }
    }
};

// ======================================================
// RATE LIMIT
// ======================================================

const checkRateLimit = (req) => {
    const now = Date.now();

    const ip = getClientIp(req);

    const current =
        rateLimitStore.get(ip);

    if (
        !current ||
        now - current.windowStart >
        RATE_LIMIT_WINDOW_MS
    ) {
        rateLimitStore.set(ip, {
            count: 1,
            windowStart: now,
        });

        return {
            allowed: true,

            remaining:
                RATE_LIMIT_MAX_REQUESTS - 1,

            retryAfterSeconds: 0,
        };
    }

    if (
        current.count >=
        RATE_LIMIT_MAX_REQUESTS
    ) {
        const remainingMs =
            RATE_LIMIT_WINDOW_MS -
            (now - current.windowStart);

        return {
            allowed: false,

            remaining: 0,

            retryAfterSeconds:
                Math.max(
                    1,
                    Math.ceil(
                        remainingMs / 1000
                    )
                ),
        };
    }

    current.count += 1;

    rateLimitStore.set(
        ip,
        current
    );

    return {
        allowed: true,

        remaining:
            RATE_LIMIT_MAX_REQUESTS -
            current.count,

        retryAfterSeconds: 0,
    };
};

// ======================================================
// MAP GEMINI ERROR
// ======================================================

const mapGeminiError = (error) => {
    const statusCode = Number(
        error?.statusCode ||
        error?.status ||
        500
    );

    const code = String(
        error?.code || ""
    ).toUpperCase();

    const message = String(
        error?.message || ""
    ).toLowerCase();

    // ====================================================
    // API KEY INVALID / MISSING
    // ====================================================

    if (
        statusCode === 401 ||
        code === "UNAUTHENTICATED" ||
        code === "AUTHENTICATION" ||
        message.includes(
            "api key not valid"
        ) ||
        message.includes(
            "invalid api key"
        )
    ) {
        return {
            status: 503,

            message:
                "BuildPC AI chưa được cấu hình API key Gemini hợp lệ.",

            code:
                "AI_INVALID_API_KEY",
        };
    }

    // ====================================================
    // API KEY LEAKED / BLOCKED
    // ====================================================

    if (
        message.includes(
            "reported as leaked"
        ) ||
        message.includes(
            "api key was reported as leaked"
        )
    ) {
        return {
            status: 503,

            message:
                "Gemini API key đã bị Google khóa vì bị phát hiện lộ. Vui lòng tạo API key mới.",

            code:
                "AI_API_KEY_BLOCKED",
        };
    }

    // ====================================================
    // PERMISSION
    // ====================================================

    if (
        statusCode === 403 ||
        code === "PERMISSION_DENIED"
    ) {
        return {
            status: 503,

            message:
                "Project Gemini hiện không có quyền sử dụng API này. Vui lòng kiểm tra API key hoặc quyền truy cập project.",

            code:
                "AI_PERMISSION_DENIED",
        };
    }

    // ====================================================
    // MODEL NOT FOUND
    // ====================================================

    if (
        statusCode === 404 ||
        code === "NOT_FOUND" ||
        code === "MODEL_NOT_FOUND" ||
        message.includes(
            "model not found"
        ) ||
        message.includes(
            "not found for api version"
        )
    ) {
        return {
            status: 503,

            message:
                "Model Gemini hiện tại không khả dụng. Vui lòng kiểm tra GEMINI_MODEL.",

            code:
                "AI_MODEL_NOT_AVAILABLE",
        };
    }

    // ====================================================
    // RATE LIMIT / FREE TIER QUOTA
    // ====================================================

    if (
        statusCode === 429 ||
        code ===
        "RESOURCE_EXHAUSTED" ||
        code ===
        "RATE_LIMIT_EXCEEDED" ||
        code ===
        "QUOTA_EXCEEDED"
    ) {
        return {
            status: 429,

            message:
                "BuildPC AI đã chạm giới hạn sử dụng Gemini Free Tier. Vui lòng thử lại sau.",

            code:
                "AI_QUOTA_EXCEEDED",
        };
    }

    // ====================================================
    // INVALID REQUEST
    // ====================================================

    if (
        statusCode === 400 ||
        code ===
        "INVALID_ARGUMENT" ||
        code ===
        "INVALID_REQUEST"
    ) {
        return {
            status: 400,

            message:
                error?.message ||
                "Yêu cầu gửi tới Gemini không hợp lệ.",

            code:
                "AI_INVALID_REQUEST",
        };
    }

    // ====================================================
    // SAFETY BLOCK
    // ====================================================

    if (
        code ===
        "GEMINI_SAFETY_BLOCK"
    ) {
        return {
            status: 400,

            message:
                "Nội dung này không thể được BuildPC AI xử lý.",

            code:
                "AI_SAFETY_BLOCK",
        };
    }

    // ====================================================
    // TIMEOUT
    // ====================================================

    if (
        statusCode === 504 ||
        code ===
        "GEMINI_TIMEOUT" ||
        code ===
        "DEADLINE_EXCEEDED"
    ) {
        return {
            status: 504,

            message:
                "BuildPC AI phản hồi quá lâu. Vui lòng thử lại.",

            code:
                "AI_TIMEOUT",
        };
    }

    // ====================================================
    // GEMINI TEMPORARILY UNAVAILABLE
    // ====================================================

    if (
        statusCode === 503 ||
        code ===
        "UNAVAILABLE" ||
        code ===
        "SERVICE_UNAVAILABLE"
    ) {
        return {
            status: 503,

            message:
                "Gemini đang tạm thời quá tải. Vui lòng thử lại sau.",

            code:
                "AI_SERVICE_UNAVAILABLE",
        };
    }

    // ====================================================
    // GEMINI SERVER ERROR
    // ====================================================

    if (
        statusCode >= 500
    ) {
        return {
            status: 502,

            message:
                "Dịch vụ Gemini đang gặp lỗi. Vui lòng thử lại sau.",

            code:
                "AI_PROVIDER_ERROR",
        };
    }

    // ====================================================
    // UNKNOWN
    // ====================================================

    return {
        status:
            statusCode >= 400 &&
                statusCode < 500
                ? statusCode
                : 500,

        message:
            error?.message ||
            "Không thể xử lý yêu cầu AI.",

        code:
            error?.code ||
            "AI_UNKNOWN_ERROR",
    };
};

// ======================================================
// GET AI STATUS
//
// GET /api/client/ai/status
// ======================================================

exports.getAIStatus = async (
    req,
    res,
    next
) => {
    try {
        const status =
            getStatus();

        return res.json({
            success: true,

            message:
                "Lấy trạng thái BuildPC AI thành công.",

            data: {
                available:
                    Boolean(
                        status.configured
                    ),

                provider:
                    status.provider ||
                    "gemini",

                model:
                    status.model,

                max_message_length:
                    MAX_MESSAGE_LENGTH,

                max_output_tokens:
                    status.max_output_tokens,

                active_sessions:
                    status.active_sessions ||
                    0,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ======================================================
// CHAT WITH AI
//
// POST /api/client/ai/chat
//
// BODY:
//
// {
//   "message": "Tôi có 20 triệu muốn build PC",
//   "previous_response_id": null
// }
//
// previous_response_id trong Gemini là session ID local.
// ======================================================

exports.chat = async (
    req,
    res,
    next
) => {
    try {
        // ==================================================
        // CHECK GEMINI CONFIG
        // ==================================================

        if (!isConfigured()) {
            return res
                .status(503)
                .json({
                    success: false,

                    message:
                        "BuildPC AI chưa được cấu hình. Vui lòng kiểm tra GEMINI_API_KEY.",

                    code:
                        "AI_NOT_CONFIGURED",
                });
        }

        // ==================================================
        // RATE LIMIT
        // ==================================================

        cleanupRateLimitStore();

        const rateLimit =
            checkRateLimit(req);

        res.setHeader(
            "X-AI-RateLimit-Limit",
            String(
                RATE_LIMIT_MAX_REQUESTS
            )
        );

        res.setHeader(
            "X-AI-RateLimit-Remaining",
            String(
                Math.max(
                    0,
                    rateLimit.remaining
                )
            )
        );

        if (
            !rateLimit.allowed
        ) {
            res.setHeader(
                "Retry-After",
                String(
                    rateLimit.retryAfterSeconds
                )
            );

            return res
                .status(429)
                .json({
                    success: false,

                    message:
                        "Bạn đang gửi tin nhắn quá nhanh. Vui lòng thử lại sau.",

                    code:
                        "AI_RATE_LIMIT",

                    retry_after:
                        rateLimit.retryAfterSeconds,
                });
        }

        // ==================================================
        // BODY
        // ==================================================

        const message =
            normalizeText(
                req.body?.message
            );

        const previousResponseId =
            normalizePreviousResponseId(
                req.body
                    ?.previous_response_id
            );

        // ==================================================
        // MESSAGE REQUIRED
        // ==================================================

        if (!message) {
            return res
                .status(400)
                .json({
                    success: false,

                    message:
                        "Vui lòng nhập nội dung cần hỏi BuildPC AI.",

                    code:
                        "AI_MESSAGE_REQUIRED",
                });
        }

        // ==================================================
        // MESSAGE LENGTH
        // ==================================================

        if (
            message.length >
            MAX_MESSAGE_LENGTH
        ) {
            return res
                .status(400)
                .json({
                    success: false,

                    message:
                        `Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự.`,

                    code:
                        "AI_MESSAGE_TOO_LONG",
                });
        }

        // ==================================================
        // CALL GEMINI
        // ==================================================

        const result =
            await createChatResponse({
                message,

                previousResponseId,
            });

        // ==================================================
        // RESPONSE
        // ==================================================

        return res.json({
            success: true,

            message:
                "BuildPC AI phản hồi thành công.",

            data: {
                // Gemini service đang dùng field này
                // làm session id để giữ lịch sử chat.
                response_id:
                    result.response_id,

                message:
                    result.message,

                provider:
                    "gemini",

                model:
                    result.model,

                usage:
                    result.usage ||
                    null,
            },
        });
    } catch (error) {
        console.error(
            "BuildPC Gemini AI error:",
            {
                message:
                    error?.message,

                code:
                    error?.code,

                statusCode:
                    error?.statusCode,
            }
        );

        const mapped =
            mapGeminiError(
                error
            );

        return res
            .status(mapped.status)
            .json({
                success: false,

                message:
                    mapped.message,

                code:
                    mapped.code,
            });
    }
};