const {
    sendContactRequestMail,
    sendContactConfirmationMail,
} = require("../../utils/mailer");

// ======================================================
// CONTACT / CONSULTATION TYPES
// ======================================================

const CONTACT_CATEGORIES = {
    BUILD_PC: "Tư vấn Build PC",
    UPGRADE: "Tư vấn nâng cấp PC",
    PRODUCT: "Tư vấn sản phẩm / linh kiện",
    ORDER: "Hỗ trợ đơn hàng",
    WARRANTY: "Bảo hành",
    TECHNICAL: "Hỗ trợ kỹ thuật",
    OTHER: "Liên hệ khác",
};

// ======================================================
// HELPERS
// ======================================================

const normalizeText = (value) => {
    return String(value || "").trim();
};

const normalizeEmail = (value) => {
    return normalizeText(value).toLowerCase();
};

const normalizePhone = (value) => {
    return normalizeText(value).replace(/\s+/g, "");
};

const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidPhone = (phone) => {
    return /^(0|\+84)[0-9]{9,10}$/.test(phone);
};

const normalizeBudget = (value) => {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return null;
    }

    const numberValue = Number(value);

    if (
        !Number.isFinite(numberValue) ||
        numberValue < 0
    ) {
        return null;
    }

    return Math.round(numberValue);
};

const normalizeNeeds = (value) => {
    if (!Array.isArray(value)) {
        return [];
    }

    return [
        ...new Set(
            value
                .map((item) => normalizeText(item))
                .filter(Boolean)
        ),
    ].slice(0, 10);
};

// ======================================================
// GENERATE REQUEST CODE
// ======================================================

const generateContactCode = () => {
    const now = new Date();

    const year = now.getFullYear();

    const month = String(
        now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        now.getDate()
    ).padStart(2, "0");

    const random = Math.floor(
        1000 + Math.random() * 9000
    );

    return `HT-${year}${month}${day}-${random}`;
};

// ======================================================
// CREATE CONTACT REQUEST
// POST /api/client/contact
// ======================================================

exports.createContactRequest = async (
    req,
    res,
    next
) => {
    try {
        const name = normalizeText(
            req.body?.name
        );

        const email = normalizeEmail(
            req.body?.email
        );

        const phone = normalizePhone(
            req.body?.phone
        );

        const category = normalizeText(
            req.body?.category
        ).toUpperCase();

        const subject = normalizeText(
            req.body?.subject
        );

        const message = normalizeText(
            req.body?.message
        );

        const orderCode = normalizeText(
            req.body?.order_code
        );

        const budget = normalizeBudget(
            req.body?.budget
        );

        const needs = normalizeNeeds(
            req.body?.needs
        );

        // ==================================================
        // SIMPLE ANTI-SPAM HONEYPOT
        //
        // Frontend sau này sẽ có input ẩn "website".
        // Bot thường tự điền field này.
        // ==================================================

        const website = normalizeText(
            req.body?.website
        );

        if (website) {
            // Không cho bot biết nó bị chặn.
            return res.json({
                success: true,
                message:
                    "Yêu cầu của bạn đã được tiếp nhận.",
            });
        }

        // ==================================================
        // VALIDATE NAME
        // ==================================================

        if (!name) {
            return res.status(400).json({
                success: false,
                message:
                    "Vui lòng nhập họ và tên",
            });
        }

        if (
            name.length < 2 ||
            name.length > 100
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Họ và tên phải từ 2 đến 100 ký tự",
            });
        }

        // ==================================================
        // VALIDATE EMAIL
        // ==================================================

        if (!email) {
            return res.status(400).json({
                success: false,
                message:
                    "Vui lòng nhập email liên hệ",
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message:
                    "Email không hợp lệ",
            });
        }

        if (email.length > 255) {
            return res.status(400).json({
                success: false,
                message:
                    "Email quá dài",
            });
        }

        // ==================================================
        // VALIDATE PHONE
        // ==================================================

        if (!phone) {
            return res.status(400).json({
                success: false,
                message:
                    "Vui lòng nhập số điện thoại",
            });
        }

        if (!isValidPhone(phone)) {
            return res.status(400).json({
                success: false,
                message:
                    "Số điện thoại không hợp lệ",
            });
        }

        // ==================================================
        // VALIDATE CATEGORY
        // ==================================================

        if (!category) {
            return res.status(400).json({
                success: false,
                message:
                    "Vui lòng chọn loại yêu cầu",
            });
        }

        if (
            !Object.prototype.hasOwnProperty.call(
                CONTACT_CATEGORIES,
                category
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Loại yêu cầu không hợp lệ",
            });
        }

        // ==================================================
        // VALIDATE SUBJECT
        // ==================================================

        if (!subject) {
            return res.status(400).json({
                success: false,
                message:
                    "Vui lòng nhập tiêu đề yêu cầu",
            });
        }

        if (
            subject.length < 5 ||
            subject.length > 200
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Tiêu đề phải từ 5 đến 200 ký tự",
            });
        }

        // ==================================================
        // VALIDATE MESSAGE
        // ==================================================

        if (!message) {
            return res.status(400).json({
                success: false,
                message:
                    "Vui lòng nhập nội dung cần hỗ trợ",
            });
        }

        if (
            message.length < 10 ||
            message.length > 3000
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Nội dung phải từ 10 đến 3000 ký tự",
            });
        }

        // ==================================================
        // VALIDATE ORDER CODE
        // Chỉ bắt buộc khi user chọn hỗ trợ đơn hàng.
        // ==================================================

        if (
            category === "ORDER" &&
            !orderCode
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Vui lòng nhập mã đơn hàng cần hỗ trợ",
            });
        }

        if (
            orderCode &&
            orderCode.length > 100
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Mã đơn hàng không hợp lệ",
            });
        }

        // ==================================================
        // BUILD CONTACT DATA
        // ==================================================

        const contactCode =
            generateContactCode();

        const contactData = {
            contact_code: contactCode,

            name,

            email,

            phone,

            category,

            category_label:
                CONTACT_CATEGORIES[
                category
                ],

            subject,

            message,

            order_code:
                orderCode || null,

            budget,

            needs,

            created_at:
                new Date().toISOString(),
        };

        // ==================================================
        // SEND MAIL TO SHOP
        //
        // Đây là mail quan trọng nhất.
        // Nếu gửi mail shop thất bại thì request coi như lỗi.
        // ==================================================

        await sendContactRequestMail(
            contactData
        );

        // ==================================================
        // SEND CONFIRMATION MAIL TO CUSTOMER
        //
        // Nếu mail xác nhận cho khách lỗi:
        // yêu cầu vẫn đã được gửi tới shop.
        // Không trả lỗi toàn bộ request.
        // ==================================================

        let confirmationMailSent =
            false;

        try {
            confirmationMailSent =
                await sendContactConfirmationMail(
                    email,
                    contactData
                );
        } catch (mailError) {
            console.error(
                "Không thể gửi email xác nhận liên hệ cho khách:",
                mailError
            );
        }

        // ==================================================
        // RESPONSE
        // ==================================================

        return res.status(201).json({
            success: true,

            message:
                "Yêu cầu của bạn đã được gửi thành công. BuildPC sẽ phản hồi trong thời gian sớm nhất.",

            data: {
                contact_code:
                    contactCode,

                category,

                category_label:
                    CONTACT_CATEGORIES[
                    category
                    ],

                email,

                confirmation_mail_sent:
                    confirmationMailSent,
            },
        });
    } catch (error) {
        console.error(
            "Lỗi gửi yêu cầu liên hệ:",
            error
        );

        next(error);
    }
};

// ======================================================
// GET CONTACT OPTIONS
//
// Frontend có thể dùng endpoint này để lấy loại yêu cầu.
// Như vậy không cần hard-code label ở nhiều nơi.
// ======================================================

exports.getContactOptions = async (
    req,
    res,
    next
) => {
    try {
        const categories =
            Object.entries(
                CONTACT_CATEGORIES
            ).map(
                ([value, label]) => ({
                    value,
                    label,
                })
            );

        return res.json({
            success: true,

            message:
                "Lấy danh sách loại yêu cầu thành công",

            data: {
                categories,

                consultation_needs: [
                    {
                        value: "GAMING",
                        label: "Gaming",
                    },
                    {
                        value: "GRAPHICS",
                        label:
                            "Đồ họa / Render",
                    },
                    {
                        value: "OFFICE",
                        label:
                            "Văn phòng",
                    },
                    {
                        value: "PROGRAMMING",
                        label:
                            "Lập trình",
                    },
                    {
                        value: "LIVESTREAM",
                        label:
                            "Livestream",
                    },
                    {
                        value: "AI",
                        label:
                            "AI / Machine Learning",
                    },
                ],
            },
        });
    } catch (error) {
        next(error);
    }
};