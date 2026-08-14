import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import "./Checkout.css";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import {
  createReorderCheckout,
  getReorderCheckout,
} from "../../../controllers/orderController";

const SHIPPING_FEE = 30000;

const IMAGE_BASE_URL =
  "http://localhost:5000";

const formatMoney = (value) => {
  return `${Number(
    value || 0
  ).toLocaleString("vi-VN")}đ`;
};

const getImageUrl = (
  imageUrl
) => {
  if (!imageUrl) {
    return "";
  }

  if (
    imageUrl.startsWith(
      "http://"
    ) ||
    imageUrl.startsWith(
      "https://"
    )
  ) {
    return imageUrl;
  }

  return `${IMAGE_BASE_URL}${imageUrl}`;
};

const PAYMENT_INFO = {
  cod: {
    title:
      "Thanh toán khi nhận hàng",

    description:
      "Bạn thanh toán bằng tiền mặt khi nhân viên giao hàng giao sản phẩm tới địa chỉ nhận hàng.",

    icon:
      "bi-cash-coin",

    className:
      "cod",

    tag:
      "COD",
  },

  bank: {
    title:
      "Chuyển khoản ngân hàng",

    description:
      "Sau khi đặt hàng, hệ thống sẽ hiển thị thông tin chuyển khoản theo mã đơn hàng.",

    icon:
      "bi-bank",

    className:
      "bank",

    tag:
      "QR Bank",
  },

  momo: {
    title:
      "Thanh toán online MoMo",

    description:
      "Thanh toán qua thẻ ATM / Napas trên cổng MoMo, hệ thống tự cập nhật trạng thái đơn hàng.",

    icon:
      "bi-credit-card-2-front",

    className:
      "momo",

    tag:
      "Khuyên dùng",
  },
};

function ReorderCheckout() {
  const {
    id,
  } = useParams();

  const navigate =
    useNavigate();

  const [
    checkoutData,
    setCheckoutData,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    errors,
    setErrors,
  ] = useState({});

  const [
    form,
    setForm,
  ] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    note: "",
    payment: "cod",
  });

  const loadCheckout =
    async () => {
      try {
        setLoading(true);
        setLoadError("");

        const result =
          await getReorderCheckout(
            id
          );

        setCheckoutData(
          result
        );

        const source =
          result.source_order ||
          {};

        setForm(
          (current) => ({
            ...current,

            name:
              source.shipping_name ||
              "",

            phone:
              source.shipping_phone ||
              "",

            email:
              source.shipping_email ||
              "",

            address:
              source.shipping_address ||
              "",

            note: "",
          })
        );
      } catch (error) {
        setCheckoutData(null);

        setLoadError(
          error.message ||
          "Không thể tải thông tin mua lại."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const items =
    Array.isArray(
      checkoutData?.items
    )
      ? checkoutData.items
      : [];

  const unavailableItems =
    Array.isArray(
      checkoutData?.unavailable_items
    )
      ? checkoutData.unavailable_items
      : [];

  const subtotal =
    useMemo(() => {
      if (
        Number(
          checkoutData?.subtotal ||
          0
        ) > 0
      ) {
        return Number(
          checkoutData.subtotal
        );
      }

      return items.reduce(
        (sum, item) =>
          sum +
          Number(
            item.total_price ||
            0
          ),
        0
      );
    }, [
      checkoutData,
      items,
    ]);

  const shipping =
    items.length > 0
      ? SHIPPING_FEE
      : 0;

  const discount = 0;

  const total =
    Math.max(
      subtotal -
      discount +
      shipping,
      0
    );

  const selectedPayment =
    PAYMENT_INFO[
      form.payment
    ] ||
    PAYMENT_INFO.cod;

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );

    setErrors(
      (current) => ({
        ...current,
        [name]: "",
      })
    );
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name =
        "Vui lòng nhập họ tên";
    }

    if (!form.phone.trim()) {
      nextErrors.phone =
        "Vui lòng nhập số điện thoại";
    } else if (
      !/^(0|\+84)[0-9]{9,10}$/.test(
        form.phone.trim()
      )
    ) {
      nextErrors.phone =
        "Số điện thoại không hợp lệ";
    }

    if (!form.email.trim()) {
      nextErrors.email =
        "Vui lòng nhập email nhận thông báo đơn hàng";
    } else {
      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailRegex.test(
          form.email.trim()
        )
      ) {
        nextErrors.email =
          "Email không hợp lệ";
      }
    }

    if (!form.address.trim()) {
      nextErrors.address =
        "Vui lòng nhập địa chỉ nhận hàng";
    }

    if (
      ![
        "cod",
        "bank",
        "momo",
      ].includes(
        form.payment
      )
    ) {
      nextErrors.payment =
        "Phương thức thanh toán không hợp lệ";
    }

    if (
      items.length === 0
    ) {
      nextErrors.cart =
        "Không có sản phẩm nào còn khả dụng để mua lại";
    }

    setErrors(
      nextErrors
    );

    return (
      Object.keys(
        nextErrors
      ).length === 0
    );
  };

  const handleCheckout =
    async () => {
      if (!validateForm()) {
        return;
      }

      try {
        setSubmitting(true);

        const result =
          await createReorderCheckout(
            id,
            {
              shipping_name:
                form.name.trim(),

              shipping_phone:
                form.phone.trim(),

              shipping_email:
                form.email.trim(),

              shipping_address:
                form.address.trim(),

              note:
                form.note.trim(),

              payment_method:
                form.payment,

              discount_amount:
                discount,

              shipping_fee:
                shipping,
            }
          );

        const responseData =
          result.data ||
          {};

        const order =
          responseData.order ||
          responseData;

        const orderId =
          order?.id;

        if (
          form.payment ===
            "momo" &&
          responseData.payment_url
        ) {
          window.location.href =
            responseData.payment_url;

          return;
        }

        if (
          form.payment ===
          "bank"
        ) {
          navigate(
            `/order-success?order_id=${orderId || ""}&payment=bank`
          );

          return;
        }

        navigate(
          `/order-success?order_id=${orderId || ""}&payment=cod`
        );
      } catch (error) {
        alert(
          error.message ||
          "Đặt lại đơn hàng thất bại. Vui lòng thử lại."
        );

        /*
         * Tồn kho có thể vừa thay đổi trong lúc người dùng đang checkout.
         * Tải lại preview để hiển thị dữ liệu hiện tại.
         */
        await loadCheckout();
      } finally {
        setSubmitting(false);
      }
    };

  return (
    <div className="ck-page">
      <Header />

      <div className="ck-container">
        <div className="ck-breadcrumb">
          <Link to="/">
            Trang chủ
          </Link>

          <span>/</span>

          <Link to="/account/orders">
            Đơn hàng
          </Link>

          <span>/</span>

          <span>
            Mua lại
          </span>
        </div>

        <div className="ck-title">
          <span className="ck-kicker">
            Mua lại đơn hàng
          </span>

          <h1>
            Xác nhận đơn mua lại
          </h1>

          <p>
            Sản phẩm của đơn mua lại
            được thanh toán riêng và
            không thay đổi giỏ hàng hiện tại.
          </p>
        </div>

        {loading ? (
          <div className="ck-loading">
            <i className="bi bi-arrow-repeat" />

            <span>
              Đang kiểm tra sản phẩm
              và tồn kho hiện tại...
            </span>
          </div>
        ) : loadError ? (
          <div className="ck-empty">
            <i className="bi bi-exclamation-circle" />

            <h2>
              Không thể mua lại đơn hàng
            </h2>

            <p>
              {loadError}
            </p>

            <button
              type="button"
              className="ck-btn-empty"
              onClick={
                loadCheckout
              }
            >
              Tải lại
            </button>

            <Link
              to="/account/orders"
              className="ck-btn-outline"
            >
              Quay lại đơn hàng
            </Link>
          </div>
        ) : items.length === 0 ? (
          <div className="ck-empty">
            <i className="bi bi-cart-x" />

            <h2>
              Không còn sản phẩm khả dụng
            </h2>

            <p>
              Các sản phẩm trong đơn cũ
              hiện đã hết hàng hoặc ngừng bán.
            </p>

            <Link
              to="/account/orders"
              className="ck-btn-empty"
            >
              Quay lại đơn hàng
            </Link>
          </div>
        ) : (
          <div className="ck-grid">
            <div className="ck-form">
              <div className="ck-section-head">
                <div>
                  <h2>
                    Thông tin nhận hàng
                  </h2>

                  <p>
                    Có thể thay đổi thông tin
                    nhận hàng cho đơn mua lại.
                  </p>
                </div>

                <span>1</span>
              </div>

              <div
                className="ck-error-box"
                style={{
                  marginBottom:
                    "18px",
                }}
              >
                <strong>
                  Giỏ hàng hiện tại được giữ nguyên.
                </strong>
                {" "}
                Đơn này được tạo trực tiếp từ
                đơn đã hủy{" "}
                <strong>
                  {
                    checkoutData
                      ?.source_order
                      ?.order_code
                  }
                </strong>
                .
              </div>

              {errors.cart && (
                <div className="ck-error-box">
                  {errors.cart}
                </div>
              )}

              <div className="ck-field-grid">
                <div className="ck-field">
                  <label>
                    Họ và tên
                  </label>

                  <input
                    name="name"
                    placeholder="VD: Nguyễn Văn A"
                    value={
                      form.name
                    }
                    onChange={
                      handleChange
                    }
                  />

                  {errors.name && (
                    <small>
                      {errors.name}
                    </small>
                  )}
                </div>

                <div className="ck-field">
                  <label>
                    Số điện thoại
                  </label>

                  <input
                    name="phone"
                    placeholder="VD: 0901234567"
                    value={
                      form.phone
                    }
                    onChange={
                      handleChange
                    }
                  />

                  {errors.phone && (
                    <small>
                      {errors.phone}
                    </small>
                  )}
                </div>
              </div>

              <div className="ck-field">
                <label>
                  Email
                </label>

                <input
                  name="email"
                  placeholder="Email nhận thông báo đơn hàng"
                  value={
                    form.email
                  }
                  onChange={
                    handleChange
                  }
                />

                {errors.email && (
                  <small>
                    {errors.email}
                  </small>
                )}
              </div>

              <div className="ck-field">
                <label>
                  Địa chỉ nhận hàng
                </label>

                <textarea
                  name="address"
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                  value={
                    form.address
                  }
                  onChange={
                    handleChange
                  }
                />

                {errors.address && (
                  <small>
                    {errors.address}
                  </small>
                )}
              </div>

              <div className="ck-field">
                <label>
                  Ghi chú
                </label>

                <textarea
                  name="note"
                  placeholder="Ghi chú cho đơn mua lại nếu có"
                  value={
                    form.note
                  }
                  onChange={
                    handleChange
                  }
                />
              </div>

              <div className="ck-section-head ck-payment-head">
                <div>
                  <h2>
                    Phương thức thanh toán
                  </h2>

                  <p>
                    Chọn cách thanh toán
                    cho đơn mua lại.
                  </p>
                </div>

                <span>2</span>
              </div>

              <div className="ck-payment">
                <label className="ck-pay-option">
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={
                      form.payment ===
                      "cod"
                    }
                    onChange={
                      handleChange
                    }
                  />

                  <div className="ck-pay-card">
                    <div className="ck-pay-icon cod">
                      <i className="bi bi-cash-coin" />
                    </div>

                    <div className="ck-pay-content">
                      <div className="ck-pay-top">
                        <span className="ck-pay-title">
                          Thanh toán khi nhận hàng
                        </span>

                        <span className="ck-pay-tag">
                          COD
                        </span>
                      </div>

                      <span className="ck-pay-sub">
                        Trả tiền mặt khi nhận sản phẩm.
                      </span>
                    </div>

                    <span className="ck-pay-check">
                      <i className="bi bi-check-lg" />
                    </span>
                  </div>
                </label>

                <label className="ck-pay-option">
                  <input
                    type="radio"
                    name="payment"
                    value="bank"
                    checked={
                      form.payment ===
                      "bank"
                    }
                    onChange={
                      handleChange
                    }
                  />

                  <div className="ck-pay-card">
                    <div className="ck-pay-icon bank">
                      <i className="bi bi-bank" />
                    </div>

                    <div className="ck-pay-content">
                      <div className="ck-pay-top">
                        <span className="ck-pay-title">
                          Chuyển khoản ngân hàng
                        </span>

                        <span className="ck-pay-tag">
                          QR Bank
                        </span>
                      </div>

                      <span className="ck-pay-sub">
                        Quét QR hoặc chuyển khoản
                        theo mã đơn mới.
                      </span>
                    </div>

                    <span className="ck-pay-check">
                      <i className="bi bi-check-lg" />
                    </span>
                  </div>
                </label>

                <label className="ck-pay-option">
                  <input
                    type="radio"
                    name="payment"
                    value="momo"
                    checked={
                      form.payment ===
                      "momo"
                    }
                    onChange={
                      handleChange
                    }
                  />

                  <div className="ck-pay-card">
                    <div className="ck-pay-icon momo">
                      <i className="bi bi-credit-card-2-front" />
                    </div>

                    <div className="ck-pay-content">
                      <div className="ck-pay-top">
                        <span className="ck-pay-title">
                          Thanh toán online MoMo
                        </span>

                        <span className="ck-pay-tag recommended">
                          Khuyên dùng
                        </span>
                      </div>

                      <span className="ck-pay-sub">
                        Thanh toán qua thẻ ATM /
                        Napas trên cổng MoMo.
                      </span>
                    </div>

                    <span className="ck-pay-check">
                      <i className="bi bi-check-lg" />
                    </span>
                  </div>
                </label>
              </div>

              <div
                className={`ck-payment-helper ${selectedPayment.className}`}
              >
                <div
                  className={`ck-payment-helper-icon ${selectedPayment.className}`}
                >
                  <i
                    className={`bi ${selectedPayment.icon}`}
                  />
                </div>

                <div>
                  <strong>
                    {selectedPayment.title}
                  </strong>

                  <p>
                    {selectedPayment.description}
                  </p>
                </div>
              </div>

              {errors.payment && (
                <div className="ck-error-box">
                  {errors.payment}
                </div>
              )}

              <button
                className="ck-btn-primary"
                type="button"
                onClick={
                  handleCheckout
                }
                disabled={
                  submitting
                }
              >
                {submitting ? (
                  <>
                    <i className="bi bi-arrow-repeat ck-btn-spin" />
                    Đang tạo đơn...
                  </>
                ) : form.payment ===
                  "momo" ? (
                  "Tiếp tục thanh toán MoMo"
                ) : (
                  "Đặt lại đơn hàng"
                )}
              </button>
            </div>

            <div className="ck-summary">
              <h2>
                Đơn mua lại
              </h2>

              <div className="ck-summary-count">
                {items.reduce(
                  (
                    sum,
                    item
                  ) =>
                    sum +
                    Number(
                      item.quantity ||
                      0
                    ),
                  0
                )}
                {" "}
                sản phẩm
              </div>

              <div className="ck-summary-items">
                {items.map(
                  (item) => {
                    const itemPrice =
                      Number(
                        item.final_price ||
                        item.price ||
                        0
                      );

                    const itemQuantity =
                      Number(
                        item.quantity ||
                        0
                      );

                    const itemTotal =
                      Number(
                        item.total_price ||
                        0
                      ) ||
                      itemPrice *
                      itemQuantity;

                    return (
                      <div
                        className="ck-item"
                        key={
                          item.product_id
                        }
                      >
                        <div>
                          <span className="ck-item-name">
                            {item.product_name}
                          </span>

                          <small>
                            SL:{" "}
                            {item.quantity}
                            {" × "}
                            {formatMoney(
                              itemPrice
                            )}
                          </small>

                          {item.quantity_adjusted && (
                            <small
                              style={{
                                display:
                                  "block",

                                marginTop:
                                  "4px",

                                color:
                                  "#d97706",
                              }}
                            >
                              Đơn cũ:{" "}
                              {
                                item.requested_quantity
                              }
                              {" • "}
                              Hiện chỉ còn{" "}
                              {
                                item.quantity
                              }
                            </small>
                          )}
                        </div>

                        <strong>
                          {formatMoney(
                            itemTotal
                          )}
                        </strong>
                      </div>
                    );
                  }
                )}
              </div>

              {unavailableItems.length >
                0 && (
                <>
                  <div className="ck-divider" />

                  <div className="ck-error-box">
                    <strong>
                      Một số sản phẩm đã thay đổi:
                    </strong>

                    {unavailableItems.map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          key={`${item.product_id}-${index}`}
                          style={{
                            marginTop:
                              "7px",
                          }}
                        >
                          {
                            item.product_name
                          }
                          :{" "}
                          {item.reason}
                        </div>
                      )
                    )}
                  </div>
                </>
              )}

              <div className="ck-divider" />

              <div className="ck-row">
                <span>
                  Tạm tính
                </span>

                <span>
                  {formatMoney(
                    subtotal
                  )}
                </span>
              </div>

              <div className="ck-row">
                <span>
                  Giảm giá
                </span>

                <span>
                  -{formatMoney(
                    discount
                  )}
                </span>
              </div>

              <div className="ck-row">
                <span>
                  Vận chuyển
                </span>

                <span>
                  {shipping === 0
                    ? "0đ"
                    : formatMoney(
                        shipping
                      )}
                </span>
              </div>

              <div className="ck-total">
                <span>
                  Tổng thanh toán
                </span>

                <span>
                  {formatMoney(
                    total
                  )}
                </span>
              </div>

              <div className="ck-trust-box">
                <div>
                  <i className="bi bi-shield-check" />

                  <span>
                    Giỏ hàng hiện tại
                    không bị thay đổi
                  </span>
                </div>

                <div>
                  <i className="bi bi-arrow-repeat" />

                  <span>
                    Giá và tồn kho
                    được kiểm tra lại
                  </span>
                </div>

                <div>
                  <i className="bi bi-truck" />

                  <span>
                    Tạo một đơn hàng mới
                    từ đơn đã hủy
                  </span>
                </div>
              </div>

              <Link
                to={`/account/orders/${id}`}
                className="ck-btn-outline"
              >
                Quay lại đơn cũ
              </Link>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default ReorderCheckout;