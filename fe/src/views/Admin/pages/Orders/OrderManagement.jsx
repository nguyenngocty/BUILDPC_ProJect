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
  CANCELLED: "Hủy",
};

const STATUS_FLOW = {
  PENDING: ["PROCESSING", "CANCELLED"],

  PROCESSING: ["SHIPPING", "CANCELLED"],

  SHIPPING: ["COMPLETED"],

  COMPLETED: [],

  CANCELLED: [],
};

const IMAGE_BASE_URL = "http://localhost:5000";

// =========================================================
// HELPERS
// =========================================================

const getNextStatusOptions = (currentStatus) => {
  const nextStatuses = STATUS_FLOW[currentStatus] || [];

  return nextStatuses.map((status) => ({
    value: status,
    label: STATUS_OPTIONS[status],
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
  switch (method) {
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
  return item?.product_sku || item?.sku || item?.product_id || "N/A";
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
  const [orders, setOrders] = useState([]);

  const [keyword, setKeyword] = useState("");

  const [status, setStatus] = useState("");

  const [fromDate, setFromDate] = useState("");

  const [toDate, setToDate] = useState("");

  const [loading, setLoading] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);

  const [page, setPage] = useState(1);

  const [limit, setLimit] = useState(10);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // =======================================================
  // PAGINATION FALLBACK
  // =======================================================

  const buildPaginationFallback = (resData, nextPage, nextLimit) => {
    const dataLength = resData.data?.length || 0;

    const total = Number(resData.total ?? dataLength);

    const totalPages = Math.max(Math.ceil(total / nextLimit), 1);

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

      setOrders(resData.data || []);

      const nextPagination =
        resData.pagination ||
        buildPaginationFallback(resData, nextPage, nextLimit);

      setPagination({
        page: Number(nextPagination.page || nextPage),

        limit: Number(nextPagination.limit || nextLimit),

        total: Number(nextPagination.total || 0),

        totalPages: Math.max(Number(nextPagination.totalPages || 1), 1),
      });

      setPage(nextPage);
      setLimit(nextLimit);
    } catch (error) {
      console.error(error);

      alert(error.response?.data?.message || "Lỗi lấy danh sách đơn hàng");
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
    const totalPages = pagination.totalPages || 1;

    const currentPage = pagination.page || page;

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

      setTimeout(() => {
        const detailElement = document.querySelector(".adm-order-detail-card");

        if (detailElement) {
          detailElement.scrollIntoView({
            behavior: "smooth",

            block: "start",
          });
        }
      }, 100);
    } catch (error) {
      console.error(error);

      alert(error.response?.data?.message || "Lỗi lấy chi tiết đơn hàng");
    }
  };

  // =======================================================
  // UPDATE STATUS
  // =======================================================

  const handleUpdateStatus = async (id, newStatus) => {
    if (!newStatus) {
      return;
    }

    const confirmChange = window.confirm(
      `Bạn có chắc muốn chuyển đơn hàng sang trạng thái "${STATUS_OPTIONS[newStatus]}" không?`,
    );

    if (!confirmChange) {
      return;
    }

    try {
      setLoading(true);

      await orderService.updateStatus(id, newStatus);

      if (selectedOrder?.id === id) {
        try {
          const detailRes = await orderService.getById(id);

          setSelectedOrder(detailRes.data.data);
        } catch (detailError) {
          console.error("Lỗi tải lại chi tiết đơn hàng:", detailError);
        }
      }

      setPage(1);

      await fetchOrders({
        keyword,
        status,
        from_date: fromDate,
        to_date: toDate,
        page: 1,
        limit,
      });

      alert("Cập nhật trạng thái thành công");
    } catch (error) {
      console.error(error);

      alert(error.response?.data?.message || "Lỗi cập nhật trạng thái");
    } finally {
      setLoading(false);
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
        alert(
          "Trình duyệt đang chặn popup. Vui lòng cho phép popup để in hóa đơn.",
        );

        return;
      }

      const html = `
          <html>
            <head>
              <title>
                Hóa đơn ${invoice.invoice_code}
              </title>

              <style>
                * {
                  box-sizing: border-box;
                }

                body {
                  margin: 0;
                  padding: 30px;
                  color: #334155;
                  background: #ffffff;
                  font-family: Arial, sans-serif;
                }

                h1 {
                  margin: 0 0 6px;
                  color: #ef233c;
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
                }

                .invoice-table th {
                  color: #475569;
                  background: #f8fafc;
                  font-size: 12px;
                  text-transform: uppercase;
                }

                .invoice-total {
                  margin-top: 22px;
                  color: #ef233c;
                  font-size: 20px;
                  font-weight: 700;
                  text-align: right;
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
              <h1>
                HÓA ĐƠN BÁN HÀNG
              </h1>

              <div class="invoice-subtitle">
                ${invoice.invoice_code}
              </div>

              <div class="invoice-info">
                <div>
                  <strong>
                    Mã đơn hàng:
                  </strong>

                  ${order.order_code}
                </div>

                <div>
                  <strong>
                    Ngày xuất:
                  </strong>

                  ${new Date(invoice.exported_at).toLocaleString("vi-VN")}
                </div>

                <div>
                  <strong>
                    Khách hàng:
                  </strong>

                  ${invoice.customer.name}
                </div>

                <div>
                  <strong>
                    Số điện thoại:
                  </strong>

                  ${invoice.customer.phone}
                </div>

                <div>
                  <strong>
                    Địa chỉ:
                  </strong>

                  ${invoice.customer.address}
                </div>

                <div>
                  <strong>
                    Phương thức thanh toán:
                  </strong>

                  ${invoice.summary.payment_method}
                </div>

                <div>
                  <strong>
                    Trạng thái thanh toán:
                  </strong>

                  ${invoice.summary.payment_status}
                </div>

                ${
                  invoice.summary.transaction_code
                    ? `
                      <div>
                        <strong>
                          Mã giao dịch:
                        </strong>

                        ${invoice.summary.transaction_code}
                      </div>
                    `
                    : ""
                }

                ${
                  invoice.summary.paid_at
                    ? `
                      <div>
                        <strong>
                          Thời gian thanh toán:
                        </strong>

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
                    <th>Mã SP</th>
                    <th>Sản phẩm</th>
                    <th>Giá</th>
                    <th>Số lượng</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>

                <tbody>
                  ${invoice.items
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
                            ${item.product_name}
                          </td>

                          <td>
                            ${Number(item.price).toLocaleString("vi-VN")} đ
                          </td>

                          <td>
                            ${item.quantity}
                          </td>

                          <td>
                            ${Number(item.total_price).toLocaleString(
                              "vi-VN",
                            )} đ
                          </td>
                        </tr>
                      `,
                    )
                    .join("")}
                </tbody>
              </table>

              <div class="invoice-total">
                Tổng tiền:
                ${Number(invoice.summary.total_amount).toLocaleString(
                  "vi-VN",
                )} đ
              </div>

              <div class="invoice-footer">
                Cảm ơn quý khách đã mua hàng!
              </div>

              <script>
                window.onload = function() {
                  window.print();
                };
              </script>
            </body>
          </html>
        `;

      printWindow.document.write(html);

      printWindow.document.close();
    } catch (error) {
      console.error(error);

      alert(error.response?.data?.message || "Lỗi xuất hóa đơn");
    }
  };

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="adm-order-page">
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

      {/* ===================================================
          FILTER
          =================================================== */}

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
                  placeholder="Mã đơn, tên khách, SĐT, mã SP..."
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

      {/* ===================================================
          ORDER LIST
          =================================================== */}

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

                      <th>Trạng thái</th>

                      <th>Ngày tạo</th>

                      <th>Hành động</th>
                    </tr>
                  </thead>

                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="adm-order-table__empty">
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

                        return (
                          <tr key={order.id}>
                            <td>
                              <span className="adm-order-table__id">
                                #{order.id}
                              </span>
                            </td>

                            <td>
                              <span className="adm-order-table__code">
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
                                  disabled={isFinalStatus(order.status)}
                                  onChange={(event) => {
                                    if (!event.target.value) {
                                      return;
                                    }

                                    handleUpdateStatus(
                                      order.id,
                                      event.target.value,
                                    );
                                  }}
                                >
                                  <option value="">
                                    {isFinalStatus(order.status)
                                      ? "Đã khóa"
                                      : "Chuyển trạng thái"}
                                  </option>

                                  {getNextStatusOptions(order.status).map(
                                    (item) => (
                                      <option
                                        key={item.value}
                                        value={item.value}
                                      >
                                        {item.label}
                                      </option>
                                    ),
                                  )}
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

              {/* =================================================
                  PAGINATION
                  ================================================= */}

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
          ORDER DETAIL
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
              {/* CUSTOMER */}

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

              {/* PHONE */}

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

              {/* ADDRESS */}

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

              {/* ORDER STATUS */}

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
                      const statusMeta = getStatusMeta(selectedOrder.status);

                      return (
                        <span
                          className={`adm-order-status adm-order-status--${statusMeta.type}`}
                        >
                          <i className={`bi ${statusMeta.icon}`} />

                          <span>
                            {selectedOrder.status_label || statusMeta.label}
                          </span>
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </article>

              {/* PAYMENT METHOD */}

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
                            {selectedOrder.payment_method_label ||
                              paymentMethod.label}
                          </span>
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </article>

              {/* PAYMENT STATUS */}

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

                          <span>{paymentStatus.label}</span>
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

              {/* NOTE */}

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

              {/* CREATED */}

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
            </div>

            {/* =================================================
                PRODUCTS
                ================================================= */}

            <div className="adm-order-section-heading">
              <span className="adm-order-section-heading__icon">
                <i className="bi bi-box-seam" />
              </span>

              <div>
                <h3>Sản phẩm trong đơn</h3>

                <p>Danh sách sản phẩm thuộc đơn hàng này.</p>
              </div>
            </div>

            <div className="adm-order-table-wrap">
              <table className="adm-order-table adm-order-table--detail">
                <thead>
                  <tr>
                    <th>Mã SP</th>

                    <th>Sản phẩm</th>

                    <th>Ảnh</th>

                    <th>Giá</th>

                    <th>Số lượng</th>

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
                          <span className="adm-order-product-name">
                            {item.product_name}
                          </span>
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

            {/* TOTAL */}

            <div className="adm-order-total">
              <span className="adm-order-total__label">Tổng thanh toán</span>

              <strong className="adm-order-total__value">
                {formatMoney(selectedOrder.total_amount)}
              </strong>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default OrderManagement;
