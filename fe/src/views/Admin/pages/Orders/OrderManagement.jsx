import React, { useEffect, useState } from "react";

import orderService from "../../../../services/orderService";

import "./OrderManagement.css";

// =========================================================
// ORDER STATUS
// =========================================================

const STATUS_OPTIONS = {
  PENDING: "Chờ xác nhận",
  PROCESSING: "Đang xử lý",
  SHIPPING: "Đang giao",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

const STATUS_FLOW = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPING", "CANCELLED"],
  SHIPPING: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const IMAGE_BASE_URL =
  process.env.REACT_APP_API_URL?.replace("/api", "") || "http://localhost:5000";

// =========================================================
// HELPERS
// =========================================================

const getNextStatusOptions = (order) => {
  const backendStatuses = Array.isArray(order?.allowed_next_statuses)
    ? order.allowed_next_statuses
    : null;

  const nextStatuses =
    backendStatuses !== null
      ? backendStatuses
      : STATUS_FLOW[order?.status] || [];

  return nextStatuses.map((status) => ({
    value: status,
    label: STATUS_OPTIONS[status] || status,
  }));
};

const isFinalStatus = (status) => {
  return status === "COMPLETED" || status === "CANCELLED";
};

// =========================================================
// STATUS META
// =========================================================

const getStatusMeta = (status) => {
  switch (status) {
    case "PENDING":
      return {
        type: "pending",
        icon: "bi-clock-history",
        label: STATUS_OPTIONS.PENDING,
      };

    case "PROCESSING":
      return {
        type: "processing",
        icon: "bi-arrow-repeat",
        label: STATUS_OPTIONS.PROCESSING,
      };

    case "SHIPPING":
      return {
        type: "shipping",
        icon: "bi-truck",
        label: STATUS_OPTIONS.SHIPPING,
      };

    case "COMPLETED":
      return {
        type: "completed",
        icon: "bi-check-circle-fill",
        label: STATUS_OPTIONS.COMPLETED,
      };

    case "CANCELLED":
      return {
        type: "cancelled",
        icon: "bi-x-circle-fill",
        label: STATUS_OPTIONS.CANCELLED,
      };

    default:
      return {
        type: "inactive",
        icon: "bi-question-circle",
        label: "Không xác định",
      };
  }
};

// =========================================================
// PAYMENT METHOD
// =========================================================

const getPaymentMethodMeta = (method) => {
  switch (String(method || "").toLowerCase()) {
    case "cod":
      return {
        type: "cod",
        icon: "bi-cash-coin",
        label: "COD",
      };

    case "bank":
      return {
        type: "bank",
        icon: "bi-bank",
        label: "Chuyển khoản",
      };

    case "momo":
      return {
        type: "momo",
        icon: "bi-wallet2",
        label: "MoMo",
      };

    case "zalopay":
      return {
        type: "zalopay",
        icon: "bi-wallet2",
        label: "ZaloPay",
      };

    default:
      return {
        type: "unknown",
        icon: "bi-question-circle",
        label: "Không rõ",
      };
  }
};

// =========================================================
// PAYMENT STATUS
// =========================================================

const getPaymentStatusMeta = (paymentStatus, paymentMethod) => {
  if (Number(paymentStatus) === 1) {
    return {
      type: "paid",
      icon: "bi-check-circle-fill",
      label: "Đã thanh toán",
    };
  }

  if (paymentMethod === "cod") {
    return {
      type: "pending",
      icon: "bi-cash-stack",
      label: "Thu khi giao",
    };
  }

  if (paymentMethod === "bank") {
    return {
      type: "pending",
      icon: "bi-hourglass-split",
      label: "Chờ xác nhận",
    };
  }

  return {
    type: "unpaid",
    icon: "bi-exclamation-circle",
    label: "Chưa thanh toán",
  };
};

// =========================================================
// FORMAT
// =========================================================

const formatMoney = (value) => {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
};

const formatDateTime = (value) => {
  if (!value) {
    return "Không có";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
};

const getProductCode = (item) => {
  return item?.sku || item?.product_sku || item?.product_id || "N/A";
};

const getImageUrl = (imageUrl) => {
  if (!imageUrl) {
    return "/images/no-image.png";
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return `${IMAGE_BASE_URL}${imageUrl}`;
};

// =========================================================
// COMPONENT
// =========================================================

const OrderManagement = () => {
  // =======================================================
  // DATA
  // =======================================================

  const [orders, setOrders] = useState([]);

  const [selectedOrder, setSelectedOrder] = useState(null);

  // =======================================================
  // FILTER
  // =======================================================

  const [keyword, setKeyword] = useState("");

  const [status, setStatus] = useState("");

  const [fromDate, setFromDate] = useState("");

  const [toDate, setToDate] = useState("");

  // =======================================================
  // LOADING
  // =======================================================

  const [loading, setLoading] = useState(false);

  const [statusUpdating, setStatusUpdating] = useState(false);

  // =======================================================
  // PAGINATION
  // =======================================================

  const [page, setPage] = useState(1);

  const [limit, setLimit] = useState(10);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // =======================================================
  // STATUS CONFIRM MODAL
  // =======================================================

  const [statusConfirm, setStatusConfirm] = useState({
    open: false,
    order: null,
    nextStatus: "",
  });

  // =======================================================
  // TOAST
  // =======================================================

  const [toast, setToast] = useState(null);

  const showToast = (type, title, message = "") => {
    setToast({
      id: Date.now(),
      type,
      title,
      message,
    });
  };

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 4200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  // =======================================================
  // ESC CLOSE MODAL
  // =======================================================

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (statusConfirm.open && !statusUpdating) {
        setStatusConfirm({
          open: false,
          order: null,
          nextStatus: "",
        });
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [statusConfirm.open, statusUpdating]);

  // =======================================================
  // PAGINATION FALLBACK
  // =======================================================

  const buildPaginationFallback = (resData, nextPage, nextLimit) => {
    const dataLength = resData.data?.length || 0;

    const total = Number(resData.total ?? dataLength);

    const totalPages = total > 0 ? Math.ceil(total / nextLimit) : 0;

    return {
      page: nextPage,
      limit: nextLimit,
      total,
      totalPages,
    };
  };

  // =======================================================
  // FETCH ORDERS
  // =======================================================

  const fetchOrders = async (customFilters = {}) => {
    try {
      setLoading(true);

      const nextPage = customFilters.page ?? page;

      const nextLimit = customFilters.limit ?? limit;

      const filters = {
        keyword:
          customFilters.keyword !== undefined ? customFilters.keyword : keyword,

        status:
          customFilters.status !== undefined ? customFilters.status : status,

        from_date:
          customFilters.from_date !== undefined
            ? customFilters.from_date
            : fromDate,

        to_date:
          customFilters.to_date !== undefined ? customFilters.to_date : toDate,

        page: nextPage,

        limit: nextLimit,
      };

      const res = await orderService.getAll(filters);

      const resData = res.data || {};

      setOrders(Array.isArray(resData.data) ? resData.data : []);

      const nextPagination =
        resData.pagination ||
        buildPaginationFallback(resData, nextPage, nextLimit);

      setPagination({
        page: Number(nextPagination.page || nextPage),

        limit: Number(nextPagination.limit || nextLimit),

        total: Number(nextPagination.total || 0),

        totalPages: Number(nextPagination.totalPages || 0),
      });

      setPage(nextPage);

      setLimit(nextLimit);
    } catch (error) {
      console.error("[OrderManagement.fetchOrders]", error);

      showToast(
        "error",
        "Không thể tải đơn hàng",
        error.response?.data?.message ||
          "Đã xảy ra lỗi khi tải danh sách đơn hàng.",
      );
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // FIRST LOAD
  // =======================================================

  useEffect(() => {
    fetchOrders({
      keyword: "",
      status: "",
      from_date: "",
      to_date: "",
      page: 1,
      limit: 10,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =======================================================
  // FILTER
  // =======================================================

  const handleFilter = () => {
    if (fromDate && toDate && fromDate > toDate) {
      showToast(
        "warning",
        "Khoảng thời gian không hợp lệ",
        'Ngày "Từ ngày" không được lớn hơn ngày "Đến ngày".',
      );

      return;
    }

    setSelectedOrder(null);

    fetchOrders({
      page: 1,
      limit,
    });
  };

  const handleReset = () => {
    setKeyword("");

    setStatus("");

    setFromDate("");

    setToDate("");

    setSelectedOrder(null);

    setPage(1);

    fetchOrders({
      keyword: "",
      status: "",
      from_date: "",
      to_date: "",
      page: 1,
      limit,
    });

    showToast(
      "info",
      "Đã làm mới bộ lọc",
      "Danh sách đơn hàng đã được tải lại.",
    );
  };

  // =======================================================
  // PAGE
  // =======================================================

  const handleChangePage = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) {
      return;
    }

    fetchOrders({
      page: newPage,
      limit,
    });
  };

  const handleChangeLimit = (event) => {
    const newLimit = Number(event.target.value);

    setLimit(newLimit);

    setPage(1);

    fetchOrders({
      page: 1,
      limit: newLimit,
    });
  };

  // =======================================================
  // PAGE NUMBERS
  // =======================================================

  const renderPageNumbers = () => {
    const totalPages = pagination.totalPages || 0;

    const currentPage = pagination.page || page;

    if (totalPages <= 0) {
      return [];
    }

    if (totalPages <= 7) {
      return Array.from(
        {
          length: totalPages,
        },
        (_, index) => index + 1,
      );
    }

    const pages = [1];

    if (currentPage > 4) {
      pages.push("...");
    }

    const start = Math.max(2, currentPage - 1);

    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
      pages.push(pageNumber);
    }

    if (currentPage < totalPages - 3) {
      pages.push("...");
    }

    pages.push(totalPages);

    return pages;
  };

  // =======================================================
  // VIEW DETAIL
  // =======================================================

  const handleViewDetail = async (id) => {
    try {
      const res = await orderService.getById(id);

      setSelectedOrder(res.data.data);

      window.setTimeout(() => {
        const detailElement = document.querySelector(".adm-order-detail-card");

        if (detailElement) {
          detailElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 100);
    } catch (error) {
      console.error("[OrderManagement.handleViewDetail]", error);

      showToast(
        "error",
        "Không thể mở chi tiết",
        error.response?.data?.message ||
          "Không thể lấy thông tin chi tiết đơn hàng.",
      );
    }
  };

  // =======================================================
  // OPEN STATUS CONFIRM
  // =======================================================

  const handleRequestStatusChange = (order, newStatus) => {
    if (!order || !newStatus) {
      return;
    }

    setStatusConfirm({
      open: true,
      order,
      nextStatus: newStatus,
    });
  };

  // =======================================================
  // CLOSE STATUS CONFIRM
  // =======================================================

  const closeStatusConfirm = () => {
    if (statusUpdating) {
      return;
    }

    setStatusConfirm({
      open: false,
      order: null,
      nextStatus: "",
    });
  };

  // =======================================================
  // CONFIRM UPDATE STATUS
  // =======================================================

  const confirmUpdateStatus = async () => {
    const targetOrder = statusConfirm.order;

    const newStatus = statusConfirm.nextStatus;

    if (!targetOrder?.id || !newStatus) {
      return;
    }

    try {
      setStatusUpdating(true);

      const response = await orderService.updateStatus(
        targetOrder.id,
        newStatus,
      );

      const updatedOrder = response.data?.data || null;

      setStatusConfirm({
        open: false,
        order: null,
        nextStatus: "",
      });

      if (selectedOrder?.id === targetOrder.id) {
        if (updatedOrder) {
          setSelectedOrder(updatedOrder);
        } else {
          try {
            const detailRes = await orderService.getById(targetOrder.id);

            setSelectedOrder(detailRes.data.data);
          } catch (detailError) {
            console.error("[OrderManagement.reloadDetail]", detailError);
          }
        }
      }

      await fetchOrders({
        keyword,
        status,
        from_date: fromDate,
        to_date: toDate,
        page,
        limit,
      });

      showToast(
        "success",
        "Cập nhật trạng thái thành công",
        `Đơn ${targetOrder.order_code} đã chuyển sang "${STATUS_OPTIONS[newStatus] || newStatus}".`,
      );
    } catch (error) {
      console.error("[OrderManagement.confirmUpdateStatus]", error);

      showToast(
        "error",
        "Không thể cập nhật trạng thái",
        error.response?.data?.message ||
          "Đã xảy ra lỗi khi cập nhật trạng thái đơn hàng.",
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  // =======================================================
  // EXPORT INVOICE
  // =======================================================

  const handleExportInvoice = async (id) => {
    try {
      const res = await orderService.getInvoice(id);

      const invoice = res.data.data;

      const order = invoice.order;

      const printWindow = window.open("", "_blank");

      if (!printWindow) {
        showToast(
          "warning",
          "Trình duyệt đang chặn cửa sổ in",
          "Vui lòng cho phép popup cho website rồi thử xuất hóa đơn lại.",
        );

        return;
      }

      const html = `
          <html>
            <head>
              <meta charset="UTF-8" />

              <title>
                Hóa đơn ${invoice.invoice_code}
              </title>

              <style>
                * {
                  box-sizing: border-box;
                }

                body {
                  margin: 0;
                  padding: 34px;
                  color: #1f2937;
                  background: #ffffff;
                  font-family: Arial, sans-serif;
                }

                .invoice-brand {
                  margin-bottom: 4px;
                  color: #ef233c;
                  font-size: 14px;
                  font-weight: 800;
                  text-align: center;
                  text-transform: uppercase;
                }

                h1 {
                  margin: 0 0 6px;
                  color: #0f172a;
                  font-size: 28px;
                  text-align: center;
                }

                .invoice-subtitle {
                  margin-bottom: 28px;
                  color: #64748b;
                  text-align: center;
                }

                .invoice-info {
                  margin-bottom: 22px;
                  line-height: 1.8;
                }

                .invoice-table {
                  width: 100%;
                  margin-top: 20px;
                  border-collapse: collapse;
                }

                .invoice-table th,
                .invoice-table td {
                  padding: 10px;
                  border: 1px solid #e2e8f0;
                  text-align: left;
                  vertical-align: top;
                }

                .invoice-table th {
                  color: #475569;
                  background: #f8fafc;
                  font-size: 12px;
                  text-transform: uppercase;
                }

                .variant-name {
                  display: block;
                  margin-top: 4px;
                  color: #64748b;
                  font-size: 12px;
                }

                .variant-option {
                  display: inline-block;
                  margin-top: 4px;
                  margin-right: 6px;
                  padding: 3px 6px;
                  border-radius: 4px;
                  background: #f1f5f9;
                  color: #475569;
                  font-size: 11px;
                }

                .invoice-summary {
                  width: 360px;
                  max-width: 100%;
                  margin-top: 24px;
                  margin-left: auto;
                }

                .invoice-summary-row {
                  display: flex;
                  justify-content: space-between;
                  gap: 20px;
                  padding: 6px 0;
                }

                .invoice-summary-total {
                  margin-top: 7px;
                  padding-top: 12px;
                  border-top: 1px solid #e2e8f0;
                  color: #ef233c;
                  font-size: 20px;
                  font-weight: 800;
                }

                .invoice-footer {
                  margin-top: 40px;
                  color: #64748b;
                  font-size: 13px;
                  text-align: center;
                }
              </style>
            </head>

            <body>
              <div class="invoice-brand">
                TechYouth BuildPC
              </div>

              <h1>
                HÓA ĐƠN BÁN HÀNG
              </h1>

              <div class="invoice-subtitle">
                ${invoice.invoice_code}
              </div>

              <div class="invoice-info">
                <div>
                  <strong>Mã đơn hàng:</strong>
                  ${order.order_code}
                </div>

                <div>
                  <strong>Ngày xuất:</strong>
                  ${new Date(invoice.exported_at).toLocaleString("vi-VN")}
                </div>

                <div>
                  <strong>Khách hàng:</strong>
                  ${invoice.customer?.name || "Không có"}
                </div>

                <div>
                  <strong>Số điện thoại:</strong>
                  ${invoice.customer?.phone || "Không có"}
                </div>

                ${
                  invoice.customer?.email
                    ? `
                      <div>
                        <strong>Email:</strong>
                        ${invoice.customer.email}
                      </div>
                    `
                    : ""
                }

                <div>
                  <strong>Địa chỉ:</strong>
                  ${invoice.customer?.address || "Không có"}
                </div>

                <div>
                  <strong>Phương thức thanh toán:</strong>
                  ${invoice.summary?.payment_method || "Không xác định"}
                </div>

                <div>
                  <strong>Trạng thái thanh toán:</strong>
                  ${invoice.summary?.payment_status || "Không xác định"}
                </div>

                ${
                  invoice.summary?.transaction_code
                    ? `
                      <div>
                        <strong>Mã giao dịch:</strong>
                        ${invoice.summary.transaction_code}
                      </div>
                    `
                    : ""
                }

                ${
                  invoice.summary?.paid_at
                    ? `
                      <div>
                        <strong>Thời gian thanh toán:</strong>
                        ${new Date(invoice.summary.paid_at).toLocaleString(
                          "vi-VN",
                        )}
                      </div>
                    `
                    : ""
                }
              </div>

              <table class="invoice-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>SKU</th>
                    <th>Sản phẩm</th>
                    <th>Giá</th>
                    <th>SL</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>

                <tbody>
                  ${(invoice.items || [])
                    .map(
                      (item, index) => `
                        <tr>
                          <td>
                            ${index + 1}
                          </td>

                          <td>
                            ${getProductCode(item)}
                          </td>

                          <td>
                            <strong>
                              ${item.product_name || "Sản phẩm"}
                            </strong>

                            ${
                              item.variant_name
                                ? `
                                  <span class="variant-name">
                                    Biến thể: ${item.variant_name}
                                  </span>
                                `
                                : ""
                            }

                            ${
                              Array.isArray(item.variant_options)
                                ? item.variant_options
                                    .map(
                                      (option) => `
                                        <span class="variant-option">
                                          ${
                                            option.option_name ||
                                            option.option_code ||
                                            "Thuộc tính"
                                          }:
                                          ${option.label || option.value || ""}
                                        </span>
                                      `,
                                    )
                                    .join("")
                                : ""
                            }
                          </td>

                          <td>
                            ${Number(item.price || 0).toLocaleString("vi-VN")} đ
                          </td>

                          <td>
                            ${item.quantity || 0}
                          </td>

                          <td>
                            ${Number(item.total_price || 0).toLocaleString(
                              "vi-VN",
                            )} đ
                          </td>
                        </tr>
                      `,
                    )
                    .join("")}
                </tbody>
              </table>

              <div class="invoice-summary">
                <div class="invoice-summary-row">
                  <span>Tạm tính</span>

                  <strong>
                    ${Number(
                      invoice.summary?.subtotal || order.subtotal || 0,
                    ).toLocaleString("vi-VN")} đ
                  </strong>
                </div>

                <div class="invoice-summary-row">
                  <span>Phí vận chuyển</span>

                  <strong>
                    ${Number(invoice.summary?.shipping_fee || 0).toLocaleString(
                      "vi-VN",
                    )} đ
                  </strong>
                </div>

                <div class="invoice-summary-row">
                  <span>Giảm giá</span>

                  <strong>
                    -${Number(
                      invoice.summary?.discount_amount || 0,
                    ).toLocaleString("vi-VN")} đ
                  </strong>
                </div>

                <div class="invoice-summary-row invoice-summary-total">
                  <span>Tổng thanh toán</span>

                  <span>
                    ${Number(
                      invoice.summary?.total_amount || order.total_amount || 0,
                    ).toLocaleString("vi-VN")} đ
                  </span>
                </div>
              </div>

              <div class="invoice-footer">
                Cảm ơn quý khách đã mua hàng tại TechYouth BuildPC!
              </div>

              <script>
                window.onload = function() {
                  window.print();
                };
              </script>
            </body>
          </html>
        `;

      printWindow.document.open();

      printWindow.document.write(html);

      printWindow.document.close();
    } catch (error) {
      console.error("[OrderManagement.handleExportInvoice]", error);

      showToast(
        "error",
        "Không thể xuất hóa đơn",
        error.response?.data?.message ||
          "Đã xảy ra lỗi khi tải dữ liệu hóa đơn.",
      );
    }
  };

  // =======================================================
  // MODAL STATUS META
  // =======================================================

  const currentStatusMeta = statusConfirm.order
    ? getStatusMeta(statusConfirm.order.status)
    : null;

  const nextStatusMeta = statusConfirm.nextStatus
    ? getStatusMeta(statusConfirm.nextStatus)
    : null;

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="adm-order-page">
      {/* ===================================================
          TOAST
          =================================================== */}

      {toast && (
        <div
          className={`adm-order-toast adm-order-toast--${toast.type}`}
          role="status"
          aria-live="polite"
        >
          <span className="adm-order-toast__icon">
            <i
              className={[
                "bi",
                toast.type === "success"
                  ? "bi-check-circle-fill"
                  : toast.type === "error"
                    ? "bi-x-circle-fill"
                    : toast.type === "warning"
                      ? "bi-exclamation-triangle-fill"
                      : "bi-info-circle-fill",
              ].join(" ")}
            />
          </span>

          <div className="adm-order-toast__content">
            <strong>{toast.title}</strong>

            {toast.message && <p>{toast.message}</p>}
          </div>

          <button
            type="button"
            className="adm-order-toast__close"
            onClick={() => setToast(null)}
            aria-label="Đóng thông báo"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>
      )}

      {/* ===================================================
          PAGE HEADER
          =================================================== */}

      <section className="adm-order-header">
        <div className="adm-order-header__content">
          <span className="adm-order-header__kicker">Đơn hàng</span>

          <h1 className="adm-order-header__title">
            <span className="adm-order-header__title-icon">
              <i className="bi bi-cart3" />
            </span>

            <span>Quản lý đơn hàng</span>
          </h1>

          <p className="adm-order-header__description">
            Theo dõi, tìm kiếm, lọc đơn hàng và cập nhật trạng thái xử lý.
          </p>
        </div>

        <div className="adm-order-count-card">
          <span className="adm-order-count-card__icon">
            <i className="bi bi-receipt" />
          </span>

          <div>
            <strong>{pagination.total}</strong>

            <span>Tổng đơn hàng</span>
          </div>
        </div>
      </section>

      <section className="adm-order-panel">
        <div className="adm-order-panel__header">
          <div className="adm-order-panel__heading">
            <span className="adm-order-panel__icon">
              <i className="bi bi-funnel" />
            </span>

            <div>
              <h2>Bộ lọc đơn hàng</h2>

              <p>Tìm nhanh đơn hàng theo từ khóa, trạng thái hoặc thời gian.</p>
            </div>
          </div>
        </div>

        <div className="adm-order-panel__body">
          <div className="adm-order-filter">
            <div className="adm-order-field adm-order-field--keyword">
              <label className="adm-order-field__label">Từ khóa</label>

              <div className="adm-order-input-wrap">
                <i className="bi bi-search adm-order-input-wrap__icon" />

                <input
                  type="text"
                  className="adm-order-input"
                  placeholder="Mã đơn, tên khách, SĐT, SKU..."
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleFilter();
                    }
                  }}
                />
              </div>
            </div>

            <div className="adm-order-field">
              <label className="adm-order-field__label">Trạng thái</label>

              <select
                className="adm-order-select"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">Tất cả trạng thái</option>

                {Object.entries(STATUS_OPTIONS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="adm-order-field">
              <label className="adm-order-field__label">Từ ngày</label>

              <input
                type="date"
                className="adm-order-input"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>

            <div className="adm-order-field">
              <label className="adm-order-field__label">Đến ngày</label>

              <input
                type="date"
                className="adm-order-input"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>

            <div className="adm-order-filter__actions">
              <button
                type="button"
                className="adm-order-button adm-order-button--primary"
                onClick={handleFilter}
              >
                <i className="bi bi-funnel-fill" />

                <span>Lọc</span>
              </button>

              <button
                type="button"
                className="adm-order-button adm-order-button--secondary"
                onClick={handleReset}
              >
                <i className="bi bi-arrow-counterclockwise" />

                <span>Làm mới</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="adm-order-panel">
        <div className="adm-order-panel__header">
          <div className="adm-order-panel__heading">
            <span className="adm-order-panel__icon adm-order-panel__icon--blue">
              <i className="bi bi-list-ul" />
            </span>

            <div>
              <h2>Danh sách đơn hàng</h2>

              <p>Quản lý toàn bộ đơn hàng phát sinh trong hệ thống.</p>
            </div>
          </div>

          <div className="adm-order-panel__total">
            <i className="bi bi-receipt-cutoff" />

            <span>Tổng:</span>

            <strong>{pagination.total}</strong>

            <span>đơn hàng</span>
          </div>
        </div>

        <div className="adm-order-panel__body">
          {loading ? (
            <div className="adm-order-loading">
              <span className="adm-order-loading__icon">
                <i className="bi bi-arrow-repeat" />
              </span>

              <strong>Đang tải dữ liệu</strong>

              <p>Vui lòng chờ trong giây lát...</p>
            </div>
          ) : (
            <>
              <div className="adm-order-table-wrap">
                <table className="adm-order-table">
                  <thead>
                    <tr>
                      <th>ID</th>

                      <th>Mã đơn</th>

                      <th>Khách hàng</th>

                      <th>SĐT</th>

                      <th>Tổng tiền</th>

                      <th>Thanh toán</th>

                      <th>Trạng thái</th>

                      <th>Ngày tạo</th>

                      <th>Hành động</th>
                    </tr>
                  </thead>

                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="adm-order-table__empty">
                          <div className="adm-order-empty">
                            <span className="adm-order-empty__icon">
                              <i className="bi bi-inbox" />
                            </span>

                            <strong>Chưa có đơn hàng</strong>

                            <p>Không tìm thấy đơn hàng phù hợp.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => {
                        const statusMeta = getStatusMeta(order.status);

                        const paymentMeta = getPaymentStatusMeta(
                          order.payment_status,
                          order.payment_method,
                        );

                        const nextOptions = getNextStatusOptions(order);

                        return (
                          <tr key={order.id}>
                            <td>
                              <span className="adm-order-table__id">
                                #{order.id}
                              </span>
                            </td>

                            <td>
                              <span
                                className="adm-order-table__code"
                                title={order.order_code}
                              >
                                {order.order_code}
                              </span>
                            </td>

                            <td>
                              <div className="adm-order-customer">
                                <span className="adm-order-customer__avatar">
                                  <i className="bi bi-person" />
                                </span>

                                <span className="adm-order-customer__name">
                                  {order.shipping_name || "Không có"}
                                </span>
                              </div>
                            </td>

                            <td>
                              <span className="adm-order-phone">
                                <i className="bi bi-telephone" />

                                {order.shipping_phone || "Không có"}
                              </span>
                            </td>

                            <td>
                              <strong className="adm-order-money">
                                {formatMoney(order.total_amount)}
                              </strong>
                            </td>

                            <td>
                              <span
                                className={`adm-order-payment-status adm-order-payment-status--${paymentMeta.type}`}
                              >
                                <i className={`bi ${paymentMeta.icon}`} />

                                <span>
                                  {order.payment_status_label ||
                                    paymentMeta.label}
                                </span>
                              </span>
                            </td>

                            <td>
                              <span
                                className={`adm-order-status adm-order-status--${statusMeta.type}`}
                              >
                                <i className={`bi ${statusMeta.icon}`} />

                                <span>
                                  {order.status_label || statusMeta.label}
                                </span>
                              </span>
                            </td>

                            <td>
                              <span className="adm-order-date">
                                {formatDateTime(order.created_at)}
                              </span>
                            </td>

                            <td>
                              <div className="adm-order-row-actions">
                                <button
                                  type="button"
                                  className="adm-order-icon-button adm-order-icon-button--view"
                                  onClick={() => handleViewDetail(order.id)}
                                  title="Xem chi tiết"
                                  aria-label="Xem chi tiết"
                                >
                                  <i className="bi bi-eye" />
                                </button>

                                <button
                                  type="button"
                                  className="adm-order-icon-button adm-order-icon-button--invoice"
                                  onClick={() => handleExportInvoice(order.id)}
                                  title="Xuất hóa đơn"
                                  aria-label="Xuất hóa đơn"
                                >
                                  <i className="bi bi-printer" />
                                </button>

                                <select
                                  className="adm-order-status-select"
                                  value=""
                                  disabled={
                                    isFinalStatus(order.status) ||
                                    nextOptions.length === 0
                                  }
                                  onChange={(event) => {
                                    const nextStatus = event.target.value;

                                    if (!nextStatus) {
                                      return;
                                    }

                                    handleRequestStatusChange(
                                      order,
                                      nextStatus,
                                    );
                                  }}
                                >
                                  <option value="">
                                    {isFinalStatus(order.status) ||
                                    nextOptions.length === 0
                                      ? "Đã khóa"
                                      : "Chuyển trạng thái"}
                                  </option>

                                  {nextOptions.map((item) => (
                                    <option key={item.value} value={item.value}>
                                      {item.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {pagination.total > 0 && (
                <div className="adm-order-pagination">
                  <div className="adm-order-pagination__info">
                    Hiển thị{" "}
                    <strong>
                      {(pagination.page - 1) * pagination.limit + 1}
                    </strong>{" "}
                    -{" "}
                    <strong>
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total,
                      )}
                    </strong>{" "}
                    trong tổng <strong>{pagination.total}</strong> đơn hàng
                  </div>

                  <div className="adm-order-pagination__controls">
                    <select
                      className="adm-order-pagination__size"
                      value={limit}
                      onChange={handleChangeLimit}
                    >
                      <option value={5}>5 / trang</option>

                      <option value={10}>10 / trang</option>

                      <option value={20}>20 / trang</option>
                    </select>

                    <button
                      type="button"
                      className="adm-order-pagination__button"
                      disabled={pagination.page <= 1}
                      onClick={() => handleChangePage(pagination.page - 1)}
                    >
                      <i className="bi bi-chevron-left" />

                      <span>Trước</span>
                    </button>

                    <div className="adm-order-pagination__numbers">
                      {renderPageNumbers().map((pageNumber, index) =>
                        pageNumber === "..." ? (
                          <span
                            key={`dots-${index}`}
                            className="adm-order-pagination__dots"
                          >
                            ...
                          </span>
                        ) : (
                          <button
                            key={pageNumber}
                            type="button"
                            className={[
                              "adm-order-pagination__number",

                              pageNumber === pagination.page &&
                                "adm-order-pagination__number--current",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => handleChangePage(pageNumber)}
                          >
                            {pageNumber}
                          </button>
                        ),
                      )}
                    </div>

                    <button
                      type="button"
                      className="adm-order-pagination__button"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => handleChangePage(pagination.page + 1)}
                    >
                      <span>Sau</span>

                      <i className="bi bi-chevron-right" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ===================================================
          DETAIL
          =================================================== */}

      {selectedOrder && (
        <section className="adm-order-panel adm-order-detail-card">
          <div className="adm-order-panel__header">
            <div className="adm-order-panel__heading">
              <span className="adm-order-panel__icon adm-order-panel__icon--purple">
                <i className="bi bi-receipt" />
              </span>

              <div>
                <h2>Chi tiết đơn hàng</h2>

                <p>
                  Mã đơn: <strong>#{selectedOrder.order_code}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              className="adm-order-button adm-order-button--danger-soft"
              onClick={() => setSelectedOrder(null)}
            >
              <i className="bi bi-x-lg" />

              <span>Đóng</span>
            </button>
          </div>

          <div className="adm-order-panel__body">
            <div className="adm-order-detail-grid">
              <article className="adm-order-detail-item">
                <span className="adm-order-detail-item__icon">
                  <i className="bi bi-person" />
                </span>

                <div>
                  <span className="adm-order-detail-item__label">
                    Khách hàng
                  </span>

                  <strong className="adm-order-detail-item__value">
                    {selectedOrder.shipping_name || "Không có"}
                  </strong>
                </div>
              </article>

              <article className="adm-order-detail-item">
                <span className="adm-order-detail-item__icon">
                  <i className="bi bi-telephone" />
                </span>

                <div>
                  <span className="adm-order-detail-item__label">
                    Số điện thoại
                  </span>

                  <strong className="adm-order-detail-item__value">
                    {selectedOrder.shipping_phone || "Không có"}
                  </strong>
                </div>
              </article>

              <article className="adm-order-detail-item">
                <span className="adm-order-detail-item__icon">
                  <i className="bi bi-envelope" />
                </span>

                <div>
                  <span className="adm-order-detail-item__label">Email</span>

                  <strong className="adm-order-detail-item__value">
                    {selectedOrder.shipping_email || "Không có"}
                  </strong>
                </div>
              </article>

              <article className="adm-order-detail-item">
                <span className="adm-order-detail-item__icon">
                  <i className="bi bi-geo-alt" />
                </span>

                <div>
                  <span className="adm-order-detail-item__label">
                    Địa chỉ giao hàng
                  </span>

                  <strong className="adm-order-detail-item__value">
                    {selectedOrder.shipping_address || "Không có"}
                  </strong>
                </div>
              </article>

              <article className="adm-order-detail-item">
                <span className="adm-order-detail-item__icon">
                  <i className="bi bi-box-seam" />
                </span>

                <div>
                  <span className="adm-order-detail-item__label">
                    Trạng thái đơn
                  </span>

                  <div className="adm-order-detail-item__value">
                    {(() => {
                      const meta = getStatusMeta(selectedOrder.status);

                      return (
                        <span
                          className={`adm-order-status adm-order-status--${meta.type}`}
                        >
                          <i className={`bi ${meta.icon}`} />

                          <span>
                            {selectedOrder.status_label || meta.label}
                          </span>
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </article>

              <article className="adm-order-detail-item">
                <span className="adm-order-detail-item__icon">
                  <i className="bi bi-credit-card" />
                </span>

                <div>
                  <span className="adm-order-detail-item__label">
                    Phương thức thanh toán
                  </span>

                  <div className="adm-order-detail-item__value">
                    {(() => {
                      const paymentMethod = getPaymentMethodMeta(
                        selectedOrder.payment_method,
                      );

                      return (
                        <span
                          className={`adm-order-payment-method adm-order-payment-method--${paymentMethod.type}`}
                        >
                          <i className={`bi ${paymentMethod.icon}`} />

                          <span>
                            {paymentMethod.type !== "unknown"
                              ? paymentMethod.label
                              : selectedOrder.payment_method_label ||
                                paymentMethod.label}
                          </span>
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </article>

              <article className="adm-order-detail-item">
                <span className="adm-order-detail-item__icon">
                  <i className="bi bi-wallet2" />
                </span>

                <div>
                  <span className="adm-order-detail-item__label">
                    Trạng thái thanh toán
                  </span>

                  <div className="adm-order-detail-item__value">
                    {(() => {
                      const paymentStatus = getPaymentStatusMeta(
                        selectedOrder.payment_status,
                        selectedOrder.payment_method,
                      );

                      return (
                        <span
                          className={`adm-order-payment-status adm-order-payment-status--${paymentStatus.type}`}
                        >
                          <i className={`bi ${paymentStatus.icon}`} />

                          <span>
                            {selectedOrder.payment_status_label ||
                              paymentStatus.label}
                          </span>
                        </span>
                      );
                    })()}

                    {selectedOrder.transaction_code && (
                      <div className="adm-order-payment-note">
                        <i className="bi bi-upc-scan" />

                        <span>
                          Mã giao dịch:{" "}
                          <strong>{selectedOrder.transaction_code}</strong>
                        </span>
                      </div>
                    )}

                    {selectedOrder.paid_at && (
                      <div className="adm-order-payment-note">
                        <i className="bi bi-clock" />

                        <span>
                          Thanh toán lúc:{" "}
                          {formatDateTime(selectedOrder.paid_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </article>

              <article className="adm-order-detail-item">
                <span className="adm-order-detail-item__icon">
                  <i className="bi bi-ticket-perforated" />
                </span>

                <div>
                  <span className="adm-order-detail-item__label">
                    Mã giảm giá
                  </span>

                  <strong className="adm-order-detail-item__value">
                    {selectedOrder.coupon_code || "Không sử dụng"}
                  </strong>
                </div>
              </article>

              <article className="adm-order-detail-item">
                <span className="adm-order-detail-item__icon">
                  <i className="bi bi-chat-left-text" />
                </span>

                <div>
                  <span className="adm-order-detail-item__label">Ghi chú</span>

                  <strong className="adm-order-detail-item__value">
                    {selectedOrder.note || "Không có"}
                  </strong>
                </div>
              </article>

              <article className="adm-order-detail-item">
                <span className="adm-order-detail-item__icon">
                  <i className="bi bi-calendar3" />
                </span>

                <div>
                  <span className="adm-order-detail-item__label">Ngày tạo</span>

                  <strong className="adm-order-detail-item__value">
                    {formatDateTime(selectedOrder.created_at)}
                  </strong>
                </div>
              </article>

              {selectedOrder.cancel_reason && (
                <article className="adm-order-detail-item adm-order-detail-item--danger">
                  <span className="adm-order-detail-item__icon">
                    <i className="bi bi-x-octagon" />
                  </span>

                  <div>
                    <span className="adm-order-detail-item__label">
                      Lý do hủy
                    </span>

                    <strong className="adm-order-detail-item__value">
                      {selectedOrder.cancel_reason}
                    </strong>

                    {selectedOrder.cancelled_at && (
                      <div className="adm-order-payment-note">
                        <i className="bi bi-clock-history" />

                        <span>
                          Hủy lúc: {formatDateTime(selectedOrder.cancelled_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </article>
              )}
            </div>

            <div className="adm-order-section-heading">
              <span className="adm-order-section-heading__icon">
                <i className="bi bi-box-seam" />
              </span>

              <div>
                <h3>Sản phẩm trong đơn</h3>

                <p>Danh sách sản phẩm và biến thể tại thời điểm đặt hàng.</p>
              </div>
            </div>

            <div className="adm-order-table-wrap">
              <table className="adm-order-table adm-order-table--detail">
                <thead>
                  <tr>
                    <th>SKU</th>

                    <th>Sản phẩm</th>

                    <th>Ảnh</th>

                    <th>Giá</th>

                    <th>SL</th>

                    <th>Thành tiền</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedOrder.items?.length > 0 ? (
                    selectedOrder.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="adm-order-table__code">
                            {getProductCode(item)}
                          </span>
                        </td>

                        <td>
                          <div className="adm-order-product-info">
                            <span className="adm-order-product-name">
                              {item.product_name}
                            </span>

                            {item.variant_name && (
                              <span className="adm-order-product-variant">
                                <i className="bi bi-diagram-2" />

                                {item.variant_name}
                              </span>
                            )}

                            {Array.isArray(item.variant_options) &&
                              item.variant_options.length > 0 && (
                                <div className="adm-order-product-options">
                                  {item.variant_options.map((option, index) => (
                                    <span
                                      key={`${option.option_id || index}-${option.option_value_id || index}`}
                                      className="adm-order-product-option"
                                    >
                                      <strong>
                                        {option.option_name ||
                                          option.option_code ||
                                          "Thuộc tính"}
                                        :
                                      </strong>{" "}
                                      {option.label || option.value || ""}
                                    </span>
                                  ))}
                                </div>
                              )}
                          </div>
                        </td>

                        <td>
                          <img
                            className="adm-order-product-image"
                            src={getImageUrl(item.product_image)}
                            alt={item.product_name || "Sản phẩm"}
                            onError={(event) => {
                              event.currentTarget.onerror = null;

                              event.currentTarget.src = "/images/no-image.png";
                            }}
                          />
                        </td>

                        <td>
                          <span className="adm-order-product-price">
                            {formatMoney(item.price)}
                          </span>
                        </td>

                        <td>
                          <span className="adm-order-product-quantity">
                            {item.quantity}
                          </span>
                        </td>

                        <td>
                          <strong className="adm-order-money">
                            {formatMoney(item.total_price)}
                          </strong>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="adm-order-table__empty">
                        <div className="adm-order-empty">
                          <span className="adm-order-empty__icon">
                            <i className="bi bi-box" />
                          </span>

                          <strong>Không có sản phẩm</strong>

                          <p>Đơn hàng này chưa có sản phẩm.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="adm-order-summary-box">
              <div className="adm-order-summary-row">
                <span>Tạm tính</span>

                <strong>{formatMoney(selectedOrder.subtotal)}</strong>
              </div>

              <div className="adm-order-summary-row">
                <span>Phí vận chuyển</span>

                <strong>{formatMoney(selectedOrder.shipping_fee)}</strong>
              </div>

              <div className="adm-order-summary-row">
                <span>Giảm giá</span>

                <strong>-{formatMoney(selectedOrder.discount_amount)}</strong>
              </div>

              <div className="adm-order-summary-row adm-order-summary-row--total">
                <span>Tổng thanh toán</span>

                <strong>{formatMoney(selectedOrder.total_amount)}</strong>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===================================================
          STATUS CONFIRM MODAL
          =================================================== */}

      {statusConfirm.open &&
        statusConfirm.order &&
        currentStatusMeta &&
        nextStatusMeta && (
          <div
            className="adm-order-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !statusUpdating) {
                closeStatusConfirm();
              }
            }}
          >
            <div
              className="adm-order-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="adm-order-status-modal-title"
            >
              <div className="adm-order-modal__header">
                <div className="adm-order-modal__heading">
                  <span className="adm-order-modal__heading-icon">
                    <i className="bi bi-arrow-left-right" />
                  </span>

                  <div>
                    <h3 id="adm-order-status-modal-title">
                      Xác nhận cập nhật trạng thái
                    </h3>

                    <p>Kiểm tra thông tin trước khi tiếp tục.</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="adm-order-modal__close"
                  disabled={statusUpdating}
                  onClick={closeStatusConfirm}
                  aria-label="Đóng"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <div className="adm-order-modal__body">
                <div className="adm-order-modal__order">
                  <span className="adm-order-modal__order-icon">
                    <i className="bi bi-receipt" />
                  </span>

                  <div>
                    <span>Đơn hàng</span>

                    <strong>{statusConfirm.order.order_code}</strong>
                  </div>
                </div>

                <div className="adm-order-status-transition">
                  <div className="adm-order-status-transition__item">
                    <span className="adm-order-status-transition__label">
                      Hiện tại
                    </span>

                    <span
                      className={`adm-order-status adm-order-status--${currentStatusMeta.type}`}
                    >
                      <i className={`bi ${currentStatusMeta.icon}`} />

                      <span>{currentStatusMeta.label}</span>
                    </span>
                  </div>

                  <span className="adm-order-status-transition__arrow">
                    <i className="bi bi-arrow-right" />
                  </span>

                  <div className="adm-order-status-transition__item">
                    <span className="adm-order-status-transition__label">
                      Chuyển sang
                    </span>

                    <span
                      className={`adm-order-status adm-order-status--${nextStatusMeta.type}`}
                    >
                      <i className={`bi ${nextStatusMeta.icon}`} />

                      <span>{nextStatusMeta.label}</span>
                    </span>
                  </div>
                </div>

                <div
                  className={[
                    "adm-order-modal__notice",
                    statusConfirm.nextStatus === "CANCELLED"
                      ? "adm-order-modal__notice--danger"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <i
                    className={`bi ${
                      statusConfirm.nextStatus === "CANCELLED"
                        ? "bi-exclamation-triangle-fill"
                        : "bi-info-circle-fill"
                    }`}
                  />

                  <p>
                    {statusConfirm.nextStatus === "CANCELLED"
                      ? "Đơn hàng sẽ được hủy. Backend sẽ xử lý hoàn kho và hoàn coupon nếu đơn đủ điều kiện."
                      : "Sau khi xác nhận, trạng thái đơn hàng sẽ được cập nhật và hệ thống sẽ gửi email thông báo đến khách hàng nếu có email."}
                  </p>
                </div>
              </div>

              <div className="adm-order-modal__footer">
                <button
                  type="button"
                  className="adm-order-button adm-order-button--secondary"
                  disabled={statusUpdating}
                  onClick={closeStatusConfirm}
                >
                  <i className="bi bi-x" />

                  <span>Hủy</span>
                </button>

                <button
                  type="button"
                  className={[
                    "adm-order-button",

                    statusConfirm.nextStatus === "CANCELLED"
                      ? "adm-order-button--danger"
                      : "adm-order-button--primary",
                  ].join(" ")}
                  disabled={statusUpdating}
                  onClick={confirmUpdateStatus}
                >
                  {statusUpdating ? (
                    <>
                      <i className="bi bi-arrow-repeat adm-order-button__spinner" />

                      <span>Đang cập nhật...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg" />

                      <span>Xác nhận cập nhật</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default OrderManagement;
