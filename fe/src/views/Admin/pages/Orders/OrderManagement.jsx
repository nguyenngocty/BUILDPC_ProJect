import React, { useEffect, useState } from "react";
import orderService from "../../../../services/orderService";
import "./OrderManagement.css";

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

const getStatusClass = (status) => {
  switch (status) {
    case "PENDING":
      return "order-badge order-badge-pending";

    case "PROCESSING":
      return "order-badge order-badge-processing";

    case "SHIPPING":
      return "order-badge order-badge-shipping";

    case "COMPLETED":
      return "order-badge order-badge-completed";

    case "CANCELLED":
      return "order-badge order-badge-cancelled";

    default:
      return "order-badge order-badge-inactive";
  }
};

const getPaymentMethodLabel = (method) => {
  switch (method) {
    case "cod":
      return "COD";

    case "bank":
      return "Chuyển khoản";

    case "momo":
      return "MoMo";

    default:
      return "Không rõ";
  }
};

const getPaymentMethodClass = (method) => {
  switch (method) {
    case "cod":
      return "order-payment-method order-payment-cod";

    case "bank":
      return "order-payment-method order-payment-bank";

    case "momo":
      return "order-payment-method order-payment-momo";

    default:
      return "order-payment-method order-payment-unknown";
  }
};

const getPaymentStatusLabel = (paymentStatus, paymentMethod) => {
  if (Number(paymentStatus) === 1) {
    return "Đã thanh toán";
  }

  if (paymentMethod === "cod") {
    return "Thu khi giao";
  }

  if (paymentMethod === "bank") {
    return "Chờ xác nhận";
  }

  return "Chưa thanh toán";
};

const getPaymentStatusClass = (paymentStatus) => {
  return Number(paymentStatus) === 1
    ? "order-payment-status order-payment-paid"
    : "order-payment-status order-payment-unpaid";
};

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

// ======================================================
// PRODUCT IMAGE
// ======================================================

const getImageUrl = (imageUrl) => {
  if (!imageUrl) {
    return "/images/no-image.png";
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return `${IMAGE_BASE_URL}${imageUrl}`;
};

// ======================================================
// ORDER MANAGEMENT
// ======================================================

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

  // ====================================================
  // PAGINATION FALLBACK
  // ====================================================

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

  // ====================================================
  // FETCH ORDERS
  // ====================================================

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

  // ====================================================
  // LOAD
  // ====================================================

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

  // ====================================================
  // FILTER
  // ====================================================

  const handleFilter = () => {
    setSelectedOrder(null);

    fetchOrders({
      page: 1,
      limit,
    });
  };

  // ====================================================
  // RESET FILTER
  // ====================================================

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

  // ====================================================
  // CHANGE PAGE
  // ====================================================

  const handleChangePage = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) {
      return;
    }

    fetchOrders({
      page: newPage,
      limit,
    });
  };

  // ====================================================
  // LIMIT
  // ====================================================

  const handleChangeLimit = (e) => {
    const newLimit = Number(e.target.value);

    setLimit(newLimit);

    setPage(1);

    fetchOrders({
      page: 1,
      limit: newLimit,
    });
  };

  // ====================================================
  // PAGE NUMBERS
  // ====================================================

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

  // ====================================================
  // VIEW DETAIL
  // ====================================================

  const handleViewDetail = async (id) => {
    try {
      const res = await orderService.getById(id);

      setSelectedOrder(res.data.data);

      setTimeout(() => {
        const detailElement = document.querySelector(".order-detail-card");

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

  // ====================================================
  // UPDATE STATUS
  // ====================================================

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
      await orderService.updateStatus(id, newStatus);

      alert("Cập nhật trạng thái thành công");

      await fetchOrders({
        page,
        limit,
      });

      if (selectedOrder?.id === id) {
        const res = await orderService.getById(id);

        setSelectedOrder(res.data.data);
      }
    } catch (error) {
      console.error(error);

      alert(error.response?.data?.message || "Lỗi cập nhật trạng thái");
    }
  };

  // ====================================================
  // EXPORT INVOICE
  // ====================================================

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
              body {
                font-family: Arial, sans-serif;
                padding: 30px;
                color: #1f2937;
              }

              h1 {
                text-align: center;
                color: #ef233c;
                margin-bottom: 5px;
              }

              .subtitle {
                text-align: center;
                color: #64748b;
                margin-bottom: 30px;
              }

              .info {
                margin-bottom: 20px;
                line-height: 1.7;
              }

              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }

              th,
              td {
                border: 1px solid #e5e7eb;
                padding: 10px;
                text-align: left;
              }

              th {
                background: #f8fafc;
              }

              .total {
                text-align: right;
                font-size: 20px;
                font-weight: bold;
                color: #ef233c;
                margin-top: 20px;
              }

              .footer {
                margin-top: 40px;
                text-align: center;
                color: #64748b;
                font-size: 13px;
              }
            </style>
          </head>

          <body>
            <h1>
              HÓA ĐƠN BÁN HÀNG
            </h1>

            <div class="subtitle">
              ${invoice.invoice_code}
            </div>

            <div class="info">
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

            <table>
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
                          ${Number(item.total_price).toLocaleString("vi-VN")} đ
                        </td>
                      </tr>
                    `,
                  )
                  .join("")}
              </tbody>
            </table>

            <div class="total">
              Tổng tiền:
              ${Number(invoice.summary.total_amount).toLocaleString("vi-VN")} đ
            </div>

            <div class="footer">
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

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="order-page">
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="order-page-header">
        <div>
          <h3 className="order-page-title">Quản lý đơn hàng</h3>

          <p className="order-page-subtitle">
            Theo dõi, tìm kiếm, lọc đơn hàng và cập nhật trạng thái xử lý.
          </p>
        </div>

        <div className="order-page-count">
          <span>{pagination.total}</span>

          <small>đơn hàng</small>
        </div>
      </div>

      {/* =================================================
          FILTER
      ================================================= */}

      <div className="order-card">
        <div className="order-card-header">
          <h4 className="order-card-title">Bộ lọc đơn hàng</h4>
        </div>

        <div className="order-card-body">
          <div className="order-filter-grid">
            {/* KEYWORD */}

            <div className="order-form-group">
              <label className="order-label">Từ khóa</label>

              <input
                type="text"
                className="order-input"
                placeholder="Mã đơn, tên khách, SĐT, mã SP..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleFilter();
                  }
                }}
              />
            </div>

            {/* STATUS */}

            <div className="order-form-group">
              <label className="order-label">Trạng thái</label>

              <select
                className="order-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>

                {Object.entries(STATUS_OPTIONS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* FROM DATE */}

            <div className="order-form-group">
              <label className="order-label">Từ ngày</label>

              <input
                type="date"
                className="order-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            {/* TO DATE */}

            <div className="order-form-group">
              <label className="order-label">Đến ngày</label>

              <input
                type="date"
                className="order-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            {/* ACTION */}

            <div className="order-actions order-filter-actions">
              <button
                type="button"
                className="order-btn order-btn-dark"
                onClick={handleFilter}
              >
                Lọc
              </button>

              <button
                type="button"
                className="order-btn order-btn-secondary"
                onClick={handleReset}
              >
                Làm mới
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================
          ORDER LIST
      ================================================= */}

      <div className="order-card">
        <div className="order-card-header">
          <h4 className="order-card-title">Danh sách đơn hàng</h4>

          <span className="order-muted">Tổng: {pagination.total} đơn hàng</span>
        </div>

        <div className="order-card-body">
          {loading ? (
            <div className="order-loading">Đang tải dữ liệu...</div>
          ) : (
            <>
              <div className="order-table-wrap">
                <table className="order-table">
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
                        <td colSpan="8" className="order-empty">
                          Chưa có đơn hàng
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id}>
                          <td className="order-id">#{order.id}</td>

                          <td>
                            <strong>{order.order_code}</strong>
                          </td>

                          <td>{order.shipping_name || "Không có"}</td>

                          <td>{order.shipping_phone || "Không có"}</td>

                          <td className="order-money">
                            {formatMoney(order.total_amount)}
                          </td>

                          <td>
                            <span className={getStatusClass(order.status)}>
                              {order.status_label ||
                                STATUS_OPTIONS[order.status]}
                            </span>
                          </td>

                          <td>{formatDateTime(order.created_at)}</td>

                          <td>
                            <div className="order-actions">
                              <button
                                type="button"
                                className="order-btn order-btn-sm order-btn-info"
                                onClick={() => handleViewDetail(order.id)}
                              >
                                Chi tiết
                              </button>

                              <button
                                type="button"
                                className="order-btn order-btn-sm order-btn-secondary"
                                onClick={() => handleExportInvoice(order.id)}
                              >
                                Hóa đơn
                              </button>

                              <select
                                className="order-inline-select"
                                value=""
                                disabled={isFinalStatus(order.status)}
                                onChange={(e) => {
                                  if (!e.target.value) {
                                    return;
                                  }

                                  handleUpdateStatus(order.id, e.target.value);
                                }}
                              >
                                <option value="">
                                  {isFinalStatus(order.status)
                                    ? "Đã khóa"
                                    : "Chuyển trạng thái"}
                                </option>

                                {getNextStatusOptions(order.status).map(
                                  (item) => (
                                    <option key={item.value} value={item.value}>
                                      {item.label}
                                    </option>
                                  ),
                                )}
                              </select>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* ===========================================
                  PAGINATION
              =========================================== */}

              {pagination.total > 0 && (
                <div className="order-pagination">
                  <div className="order-pagination-info">
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

                  <div className="order-pagination-controls">
                    <select
                      className="order-page-size"
                      value={limit}
                      onChange={handleChangeLimit}
                    >
                      <option value={5}>5 / trang</option>

                      <option value={10}>10 / trang</option>

                      <option value={20}>20 / trang</option>
                    </select>

                    <button
                      type="button"
                      className="order-page-btn"
                      disabled={pagination.page <= 1}
                      onClick={() => handleChangePage(pagination.page - 1)}
                    >
                      Trước
                    </button>

                    <div className="order-page-numbers">
                      {renderPageNumbers().map((pageNumber, index) =>
                        pageNumber === "..." ? (
                          <span
                            key={`dots-${index}`}
                            className="order-page-dots"
                          >
                            ...
                          </span>
                        ) : (
                          <button
                            key={pageNumber}
                            type="button"
                            className={
                              pageNumber === pagination.page
                                ? "order-page-number active"
                                : "order-page-number"
                            }
                            onClick={() => handleChangePage(pageNumber)}
                          >
                            {pageNumber}
                          </button>
                        ),
                      )}
                    </div>

                    <button
                      type="button"
                      className="order-page-btn"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => handleChangePage(pagination.page + 1)}
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* =================================================
          ORDER DETAIL
      ================================================= */}

      {selectedOrder && (
        <div className="order-card order-detail-card">
          <div className="order-card-header">
            <h4 className="order-card-title">
              Chi tiết đơn hàng #{selectedOrder.order_code}
            </h4>

            <button
              type="button"
              className="order-btn order-btn-sm order-btn-danger"
              onClick={() => setSelectedOrder(null)}
            >
              Đóng
            </button>
          </div>

          <div className="order-card-body">
            {/* =============================================
                ORDER INFO
            ============================================= */}

            <div className="order-detail-grid">
              {/* CUSTOMER */}

              <div className="order-detail-item">
                <div className="order-detail-label">Khách hàng</div>

                <div className="order-detail-value">
                  {selectedOrder.shipping_name || "Không có"}
                </div>
              </div>

              {/* PHONE */}

              <div className="order-detail-item">
                <div className="order-detail-label">Số điện thoại</div>

                <div className="order-detail-value">
                  {selectedOrder.shipping_phone || "Không có"}
                </div>
              </div>

              {/* ADDRESS */}

              <div className="order-detail-item">
                <div className="order-detail-label">Địa chỉ giao hàng</div>

                <div className="order-detail-value">
                  {selectedOrder.shipping_address || "Không có"}
                </div>
              </div>

              {/* ORDER STATUS */}

              <div className="order-detail-item">
                <div className="order-detail-label">Trạng thái đơn</div>

                <div className="order-detail-value">
                  <span className={getStatusClass(selectedOrder.status)}>
                    {selectedOrder.status_label ||
                      STATUS_OPTIONS[selectedOrder.status]}
                  </span>
                </div>
              </div>

              {/* PAYMENT METHOD */}

              <div className="order-detail-item">
                <div className="order-detail-label">Phương thức thanh toán</div>

                <div className="order-detail-value">
                  <span
                    className={getPaymentMethodClass(
                      selectedOrder.payment_method,
                    )}
                  >
                    {selectedOrder.payment_method_label ||
                      getPaymentMethodLabel(selectedOrder.payment_method)}
                  </span>
                </div>
              </div>

              {/* PAYMENT STATUS */}

              <div className="order-detail-item">
                <div className="order-detail-label">Trạng thái thanh toán</div>

                <div className="order-detail-value">
                  <span
                    className={getPaymentStatusClass(
                      selectedOrder.payment_status,
                    )}
                  >
                    {getPaymentStatusLabel(
                      selectedOrder.payment_status,
                      selectedOrder.payment_method,
                    )}
                  </span>

                  {selectedOrder.transaction_code && (
                    <div className="order-payment-note">
                      Mã giao dịch: {selectedOrder.transaction_code}
                    </div>
                  )}

                  {selectedOrder.paid_at && (
                    <div className="order-payment-note">
                      Thanh toán lúc: {formatDateTime(selectedOrder.paid_at)}
                    </div>
                  )}
                </div>
              </div>

              {/* NOTE */}

              <div className="order-detail-item">
                <div className="order-detail-label">Ghi chú</div>

                <div className="order-detail-value">
                  {selectedOrder.note || "Không có"}
                </div>
              </div>

              {/* CREATED DATE */}

              <div className="order-detail-item">
                <div className="order-detail-label">Ngày tạo</div>

                <div className="order-detail-value">
                  {formatDateTime(selectedOrder.created_at)}
                </div>
              </div>
            </div>

            {/* =============================================
                PRODUCTS
            ============================================= */}

            <div className="order-section-title">Sản phẩm trong đơn</div>

            <div className="order-table-wrap">
              <table className="order-table order-detail-table">
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
                        {/* PRODUCT CODE */}

                        <td>
                          <strong>{getProductCode(item)}</strong>
                        </td>

                        {/* PRODUCT NAME */}

                        <td>{item.product_name}</td>

                        {/* PRODUCT IMAGE */}

                        <td>
                          <img
                            src={getImageUrl(item.product_image)}
                            alt={item.product_name || "Sản phẩm"}
                            style={{
                              width: "72px",
                              height: "72px",
                              objectFit: "cover",
                              borderRadius: "10px",
                              border: "1px solid #e5e7eb",
                              background: "#ffffff",
                              display: "block",
                            }}
                            onError={(event) => {
                              event.currentTarget.onerror = null;

                              event.currentTarget.src = "/images/no-image.png";
                            }}
                          />
                        </td>

                        {/* PRICE */}

                        <td>{formatMoney(item.price)}</td>

                        {/* QUANTITY */}

                        <td>{item.quantity}</td>

                        {/* TOTAL */}

                        <td className="order-money">
                          {formatMoney(item.total_price)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="order-empty">
                        Không có sản phẩm trong đơn
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* =============================================
                TOTAL
            ============================================= */}

            <div className="order-total">
              Tổng tiền: {formatMoney(selectedOrder.total_amount)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
