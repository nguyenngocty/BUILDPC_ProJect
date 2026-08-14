const nodemailer = require("nodemailer");

// ======================================================
// FORMAT MONEY
// ======================================================

const formatMoney = (value) => {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
};

// ======================================================
// ESCAPE HTML
// ======================================================

const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// ======================================================
// SAFE MAIL SUBJECT
// ======================================================

const sanitizeHeaderText = (value) => {
  return String(value || "")
    .replace(/[\r\n]+/g, " ")
    .trim();
};

// ======================================================
// PAYMENT
// ======================================================

const getPaymentMethodLabel = (method) => {
  switch (method) {
    case "cod":
      return "Thanh toán khi nhận hàng";

    case "bank":
      return "Chuyển khoản ngân hàng";

    case "momo":
      return "Thanh toán MoMo";

    default:
      return "Không xác định";
  }
};

const getPaymentStatusLabel = (status, method) => {
  if (Number(status) === 1) {
    return "Đã thanh toán";
  }

  if (method === "cod") {
    return "Thu khi giao hàng";
  }

  if (method === "bank") {
    return "Chờ xác nhận chuyển khoản";
  }

  return "Chưa thanh toán";
};

// ======================================================
// ORDER STATUS
// ======================================================

const ORDER_STATUS_INFO = {
  PENDING: {
    label: "Chờ xác nhận",
    color: "#f59e0b",
    background: "#fffbeb",
    message:
      "Đơn hàng của bạn đã được tiếp nhận và đang chờ shop xác nhận.",
  },

  PROCESSING: {
    label: "Đang xử lý",
    color: "#2563eb",
    background: "#eff6ff",
    message:
      "Đơn hàng đã được xác nhận và BuildPC đang chuẩn bị sản phẩm cho bạn.",
  },

  SHIPPING: {
    label: "Đang giao hàng",
    color: "#2563eb",
    background: "#eff6ff",
    message:
      "Đơn hàng đã được bàn giao để vận chuyển và đang trên đường giao đến bạn.",
  },

  COMPLETED: {
    label: "Hoàn thành",
    color: "#16a34a",
    background: "#f0fdf4",
    message:
      "Đơn hàng đã được giao thành công. Cảm ơn bạn đã mua hàng tại BuildPC.",
  },

  CANCELLED: {
    label: "Đã hủy",
    color: "#ef233c",
    background: "#fff1f2",
    message:
      "Đơn hàng của bạn đã được cập nhật sang trạng thái hủy.",
  },
};

// ======================================================
// CONTACT / CONSULTATION
// ======================================================

const CONTACT_CATEGORY_LABELS = {
  BUILD_PC: "Tư vấn Build PC",
  UPGRADE: "Tư vấn nâng cấp PC",
  PRODUCT: "Tư vấn sản phẩm / linh kiện",
  ORDER: "Hỗ trợ đơn hàng",
  WARRANTY: "Bảo hành",
  TECHNICAL: "Hỗ trợ kỹ thuật",
  OTHER: "Liên hệ khác",
};

const CONSULTATION_NEED_LABELS = {
  GAMING: "Gaming",
  GRAPHICS: "Đồ họa / Render",
  OFFICE: "Văn phòng",
  PROGRAMMING: "Lập trình",
  LIVESTREAM: "Livestream",
  AI: "AI / Machine Learning",
};

const getContactCategoryLabel = (category) => {
  return (
    CONTACT_CATEGORY_LABELS[
    String(category || "").toUpperCase()
    ] ||
    category ||
    "Liên hệ khác"
  );
};

const getConsultationNeedLabel = (need) => {
  return (
    CONSULTATION_NEED_LABELS[
    String(need || "").toUpperCase()
    ] ||
    need
  );
};

const getContactReceiverEmail = () => {
  return (
    process.env.CONTACT_RECEIVER_EMAIL ||
    process.env.MAIL_FROM_EMAIL ||
    process.env.MAIL_USER
  );
};

// ======================================================
// MAIL CONFIG
// ======================================================

const hasMailConfiguration = () => {
  return Boolean(
    process.env.MAIL_HOST &&
    process.env.MAIL_USER &&
    process.env.MAIL_PASS
  );
};

const getMailFrom = () => {
  const fromName =
    process.env.MAIL_FROM_NAME || "BuildPC";

  const fromEmail =
    process.env.MAIL_FROM_EMAIL ||
    process.env.MAIL_USER;

  return `"${fromName}" <${fromEmail}>`;
};

const createTransporter = () => {
  const port = Number(
    process.env.MAIL_PORT || 587
  );

  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,

    port,

    secure: port === 465,

    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
};

// ======================================================
// ORDER ITEMS HTML
// ======================================================

const buildOrderItemsHtml = (items = []) => {
  if (!items.length) {
    return `
      <tr>
        <td
          colspan="4"
          style="
            padding:12px;
            border:1px solid #e5e7eb;
            text-align:center;
          "
        >
          Không có sản phẩm
        </td>
      </tr>
    `;
  }

  return items
    .map(
      (item, index) => `
        <tr>
          <td
            style="
              padding:12px;
              border:1px solid #e5e7eb;
            "
          >
            ${index + 1}
          </td>

          <td
            style="
              padding:12px;
              border:1px solid #e5e7eb;
            "
          >
            ${escapeHtml(
        item.product_name ||
        "Không có tên"
      )}
          </td>

          <td
            style="
              padding:12px;
              border:1px solid #e5e7eb;
              text-align:center;
            "
          >
            ${Number(item.quantity || 0)}
          </td>

          <td
            style="
              padding:12px;
              border:1px solid #e5e7eb;
              text-align:right;
            "
          >
            ${formatMoney(
        item.total_price
      )}
          </td>
        </tr>
      `
    )
    .join("");
};

// ======================================================
// ORDER CONFIRMATION MAIL
// ======================================================

const sendOrderConfirmationMail = async (
  toEmail,
  order
) => {
  if (!toEmail) {
    return false;
  }

  if (!hasMailConfiguration()) {
    console.warn(
      "Thiếu cấu hình mail trong .env, bỏ qua gửi email."
    );

    return false;
  }

  const transporter =
    createTransporter();

  const paymentMethod =
    order.payment_method_label ||
    getPaymentMethodLabel(
      order.payment_method
    );

  const paymentStatus =
    order.payment_status_label ||
    getPaymentStatusLabel(
      order.payment_status,
      order.payment_method
    );

  const html = `
    <div
      style="
        font-family:Arial,sans-serif;
        background:#f8fafc;
        padding:24px;
        color:#0f172a;
      "
    >
      <div
        style="
          max-width:720px;
          margin:0 auto;
          background:#ffffff;
          border-radius:18px;
          overflow:hidden;
          border:1px solid #e5e7eb;
        "
      >
        <div
          style="
            background:#ef233c;
            color:#ffffff;
            padding:22px 26px;
          "
        >
          <h2 style="margin:0;font-size:24px;">
            Đặt hàng thành công
          </h2>

          <p style="margin:8px 0 0;">
            Cảm ơn bạn đã đặt hàng tại BuildPC.
          </p>
        </div>

        <div style="padding:26px;">
          <h3
            style="
              margin:0 0 14px;
              color:#111827;
            "
          >
            Thông tin đơn hàng
          </h3>

          <p>
            <strong>Mã đơn hàng:</strong>
            ${escapeHtml(order.order_code)}
          </p>

          <p>
            <strong>Khách hàng:</strong>
            ${escapeHtml(order.shipping_name)}
          </p>

          <p>
            <strong>Số điện thoại:</strong>
            ${escapeHtml(order.shipping_phone)}
          </p>

          <p>
            <strong>Địa chỉ:</strong>
            ${escapeHtml(order.shipping_address)}
          </p>

          <p>
            <strong>Phương thức thanh toán:</strong>
            ${escapeHtml(paymentMethod)}
          </p>

          <p>
            <strong>Trạng thái thanh toán:</strong>
            ${escapeHtml(paymentStatus)}
          </p>

          ${order.note
      ? `
                <p>
                  <strong>Ghi chú:</strong>
                  ${escapeHtml(order.note)}
                </p>
              `
      : ""
    }

          <h3
            style="
              margin:24px 0 14px;
              color:#111827;
            "
          >
            Sản phẩm đã đặt
          </h3>

          <table
            style="
              width:100%;
              border-collapse:collapse;
              font-size:14px;
            "
          >
            <thead>
              <tr>
                <th
                  style="
                    padding:12px;
                    border:1px solid #e5e7eb;
                    background:#f1f5f9;
                    text-align:left;
                  "
                >
                  STT
                </th>

                <th
                  style="
                    padding:12px;
                    border:1px solid #e5e7eb;
                    background:#f1f5f9;
                    text-align:left;
                  "
                >
                  Sản phẩm
                </th>

                <th
                  style="
                    padding:12px;
                    border:1px solid #e5e7eb;
                    background:#f1f5f9;
                    text-align:center;
                  "
                >
                  SL
                </th>

                <th
                  style="
                    padding:12px;
                    border:1px solid #e5e7eb;
                    background:#f1f5f9;
                    text-align:right;
                  "
                >
                  Thành tiền
                </th>
              </tr>
            </thead>

            <tbody>
              ${buildOrderItemsHtml(order.items)}
            </tbody>
          </table>

          <div
            style="
              text-align:right;
              margin-top:20px;
              font-size:20px;
              font-weight:800;
              color:#ef233c;
            "
          >
            Tổng tiền:
            ${formatMoney(order.total_amount)}
          </div>

          <div
            style="
              margin-top:24px;
              padding:14px;
              border-radius:12px;
              background:#f8fafc;
              color:#64748b;
              font-size:14px;
            "
          >
            Shop sẽ liên hệ bạn để xác nhận và xử lý
            đơn hàng trong thời gian sớm nhất.
          </div>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: getMailFrom(),
    to: toEmail,
    subject: `Xác nhận đơn hàng ${order.order_code}`,
    html,
  });

  return true;
};

// ======================================================
// ORDER STATUS UPDATE MAIL
// ======================================================

const sendOrderStatusUpdateMail = async (
  toEmail,
  order
) => {
  if (!toEmail || !order) {
    return false;
  }

  if (!hasMailConfiguration()) {
    console.warn(
      "Thiếu cấu hình mail trong .env, bỏ qua gửi email trạng thái đơn hàng."
    );

    return false;
  }

  const transporter =
    createTransporter();

  const status =
    String(
      order.status || ""
    ).toUpperCase();

  const statusInfo =
    ORDER_STATUS_INFO[status] || {
      label:
        order.status_label ||
        status ||
        "Đã cập nhật",

      color: "#2563eb",

      background: "#eff6ff",

      message:
        "Trạng thái đơn hàng của bạn vừa được cập nhật.",
    };

  const paymentMethod =
    order.payment_method_label ||
    getPaymentMethodLabel(
      order.payment_method
    );

  const paymentStatus =
    order.payment_status_label ||
    getPaymentStatusLabel(
      order.payment_status,
      order.payment_method
    );

  const safeOrderCode =
    escapeHtml(
      order.order_code ||
      order.id ||
      ""
    );

  const html = `
    <div
      style="
        margin:0;
        padding:24px;
        background:#f8fafc;
        font-family:Arial,sans-serif;
        color:#0f172a;
      "
    >
      <div
        style="
          max-width:680px;
          margin:0 auto;
          overflow:hidden;
          background:#ffffff;
          border:1px solid #e5e7eb;
          border-radius:18px;
        "
      >
        <div
          style="
            padding:24px 28px;
            background:#ef233c;
            color:#ffffff;
          "
        >
          <div
            style="
              font-size:13px;
              font-weight:700;
              opacity:0.9;
              margin-bottom:6px;
            "
          >
            BUILDPC
          </div>

          <h2
            style="
              margin:0;
              font-size:24px;
            "
          >
            Cập nhật trạng thái đơn hàng
          </h2>

          <p
            style="
              margin:8px 0 0;
              line-height:1.5;
            "
          >
            Đơn hàng #${safeOrderCode}
          </p>
        </div>

        <div style="padding:28px;">
          <p
            style="
              margin-top:0;
              font-size:16px;
              line-height:1.7;
            "
          >
            Xin chào
            <strong>
              ${escapeHtml(
    order.shipping_name ||
    "bạn"
  )}
            </strong>,
          </p>

          <p
            style="
              color:#475569;
              line-height:1.7;
            "
          >
            BuildPC thông báo trạng thái đơn hàng
            của bạn vừa được cập nhật.
          </p>

          <div
            style="
              margin:22px 0;
              padding:20px;
              border-radius:14px;
              border:1px solid ${statusInfo.color}30;
              background:${statusInfo.background};
              text-align:center;
            "
          >
            <div
              style="
                margin-bottom:8px;
                color:#64748b;
                font-size:12px;
                font-weight:700;
                text-transform:uppercase;
                letter-spacing:0.6px;
              "
            >
              Trạng thái hiện tại
            </div>

            <div
              style="
                color:${statusInfo.color};
                font-size:22px;
                font-weight:800;
              "
            >
              ${escapeHtml(
    statusInfo.label
  )}
            </div>

            <p
              style="
                margin:10px 0 0;
                color:#475569;
                line-height:1.6;
                font-size:14px;
              "
            >
              ${escapeHtml(
    statusInfo.message
  )}
            </p>
          </div>

          <div
            style="
              margin-top:24px;
              border:1px solid #e5e7eb;
              border-radius:14px;
              overflow:hidden;
            "
          >
            <div
              style="
                padding:14px 18px;
                background:#f8fafc;
                border-bottom:1px solid #e5e7eb;
                font-weight:800;
              "
            >
              Thông tin đơn hàng
            </div>

            <div style="padding:18px;">
              <p style="margin:0 0 12px;">
                <strong>Mã đơn hàng:</strong>
                ${safeOrderCode}
              </p>

              <p style="margin:0 0 12px;">
                <strong>Người nhận:</strong>
                ${escapeHtml(
    order.shipping_name || ""
  )}
              </p>

              <p style="margin:0 0 12px;">
                <strong>Số điện thoại:</strong>
                ${escapeHtml(
    order.shipping_phone || ""
  )}
              </p>

              <p style="margin:0 0 12px;">
                <strong>Địa chỉ giao hàng:</strong>
                ${escapeHtml(
    order.shipping_address || ""
  )}
              </p>

              <p style="margin:0 0 12px;">
                <strong>Phương thức thanh toán:</strong>
                ${escapeHtml(paymentMethod)}
              </p>

              <p style="margin:0;">
                <strong>Trạng thái thanh toán:</strong>
                ${escapeHtml(paymentStatus)}
              </p>
            </div>
          </div>

          <div
            style="
              margin-top:20px;
              padding:16px 18px;
              border-radius:14px;
              background:#f8fafc;
              text-align:right;
            "
          >
            <span
              style="
                color:#64748b;
                font-size:14px;
              "
            >
              Tổng thanh toán:
            </span>

            <strong
              style="
                margin-left:8px;
                color:#ef233c;
                font-size:20px;
              "
            >
              ${formatMoney(
    order.total_amount
  )}
            </strong>
          </div>

          ${status === "CANCELLED"
      ? `
                <div
                  style="
                    margin-top:20px;
                    padding:14px 16px;
                    border-radius:12px;
                    background:#fff1f2;
                    color:#be123c;
                    line-height:1.6;
                    font-size:14px;
                  "
                >
                  Nếu bạn cần hỗ trợ về đơn hàng đã hủy,
                  vui lòng liên hệ BuildPC để được giải đáp.
                </div>
              `
      : ""
    }

          ${status === "SHIPPING"
      ? `
                <div
                  style="
                    margin-top:20px;
                    padding:14px 16px;
                    border-radius:12px;
                    background:#eff6ff;
                    color:#1d4ed8;
                    line-height:1.6;
                    font-size:14px;
                  "
                >
                  Vui lòng chú ý điện thoại để đơn vị
                  vận chuyển có thể liên hệ khi giao hàng.
                </div>
              `
      : ""
    }

          <p
            style="
              margin:28px 0 0;
              color:#64748b;
              line-height:1.7;
              font-size:14px;
            "
          >
            Cảm ơn bạn đã tin tưởng và mua hàng tại
            <strong>BuildPC</strong>.
          </p>
        </div>
      </div>
    </div>
  `;

  const text = [
    `Xin chào ${order.shipping_name || "bạn"},`,
    "",
    `Đơn hàng #${order.order_code || order.id
    } đã được cập nhật trạng thái: ${statusInfo.label}.`,
    "",
    statusInfo.message,
    "",
    `Tổng thanh toán: ${formatMoney(
      order.total_amount
    )}`,
    `Địa chỉ: ${order.shipping_address || ""
    }`,
    "",
    "Cảm ơn bạn đã mua hàng tại BuildPC.",
  ].join("\n");

  await transporter.sendMail({
    from: getMailFrom(),

    to: toEmail,

    subject:
      `Đơn hàng ${order.order_code || ""} - ` +
      `${statusInfo.label}`,

    text,

    html,
  });

  return true;
};

// ======================================================
// CONTACT REQUEST MAIL
// Gửi yêu cầu của khách về email cửa hàng
// ======================================================

const sendContactRequestMail = async (
  contactData
) => {
  if (!contactData) {
    throw new Error(
      "Không có dữ liệu liên hệ"
    );
  }

  if (!hasMailConfiguration()) {
    throw new Error(
      "Hệ thống chưa được cấu hình email"
    );
  }

  const receiverEmail =
    getContactReceiverEmail();

  if (!receiverEmail) {
    throw new Error(
      "Chưa cấu hình email nhận yêu cầu liên hệ"
    );
  }

  const transporter =
    createTransporter();

  const categoryLabel =
    contactData.category_label ||
    getContactCategoryLabel(
      contactData.category
    );

  const needs = Array.isArray(
    contactData.needs
  )
    ? contactData.needs
      .map(
        getConsultationNeedLabel
      )
      .filter(Boolean)
    : [];

  const hasBudget =
    contactData.budget !== null &&
    contactData.budget !== undefined &&
    Number(contactData.budget) > 0;

  const html = `
    <div
      style="
        margin:0;
        padding:24px;
        background:#f8fafc;
        font-family:Arial,sans-serif;
        color:#0f172a;
      "
    >
      <div
        style="
          max-width:700px;
          margin:0 auto;
          overflow:hidden;
          background:#ffffff;
          border:1px solid #e5e7eb;
          border-radius:18px;
        "
      >
        <!-- HEADER -->

        <div
          style="
            padding:24px 28px;
            background:#ef233c;
            color:#ffffff;
          "
        >
          <div
            style="
              margin-bottom:6px;
              font-size:13px;
              font-weight:700;
              opacity:0.9;
            "
          >
            BUILDPC - LIÊN HỆ & TƯ VẤN
          </div>

          <h2
            style="
              margin:0;
              font-size:24px;
            "
          >
            Có yêu cầu mới từ khách hàng
          </h2>

          <p
            style="
              margin:8px 0 0;
              line-height:1.5;
            "
          >
            Mã yêu cầu:
            <strong>
              ${escapeHtml(
    contactData.contact_code
  )}
            </strong>
          </p>
        </div>

        <!-- BODY -->

        <div style="padding:28px;">
          <!-- CATEGORY -->

          <div
            style="
              margin-bottom:22px;
              padding:16px 18px;
              border-radius:14px;
              background:#fff1f2;
              border:1px solid #fecdd3;
            "
          >
            <div
              style="
                margin-bottom:5px;
                color:#64748b;
                font-size:12px;
                font-weight:700;
                text-transform:uppercase;
              "
            >
              Loại yêu cầu
            </div>

            <strong
              style="
                color:#ef233c;
                font-size:17px;
              "
            >
              ${escapeHtml(
    categoryLabel
  )}
            </strong>
          </div>

          <!-- CUSTOMER -->

          <h3
            style="
              margin:0 0 14px;
              font-size:17px;
            "
          >
            Thông tin khách hàng
          </h3>

          <div
            style="
              padding:18px;
              border:1px solid #e5e7eb;
              border-radius:14px;
              background:#ffffff;
            "
          >
            <p style="margin:0 0 12px;">
              <strong>
                Họ và tên:
              </strong>

              ${escapeHtml(
    contactData.name
  )}
            </p>

            <p style="margin:0 0 12px;">
              <strong>
                Email:
              </strong>

              ${escapeHtml(
    contactData.email
  )}
            </p>

            <p style="margin:0;">
              <strong>
                Số điện thoại:
              </strong>

              ${escapeHtml(
    contactData.phone
  )}
            </p>
          </div>

          <!-- REQUEST -->

          <h3
            style="
              margin:24px 0 14px;
              font-size:17px;
            "
          >
            Nội dung yêu cầu
          </h3>

          <div
            style="
              overflow:hidden;
              border:1px solid #e5e7eb;
              border-radius:14px;
            "
          >
            <div
              style="
                padding:14px 18px;
                background:#f8fafc;
                border-bottom:1px solid #e5e7eb;
              "
            >
              <strong>
                ${escapeHtml(
    contactData.subject
  )}
              </strong>
            </div>

            <div style="padding:18px;">
              ${contactData.order_code
      ? `
                    <p style="margin:0 0 12px;">
                      <strong>
                        Mã đơn hàng:
                      </strong>

                      ${escapeHtml(
        contactData.order_code
      )}
                    </p>
                  `
      : ""
    }

              ${hasBudget
      ? `
                    <p style="margin:0 0 12px;">
                      <strong>
                        Ngân sách dự kiến:
                      </strong>

                      ${formatMoney(
        contactData.budget
      )}
                    </p>
                  `
      : ""
    }

              ${needs.length > 0
      ? `
                    <p style="margin:0 0 12px;">
                      <strong>
                        Nhu cầu sử dụng:
                      </strong>

                      ${escapeHtml(
        needs.join(", ")
      )}
                    </p>
                  `
      : ""
    }

              <div
                style="
                  margin-top:14px;
                  padding:16px;
                  border-radius:12px;
                  background:#f8fafc;
                  color:#334155;
                  line-height:1.7;
                  white-space:pre-line;
                "
              >
                ${escapeHtml(
      contactData.message
    )}
              </div>
            </div>
          </div>

          <!-- REPLY NOTICE -->

          <div
            style="
              margin-top:22px;
              padding:14px 16px;
              border-radius:12px;
              background:#eff6ff;
              color:#1d4ed8;
              font-size:14px;
              line-height:1.6;
            "
          >
            Bạn có thể phản hồi trực tiếp email này để trả lời
            khách hàng tại
            <strong>
              ${escapeHtml(
      contactData.email
    )}
            </strong>.
          </div>

          <p
            style="
              margin:22px 0 0;
              color:#94a3b8;
              font-size:12px;
            "
          >
            Thời gian gửi:
            ${escapeHtml(
      contactData.created_at ||
      new Date().toISOString()
    )}
          </p>
        </div>
      </div>
    </div>
  `;

  const text = [
    "BUILDPC - YÊU CẦU LIÊN HỆ / TƯ VẤN MỚI",
    "",
    `Mã yêu cầu: ${contactData.contact_code}`,
    `Loại yêu cầu: ${categoryLabel}`,
    "",
    `Khách hàng: ${contactData.name}`,
    `Email: ${contactData.email}`,
    `Số điện thoại: ${contactData.phone}`,
    "",
    `Tiêu đề: ${contactData.subject}`,
    contactData.order_code
      ? `Mã đơn hàng: ${contactData.order_code}`
      : null,
    hasBudget
      ? `Ngân sách: ${formatMoney(
        contactData.budget
      )}`
      : null,
    needs.length
      ? `Nhu cầu: ${needs.join(", ")}`
      : null,
    "",
    "Nội dung:",
    contactData.message,
  ]
    .filter(
      (line) =>
        line !== null &&
        line !== undefined
    )
    .join("\n");

  const safeSubject =
    sanitizeHeaderText(
      contactData.subject
    );

  await transporter.sendMail({
    from: getMailFrom(),

    to: receiverEmail,

    // Khi shop bấm Reply trong Gmail
    // sẽ trả lời thẳng email khách.
    replyTo:
      contactData.email,

    subject:
      `[BuildPC - ${sanitizeHeaderText(
        categoryLabel
      )}] ${safeSubject}`,

    text,

    html,
  });

  return true;
};

// ======================================================
// CONTACT CONFIRMATION MAIL
// Gửi email xác nhận cho khách
// ======================================================

const sendContactConfirmationMail = async (
  toEmail,
  contactData
) => {
  if (
    !toEmail ||
    !contactData
  ) {
    return false;
  }

  if (!hasMailConfiguration()) {
    console.warn(
      "Thiếu cấu hình mail trong .env, bỏ qua gửi email xác nhận liên hệ."
    );

    return false;
  }

  const transporter =
    createTransporter();

  const categoryLabel =
    contactData.category_label ||
    getContactCategoryLabel(
      contactData.category
    );

  const needs = Array.isArray(
    contactData.needs
  )
    ? contactData.needs
      .map(
        getConsultationNeedLabel
      )
      .filter(Boolean)
    : [];

  const hasBudget =
    contactData.budget !== null &&
    contactData.budget !== undefined &&
    Number(contactData.budget) > 0;

  const html = `
    <div
      style="
        margin:0;
        padding:24px;
        background:#f8fafc;
        font-family:Arial,sans-serif;
        color:#0f172a;
      "
    >
      <div
        style="
          max-width:660px;
          margin:0 auto;
          overflow:hidden;
          background:#ffffff;
          border:1px solid #e5e7eb;
          border-radius:18px;
        "
      >
        <!-- HEADER -->

        <div
          style="
            padding:26px 28px;
            background:#ef233c;
            color:#ffffff;
          "
        >
          <div
            style="
              margin-bottom:6px;
              font-size:13px;
              font-weight:700;
              opacity:0.9;
            "
          >
            BUILDPC
          </div>

          <h2
            style="
              margin:0;
              font-size:24px;
            "
          >
            Đã tiếp nhận yêu cầu của bạn
          </h2>

          <p
            style="
              margin:8px 0 0;
              line-height:1.6;
            "
          >
            Cảm ơn bạn đã liên hệ với BuildPC.
          </p>
        </div>

        <!-- BODY -->

        <div style="padding:28px;">
          <p
            style="
              margin-top:0;
              font-size:16px;
              line-height:1.7;
            "
          >
            Xin chào
            <strong>
              ${escapeHtml(
    contactData.name ||
    "bạn"
  )}
            </strong>,
          </p>

          <p
            style="
              color:#475569;
              line-height:1.7;
            "
          >
            BuildPC đã nhận được yêu cầu của bạn.
            Đội ngũ hỗ trợ sẽ kiểm tra và phản hồi
            trong thời gian sớm nhất.
          </p>

          <!-- CONTACT CODE -->

          <div
            style="
              margin:22px 0;
              padding:20px;
              border-radius:14px;
              background:#fff1f2;
              border:1px solid #fecdd3;
              text-align:center;
            "
          >
            <div
              style="
                margin-bottom:7px;
                color:#64748b;
                font-size:12px;
                font-weight:700;
                text-transform:uppercase;
                letter-spacing:0.5px;
              "
            >
              Mã yêu cầu hỗ trợ
            </div>

            <strong
              style="
                color:#ef233c;
                font-size:22px;
                letter-spacing:0.4px;
              "
            >
              ${escapeHtml(
    contactData.contact_code
  )}
            </strong>
          </div>

          <!-- INFO -->

          <div
            style="
              overflow:hidden;
              border:1px solid #e5e7eb;
              border-radius:14px;
            "
          >
            <div
              style="
                padding:14px 18px;
                background:#f8fafc;
                border-bottom:1px solid #e5e7eb;
                font-weight:800;
              "
            >
              Nội dung đã gửi
            </div>

            <div style="padding:18px;">
              <p style="margin:0 0 12px;">
                <strong>
                  Loại yêu cầu:
                </strong>

                ${escapeHtml(
    categoryLabel
  )}
              </p>

              <p style="margin:0 0 12px;">
                <strong>
                  Tiêu đề:
                </strong>

                ${escapeHtml(
    contactData.subject
  )}
              </p>

              ${contactData.order_code
      ? `
                    <p style="margin:0 0 12px;">
                      <strong>
                        Mã đơn hàng:
                      </strong>

                      ${escapeHtml(
        contactData.order_code
      )}
                    </p>
                  `
      : ""
    }

              ${hasBudget
      ? `
                    <p style="margin:0 0 12px;">
                      <strong>
                        Ngân sách dự kiến:
                      </strong>

                      ${formatMoney(
        contactData.budget
      )}
                    </p>
                  `
      : ""
    }

              ${needs.length
      ? `
                    <p style="margin:0 0 12px;">
                      <strong>
                        Nhu cầu:
                      </strong>

                      ${escapeHtml(
        needs.join(", ")
      )}
                    </p>
                  `
      : ""
    }

              <div
                style="
                  margin-top:16px;
                  padding:15px;
                  border-radius:12px;
                  background:#f8fafc;
                  color:#475569;
                  line-height:1.7;
                  white-space:pre-line;
                "
              >
                ${escapeHtml(
      contactData.message
    )}
              </div>
            </div>
          </div>

          <!-- NOTICE -->

          <div
            style="
              margin-top:22px;
              padding:14px 16px;
              border-radius:12px;
              background:#eff6ff;
              color:#1d4ed8;
              line-height:1.65;
              font-size:14px;
            "
          >
            BuildPC sẽ phản hồi qua địa chỉ email này.
            Nếu cần hỗ trợ gấp, bạn có thể liên hệ Hotline
            của cửa hàng.
          </div>

          <p
            style="
              margin:28px 0 0;
              color:#64748b;
              font-size:14px;
              line-height:1.7;
            "
          >
            Cảm ơn bạn đã quan tâm đến
            <strong>BuildPC</strong>.
          </p>
        </div>
      </div>
    </div>
  `;

  const text = [
    `Xin chào ${contactData.name || "bạn"},`,
    "",
    "BuildPC đã tiếp nhận yêu cầu của bạn.",
    "",
    `Mã yêu cầu: ${contactData.contact_code}`,
    `Loại yêu cầu: ${categoryLabel}`,
    `Tiêu đề: ${contactData.subject}`,
    "",
    "Nội dung:",
    contactData.message,
    "",
    "BuildPC sẽ phản hồi qua email trong thời gian sớm nhất.",
    "",
    "Cảm ơn bạn đã liên hệ với BuildPC.",
  ].join("\n");

  await transporter.sendMail({
    from: getMailFrom(),

    to: toEmail,

    subject:
      `BuildPC đã tiếp nhận yêu cầu ` +
      `${contactData.contact_code}`,

    text,

    html,
  });

  return true;
};

// ======================================================
// PASSWORD RESET MAIL
// ======================================================

const sendPasswordResetMail = async ({
  toEmail,
  fullName,
  resetUrl,
  expiresInMinutes = 15,
}) => {
  if (
    !toEmail ||
    !resetUrl
  ) {
    return false;
  }

  if (!hasMailConfiguration()) {
    console.warn(
      "Thiếu cấu hình mail trong .env, không thể gửi email đặt lại mật khẩu."
    );

    return false;
  }

  const transporter =
    createTransporter();

  const safeFullName =
    escapeHtml(
      fullName || "bạn"
    );

  const safeResetUrl =
    escapeHtml(resetUrl);

  const safeExpires =
    Number(
      expiresInMinutes || 15
    );

  const html = `
    <div
      style="
        font-family:Arial,sans-serif;
        background:#f8fafc;
        padding:24px;
        color:#0f172a;
      "
    >
      <div
        style="
          max-width:620px;
          margin:0 auto;
          background:#ffffff;
          border-radius:18px;
          overflow:hidden;
          border:1px solid #e5e7eb;
        "
      >
        <div
          style="
            background:#ef233c;
            color:#ffffff;
            padding:24px 28px;
          "
        >
          <h2
            style="
              margin:0;
              font-size:24px;
            "
          >
            Đặt lại mật khẩu
          </h2>

          <p style="margin:8px 0 0;">
            Yêu cầu bảo mật từ tài khoản BuildPC
          </p>
        </div>

        <div style="padding:28px;">
          <p style="margin-top:0;">
            Xin chào
            <strong>
              ${safeFullName}
            </strong>,
          </p>

          <p
            style="
              line-height:1.65;
              color:#475569;
            "
          >
            BuildPC nhận được yêu cầu đặt lại mật khẩu
            cho tài khoản sử dụng email này.
          </p>

          <div
            style="
              text-align:center;
              margin:28px 0;
            "
          >
            <a
              href="${safeResetUrl}"
              style="
                display:inline-block;
                padding:14px 24px;
                border-radius:10px;
                background:#ef233c;
                color:#ffffff;
                font-weight:700;
                text-decoration:none;
              "
            >
              Đặt lại mật khẩu
            </a>
          </div>

          <p
            style="
              line-height:1.65;
              color:#475569;
            "
          >
            Liên kết này có hiệu lực trong
            <strong>
              ${safeExpires} phút
            </strong>
            và chỉ sử dụng được một lần.
          </p>

          <p
            style="
              line-height:1.65;
              color:#475569;
            "
          >
            Nếu nút phía trên không hoạt động,
            hãy sao chép liên kết sau và mở trong trình duyệt:
          </p>

          <p
            style="
              padding:12px;
              border-radius:10px;
              background:#f1f5f9;
              color:#334155;
              font-size:13px;
              word-break:break-all;
            "
          >
            ${safeResetUrl}
          </p>

          <div
            style="
              margin-top:24px;
              padding:14px;
              border-radius:12px;
              background:#fff7ed;
              color:#9a3412;
              font-size:14px;
              line-height:1.55;
            "
          >
            Nếu bạn không yêu cầu đặt lại mật khẩu,
            hãy bỏ qua email này. Mật khẩu hiện tại
            vẫn được giữ nguyên.
          </div>
        </div>
      </div>
    </div>
  `;

  const text = [
    `Xin chào ${fullName || "bạn"},`,
    "",
    "BuildPC nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.",
    `Mở liên kết sau để đặt lại mật khẩu: ${resetUrl}`,
    `Liên kết có hiệu lực trong ${safeExpires} phút và chỉ sử dụng được một lần.`,
    "",
    "Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.",
  ].join("\n");

  await transporter.sendMail({
    from: getMailFrom(),

    to: toEmail,

    subject:
      "Đặt lại mật khẩu tài khoản BuildPC",

    text,

    html,
  });

  return true;
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  // Order
  sendOrderConfirmationMail,
  sendOrderStatusUpdateMail,

  // Contact / Consultation
  sendContactRequestMail,
  sendContactConfirmationMail,

  // Password
  sendPasswordResetMail,
};