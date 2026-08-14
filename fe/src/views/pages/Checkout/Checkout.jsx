import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import "./Checkout.css";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import { useCart } from "../../../context/CartContext";

import orderService from "../../../services/orderService";
import shippingService from "../../../services/shippingService";

// ======================================================
// FORMAT MONEY
// ======================================================

const formatMoney = (value) => {
  return `${Number(
    value || 0,
  ).toLocaleString("vi-VN")}đ`;
};

// ======================================================
// KIỂM TRA TEXT CÓ NỘI DUNG THỰC
// Chặn trường hợp chỉ nhập ký tự đặc biệt.
// ======================================================

const hasMeaningfulText = (value) => {
  return /[\p{L}\p{N}]/u.test(
    String(value || ""),
  );
};

// ======================================================
// PAYMENT INFO
// ======================================================

const PAYMENT_INFO = {
  cod: {
    title: "Thanh toán khi nhận hàng",

    description:
      "Bạn thanh toán bằng tiền mặt khi nhân viên giao hàng giao sản phẩm tới địa chỉ nhận hàng.",

    icon: "bi-cash-coin",

    className: "cod",

    tag: "COD",
  },

  bank: {
    title: "Chuyển khoản ngân hàng",

    description:
      "Sau khi đặt hàng, hệ thống sẽ hiển thị thông tin chuyển khoản theo mã đơn hàng.",

    icon: "bi-bank",

    className: "bank",

    tag: "QR Bank",
  },

  momo: {
    title: "Thanh toán online MoMo",

    description:
      "Thanh toán qua thẻ ATM / Napas trên cổng MoMo, hệ thống tự cập nhật trạng thái đơn hàng.",

    icon: "bi-credit-card-2-front",

    className: "momo",

    tag: "Khuyên dùng",
  },
};

// ======================================================
// CHECKOUT
// ======================================================

const Checkout = () => {
  const navigate = useNavigate();

  const {
    userId,
    cartItems,
    cartLoading,
    cartCount,
    cartTotal,
    clearCart,
  } = useCart();

  // ====================================================
  // FORM
  // ====================================================

  const [form, setForm] = useState({
    name: "",

    phone: "",

    email: "",

    // Tỉnh/thành lấy từ shipping_rates
    province_code: "",

    // Người dùng nhập
    district: "",

    ward: "",

    address_detail: "",

    note: "",

    payment: "cod",
  });

  const [errors, setErrors] =
    useState({});

  const [submitting, setSubmitting] =
    useState(false);

  // ====================================================
  // SHIPPING
  // ====================================================

  const [
    shippingRates,
    setShippingRates,
  ] = useState([]);

  const [
    shippingRatesLoading,
    setShippingRatesLoading,
  ] = useState(false);

  const [
    shippingCalculating,
    setShippingCalculating,
  ] = useState(false);

  const [
    shippingInfo,
    setShippingInfo,
  ] = useState(null);

  const [
    shippingError,
    setShippingError,
  ] = useState("");

  // ====================================================
  // SUBTOTAL
  // ====================================================

  const subtotal = useMemo(() => {
    if (
      Number(cartTotal || 0) > 0
    ) {
      return Number(
        cartTotal || 0,
      );
    }

    return cartItems.reduce(
      (total, item) => {
        const itemPrice =
          Number(
            item.final_price ||
              item.price ||
              0,
          );

        const itemQuantity =
          Number(
            item.quantity ||
              0,
          );

        const itemTotal =
          Number(
            item.total_price ||
              0,
          );

        if (itemTotal > 0) {
          return (
            total +
            itemTotal
          );
        }

        return (
          total +
          itemPrice *
            itemQuantity
        );
      },
      0,
    );
  }, [
    cartItems,
    cartTotal,
  ]);

  // ====================================================
  // DISCOUNT
  // Coupon sẽ nối Checkout ở bước sau.
  // ====================================================

  const discount = 0;

  // ====================================================
  // SHIPPING FEE
  // ====================================================

  const shipping =
    form.province_code &&
    shippingInfo
      ? Number(
          shippingInfo.shipping_fee ||
            0,
        )
      : 0;

  // ====================================================
  // TOTAL
  // ====================================================

  const total = Math.max(
    subtotal -
      discount +
      shipping,
    0,
  );

  // ====================================================
  // PAYMENT
  // ====================================================

  const selectedPayment =
    PAYMENT_INFO[
      form.payment
    ] ||
    PAYMENT_INFO.cod;

  // ====================================================
  // SELECTED PROVINCE
  // ====================================================

  const selectedProvince =
    useMemo(() => {
      return (
        shippingRates.find(
          (item) =>
            item.province_code ===
            form.province_code,
        ) || null
      );
    }, [
      shippingRates,
      form.province_code,
    ]);

  // ====================================================
  // PREVIEW ĐỊA CHỈ
  // ====================================================

  const fullAddressPreview =
    useMemo(() => {
      const parts = [
        form.address_detail.trim(),
        form.ward.trim(),
        form.district.trim(),
        selectedProvince
          ?.province_name ||
          "",
      ].filter(Boolean);

      return parts.join(", ");
    }, [
      form.address_detail,
      form.ward,
      form.district,
      selectedProvince,
    ]);

  // ====================================================
  // ERROR MESSAGE
  // ====================================================

  const getErrorMessage = (
    error,
    fallback,
  ) => {
    return (
      error?.response?.data
        ?.message ||
      error?.message ||
      fallback
    );
  };

  // ====================================================
  // LOAD SHIPPING RATES
  // ====================================================

  useEffect(() => {
    let cancelled = false;

    const loadShippingRates =
      async () => {
        try {
          setShippingRatesLoading(
            true,
          );

          setShippingError("");

          const response =
            await shippingService.getActiveRates();

          if (cancelled) {
            return;
          }

          const rates =
            response?.data?.data;

          setShippingRates(
            Array.isArray(rates)
              ? rates
              : [],
          );
        } catch (error) {
          if (cancelled) {
            return;
          }

          setShippingRates([]);

          setShippingError(
            getErrorMessage(
              error,
              "Không thể tải danh sách khu vực vận chuyển.",
            ),
          );
        } finally {
          if (!cancelled) {
            setShippingRatesLoading(
              false,
            );
          }
        }
      };

    loadShippingRates();

    return () => {
      cancelled = true;
    };
  }, []);

  // ====================================================
  // CALCULATE SHIPPING
  //
  // Chạy lại khi:
  // - đổi tỉnh
  // - subtotal thay đổi
  // ====================================================

  useEffect(() => {
    if (
      !form.province_code
    ) {
      setShippingInfo(null);
      setShippingError("");

      return;
    }

    if (subtotal <= 0) {
      setShippingInfo(null);

      return;
    }

    let cancelled = false;

    const calculateShipping =
      async () => {
        try {
          setShippingCalculating(
            true,
          );

          setShippingError("");

          const response =
            await shippingService.calculate(
              {
                province_code:
                  form.province_code,

                subtotal,
              },
            );

          if (cancelled) {
            return;
          }

          const data =
            response?.data?.data;

          if (!data) {
            throw new Error(
              "Không nhận được thông tin phí vận chuyển",
            );
          }

          setShippingInfo(
            data,
          );
        } catch (error) {
          if (cancelled) {
            return;
          }

          setShippingInfo(null);

          setShippingError(
            getErrorMessage(
              error,
              "Không thể tính phí vận chuyển.",
            ),
          );
        } finally {
          if (!cancelled) {
            setShippingCalculating(
              false,
            );
          }
        }
      };

    calculateShipping();

    return () => {
      cancelled = true;
    };
  }, [
    form.province_code,
    subtotal,
  ]);

  // ====================================================
  // HANDLE CHANGE
  // ====================================================

  const handleChange = (
    event,
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (previous) => ({
        ...previous,

        [name]: value,
      }),
    );

    setErrors(
      (previous) => ({
        ...previous,

        [name]: "",

        ...(name ===
        "province_code"
          ? {
              shipping: "",
            }
          : {}),
      }),
    );

    // Đổi tỉnh thì xóa phí cũ,
    // chờ Backend tính lại.
    if (
      name ===
      "province_code"
    ) {
      setShippingInfo(null);
      setShippingError("");
    }
  };

  // ====================================================
  // VALIDATE FORM
  // ====================================================

  const validateForm = () => {
    const newErrors = {};

    // ==============================
    // NAME
    // ==============================

    if (!form.name.trim()) {
      newErrors.name =
        "Vui lòng nhập họ tên";
    } else if (
      form.name.trim().length <
      2
    ) {
      newErrors.name =
        "Họ tên quá ngắn";
    } else if (
      !hasMeaningfulText(
        form.name,
      )
    ) {
      newErrors.name =
        "Họ tên không hợp lệ";
    }

    // ==============================
    // PHONE
    // ==============================

    if (!form.phone.trim()) {
      newErrors.phone =
        "Vui lòng nhập số điện thoại";
    } else if (
      !/^(0|\+84)[0-9]{9,10}$/.test(
        form.phone.trim(),
      )
    ) {
      newErrors.phone =
        "Số điện thoại không hợp lệ";
    }

    // ==============================
    // EMAIL
    // ==============================

    if (!form.email.trim()) {
      newErrors.email =
        "Vui lòng nhập email nhận thông báo đơn hàng";
    } else {
      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailRegex.test(
          form.email.trim(),
        )
      ) {
        newErrors.email =
          "Email không hợp lệ";
      }
    }

    // ==============================
    // PROVINCE
    // ==============================

    if (
      !form.province_code
    ) {
      newErrors.province_code =
        "Vui lòng chọn tỉnh / thành phố";
    }

    // ==============================
    // DISTRICT
    // ==============================

    const district =
      form.district.trim();

    if (!district) {
      newErrors.district =
        "Vui lòng nhập quận / huyện";
    } else if (
      district.length < 2
    ) {
      newErrors.district =
        "Quận / huyện quá ngắn";
    } else if (
      !hasMeaningfulText(
        district,
      )
    ) {
      newErrors.district =
        "Quận / huyện không hợp lệ";
    }

    // ==============================
    // WARD
    // ==============================

    const ward =
      form.ward.trim();

    if (!ward) {
      newErrors.ward =
        "Vui lòng nhập phường / xã";
    } else if (
      ward.length < 2
    ) {
      newErrors.ward =
        "Phường / xã quá ngắn";
    } else if (
      !hasMeaningfulText(
        ward,
      )
    ) {
      newErrors.ward =
        "Phường / xã không hợp lệ";
    }

    // ==============================
    // ADDRESS DETAIL
    // ==============================

    const addressDetail =
      form.address_detail.trim();

    if (!addressDetail) {
      newErrors.address_detail =
        "Vui lòng nhập số nhà, tên đường";
    } else if (
      addressDetail.length < 5
    ) {
      newErrors.address_detail =
        "Địa chỉ cụ thể quá ngắn";
    } else if (
      !hasMeaningfulText(
        addressDetail,
      )
    ) {
      newErrors.address_detail =
        "Địa chỉ cụ thể không hợp lệ";
    }

    // ==============================
    // PAYMENT
    // ==============================

    if (!form.payment) {
      newErrors.payment =
        "Vui lòng chọn phương thức thanh toán";
    }

    if (
      ![
        "cod",
        "bank",
        "momo",
      ].includes(
        form.payment,
      )
    ) {
      newErrors.payment =
        "Phương thức thanh toán không hợp lệ";
    }

    // ==============================
    // CART
    // ==============================

    if (
      cartItems.length === 0
    ) {
      newErrors.cart =
        "Giỏ hàng đang trống";
    }

    // ==============================
    // SHIPPING
    // ==============================

    if (
      form.province_code &&
      !shippingInfo
    ) {
      newErrors.shipping =
        shippingError ||
        "Chưa xác định được phí vận chuyển";
    }

    setErrors(
      newErrors,
    );

    return (
      Object.keys(
        newErrors,
      ).length === 0
    );
  };

  // ====================================================
  // CLEAR CART
  // ====================================================

  const syncClearCartAfterOrder =
    async () => {
      try {
        await clearCart();
      } catch (error) {
        console.warn(
          "Không thể đồng bộ xóa giỏ hàng sau đặt hàng:",
          error,
        );
      }
    };

  // ====================================================
  // CHECKOUT
  // ====================================================

  const handleCheckout =
    async () => {
      if (!userId) {
        alert(
          "Vui lòng đăng nhập trước khi thanh toán.",
        );

        navigate(
          "/login",
        );

        return;
      }

      if (
        !validateForm()
      ) {
        return;
      }

      try {
        setSubmitting(true);

        // =================================================
        // KIỂM TRA PHÍ SHIP LẠI
        // TRƯỚC KHI TẠO ORDER
        // =================================================

        const shippingResponse =
          await shippingService.calculate(
            {
              province_code:
                form.province_code,

              subtotal,
            },
          );

        const latestShipping =
          shippingResponse?.data
            ?.data;

        if (
          !latestShipping
        ) {
          throw new Error(
            "Không thể xác định phí vận chuyển",
          );
        }

        const finalShippingFee =
          Number(
            latestShipping.shipping_fee ||
              0,
          );

        const finalTotal =
          Math.max(
            subtotal -
              discount +
              finalShippingFee,
            0,
          );

        // =================================================
        // GHÉP ĐỊA CHỈ HOÀN CHỈNH
        // =================================================

        const fullShippingAddress = [
          form.address_detail.trim(),

          form.ward.trim(),

          form.district.trim(),

          latestShipping.province_name,
        ]
          .filter(Boolean)
          .join(", ");

        // =================================================
        // ORDER PAYLOAD
        // =================================================

        const payload = {
          user_id:
            userId,

          shipping_name:
            form.name.trim(),

          shipping_phone:
            form.phone.trim(),

          shipping_email:
            form.email.trim(),

          // Ví dụ:
          // 123 Nguyễn Văn Cừ,
          // An Khánh,
          // Ninh Kiều,
          // Cần Thơ
          shipping_address:
            fullShippingAddress,

          // ===============================
          // SHIPPING LOCATION
          // ===============================

          shipping_province_code:
            latestShipping.province_code,

          shipping_province_name:
            latestShipping.province_name,

          shipping_fee:
            finalShippingFee,

          // ===============================
          // ORDER
          // ===============================

          note:
            form.note.trim(),

          payment_method:
            form.payment,

          discount_amount:
            discount,

          total_amount:
            finalTotal,
        };

        const res =
          await orderService.createOrder(
            payload,
          );

        const responseData =
          res.data?.data;

        const order =
          responseData?.order ||
          responseData;

        const orderId =
          order?.id;

        // =================================================
        // MOMO
        // =================================================

        if (
          form.payment ===
            "momo" &&
          responseData?.payment_url
        ) {
          window.location.href =
            responseData.payment_url;

          return;
        }

        // =================================================
        // CLEAR CART
        // =================================================

        await syncClearCartAfterOrder();

        // =================================================
        // BANK
        // =================================================

        if (
          form.payment ===
          "bank"
        ) {
          navigate(
            `/order-success?order_id=${
              orderId || ""
            }&payment=bank`,
          );

          return;
        }

        // =================================================
        // COD
        // =================================================

        navigate(
          `/order-success?order_id=${
            orderId || ""
          }&payment=cod`,
        );
      } catch (error) {
        console.error(
          "Lỗi đặt hàng:",
          error,
        );

        alert(
          error.response?.data
            ?.message ||
            error.message ||
            "Đặt hàng thất bại. Vui lòng kiểm tra lại.",
        );
      } finally {
        setSubmitting(false);
      }
    };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="ck-page">
      <Header />

      <div className="ck-container">
        {/* =================================================
            BREADCRUMB
        ================================================= */}

        <div className="ck-breadcrumb">
          <Link to="/">
            Trang chủ
          </Link>

          <span>/</span>

          <Link to="/cart">
            Giỏ hàng
          </Link>

          <span>/</span>

          <span>
            Thanh toán
          </span>
        </div>

        {/* =================================================
            TITLE
        ================================================= */}

        <div className="ck-title">
          <span className="ck-kicker">
            Thanh toán
          </span>

          <h1>
            Xác nhận đơn hàng
          </h1>

          <p>
            Kiểm tra thông tin nhận hàng và
            phương thức thanh toán trước khi
            đặt hàng.
          </p>
        </div>

        {/* =================================================
            CART STATE
        ================================================= */}

        {cartLoading &&
        cartItems.length ===
          0 ? (
          <div className="ck-loading">
            <i className="bi bi-arrow-repeat" />

            <span>
              Đang tải thông tin giỏ hàng...
            </span>
          </div>
        ) : cartItems.length ===
          0 ? (
          <div className="ck-empty">
            <i className="bi bi-cart-x" />

            <h2>
              Giỏ hàng đang trống
            </h2>

            <p>
              Vui lòng thêm sản phẩm trước khi
              thanh toán.
            </p>

            <Link
              to="/Products"
              className="ck-btn-empty"
            >
              Tiếp tục mua hàng
            </Link>
          </div>
        ) : (
          <div className="ck-grid">
            {/* =================================================
                LEFT
            ================================================= */}

            <div className="ck-form">
              {/* ===============================================
                  THÔNG TIN NHẬN HÀNG
              =============================================== */}

              <div className="ck-section-head">
                <div>
                  <h2>
                    Thông tin nhận hàng
                  </h2>

                  <p>
                    Nhập thông tin chính xác để
                    shop liên hệ và giao hàng.
                  </p>
                </div>

                <span>
                  1
                </span>
              </div>

              {errors.cart && (
                <div className="ck-error-box">
                  {errors.cart}
                </div>
              )}

              {/* NAME + PHONE */}

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
                    maxLength={100}
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
                    maxLength={13}
                  />

                  {errors.phone && (
                    <small>
                      {
                        errors.phone
                      }
                    </small>
                  )}
                </div>
              </div>

              {/* EMAIL */}

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
                  maxLength={150}
                />

                {errors.email && (
                  <small>
                    {errors.email}
                  </small>
                )}
              </div>

              {/* ===============================================
                  TỈNH / THÀNH PHỐ
              =============================================== */}

              <div className="ck-field">
                <label>
                  Tỉnh / Thành phố
                </label>

                <select
                  name="province_code"
                  className="ck-select"
                  value={
                    form.province_code
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    shippingRatesLoading
                  }
                >
                  <option value="">
                    {shippingRatesLoading
                      ? "Đang tải tỉnh/thành..."
                      : "-- Chọn tỉnh / thành phố --"}
                  </option>

                  {shippingRates.map(
                    (rate) => (
                      <option
                        key={
                          rate.id
                        }
                        value={
                          rate.province_code
                        }
                      >
                        {
                          rate.province_name
                        }
                      </option>
                    ),
                  )}
                </select>

                {errors.province_code && (
                  <small>
                    {
                      errors.province_code
                    }
                  </small>
                )}

                {shippingError &&
                  form.province_code && (
                    <small>
                      {
                        shippingError
                      }
                    </small>
                  )}
              </div>

              {/* ===============================================
                  QUẬN/HUYỆN + PHƯỜNG/XÃ
              =============================================== */}

              <div className="ck-field-grid">
                <div className="ck-field">
                  <label>
                    Quận / Huyện
                  </label>

                  <input
                    name="district"
                    placeholder="VD: Ninh Kiều"
                    value={
                      form.district
                    }
                    onChange={
                      handleChange
                    }
                    maxLength={100}
                  />

                  {errors.district && (
                    <small>
                      {
                        errors.district
                      }
                    </small>
                  )}
                </div>

                <div className="ck-field">
                  <label>
                    Phường / Xã
                  </label>

                  <input
                    name="ward"
                    placeholder="VD: An Khánh"
                    value={
                      form.ward
                    }
                    onChange={
                      handleChange
                    }
                    maxLength={100}
                  />

                  {errors.ward && (
                    <small>
                      {
                        errors.ward
                      }
                    </small>
                  )}
                </div>
              </div>

              {/* ===============================================
                  ĐỊA CHỈ CỤ THỂ
              =============================================== */}

              <div className="ck-field">
                <label>
                  Số nhà, tên đường
                </label>

                <input
                  name="address_detail"
                  placeholder="VD: 123 Nguyễn Văn Cừ"
                  value={
                    form.address_detail
                  }
                  onChange={
                    handleChange
                  }
                  maxLength={200}
                />

                {errors.address_detail && (
                  <small>
                    {
                      errors.address_detail
                    }
                  </small>
                )}
              </div>

              {/* ===============================================
                  PREVIEW ĐỊA CHỈ
              =============================================== */}

              {fullAddressPreview && (
                <div className="ck-payment-helper">
                  <div className="ck-payment-helper-icon bank">
                    <i className="bi bi-geo-alt-fill" />
                  </div>

                  <div>
                    <strong>
                      Địa chỉ giao hàng
                    </strong>

                    <p>
                      {
                        fullAddressPreview
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* ===============================================
                  SHIPPING INFO
              =============================================== */}

              {form.province_code && (
                <div className="ck-shipping-info">
                  {shippingCalculating ? (
                    <div className="ck-shipping-loading">
                      <i className="bi bi-arrow-repeat ck-btn-spin" />

                      <span>
                        Đang tính phí vận chuyển...
                      </span>
                    </div>
                  ) : shippingInfo ? (
                    <>
                      <div className="ck-shipping-info-row">
                        <div>
                          <i className="bi bi-geo-alt" />

                          <span>
                            Khu vực giao hàng
                          </span>
                        </div>

                        <strong>
                          {
                            shippingInfo.province_name
                          }
                        </strong>
                      </div>

                      <div className="ck-shipping-info-row">
                        <div>
                          <i className="bi bi-truck" />

                          <span>
                            Phí vận chuyển
                          </span>
                        </div>

                        <strong>
                          {shippingInfo.is_free_shipping
                            ? "Miễn phí"
                            : formatMoney(
                                shippingInfo.shipping_fee,
                              )}
                        </strong>
                      </div>

                      {shippingInfo.is_free_shipping ? (
                        <div className="ck-shipping-free">
                          <i className="bi bi-gift-fill" />

                          <span>
                            Đơn hàng của bạn được miễn phí
                            vận chuyển.
                          </span>
                        </div>
                      ) : Number(
                          shippingInfo.amount_to_free_shipping ||
                            0,
                        ) > 0 ? (
                        <div className="ck-shipping-more">
                          <i className="bi bi-info-circle" />

                          <span>
                            Mua thêm{" "}
                            <strong>
                              {formatMoney(
                                shippingInfo.amount_to_free_shipping,
                              )}
                            </strong>{" "}
                            để được miễn phí vận chuyển.
                          </span>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              )}

              {errors.shipping && (
                <div className="ck-error-box">
                  {
                    errors.shipping
                  }
                </div>
              )}

              {/* NOTE */}

              <div className="ck-field">
                <label>
                  Ghi chú
                </label>

                <textarea
                  name="note"
                  placeholder="Ghi chú cho đơn hàng nếu có"
                  value={
                    form.note
                  }
                  onChange={
                    handleChange
                  }
                  maxLength={500}
                />
              </div>

              {/* ===============================================
                  PAYMENT
              =============================================== */}

              <div className="ck-section-head ck-payment-head">
                <div>
                  <h2>
                    Phương thức thanh toán
                  </h2>

                  <p>
                    Chọn cách thanh toán phù hợp
                    với bạn.
                  </p>
                </div>

                <span>
                  2
                </span>
              </div>

              <div className="ck-payment">
                {/* COD */}

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
                        Trả tiền mặt khi nhận sản
                        phẩm tại địa chỉ giao hàng.
                      </span>
                    </div>

                    <span className="ck-pay-check">
                      <i className="bi bi-check-lg" />
                    </span>
                  </div>
                </label>

                {/* BANK */}

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
                        theo mã đơn hàng.
                      </span>
                    </div>

                    <span className="ck-pay-check">
                      <i className="bi bi-check-lg" />
                    </span>
                  </div>
                </label>

                {/* MOMO */}

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

              {/* PAYMENT DESCRIPTION */}

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
                    {
                      selectedPayment.title
                    }
                  </strong>

                  <p>
                    {
                      selectedPayment.description
                    }
                  </p>
                </div>
              </div>

              {errors.payment && (
                <div className="ck-error-box">
                  {
                    errors.payment
                  }
                </div>
              )}

              {/* ORDER BUTTON */}

              <button
                className="ck-btn-primary"
                type="button"
                onClick={
                  handleCheckout
                }
                disabled={
                  submitting ||
                  shippingCalculating
                }
              >
                {submitting ? (
                  <>
                    <i className="bi bi-arrow-repeat ck-btn-spin" />

                    Đang đặt hàng...
                  </>
                ) : form.payment ===
                  "momo" ? (
                  "Tiếp tục thanh toán MoMo"
                ) : (
                  "Đặt hàng"
                )}
              </button>
            </div>

            {/* =================================================
                SUMMARY
            ================================================= */}

            <div className="ck-summary">
              <h2>
                Đơn hàng
              </h2>

              <div className="ck-summary-count">
                {cartCount ||
                  cartItems.length}{" "}
                sản phẩm trong giỏ
              </div>

              {/* ITEMS */}

              <div className="ck-summary-items">
                {cartItems.map(
                  (item) => {
                    const itemPrice =
                      Number(
                        item.final_price ||
                          item.price ||
                          0,
                      );

                    const itemQuantity =
                      Number(
                        item.quantity ||
                          0,
                      );

                    const itemTotal =
                      Number(
                        item.total_price ||
                          0,
                      ) ||
                      itemPrice *
                        itemQuantity;

                    return (
                      <div
                        className="ck-item"
                        key={item.id}
                      >
                        <div>
                          <span className="ck-item-name">
                            {
                              item.product_name
                            }
                          </span>

                          <small>
                            SL:{" "}
                            {
                              item.quantity
                            }{" "}
                            ×{" "}
                            {formatMoney(
                              itemPrice,
                            )}
                          </small>
                        </div>

                        <strong>
                          {formatMoney(
                            itemTotal,
                          )}
                        </strong>
                      </div>
                    );
                  },
                )}
              </div>

              <div className="ck-divider" />

              {/* SUBTOTAL */}

              <div className="ck-row">
                <span>
                  Tạm tính
                </span>

                <span>
                  {formatMoney(
                    subtotal,
                  )}
                </span>
              </div>

              {/* DISCOUNT */}

              <div className="ck-row">
                <span>
                  Giảm giá
                </span>

                <span>
                  -
                  {formatMoney(
                    discount,
                  )}
                </span>
              </div>

              {/* SHIPPING */}

              <div className="ck-row">
                <span>
                  Vận chuyển
                </span>

                <span>
                  {!form.province_code
                    ? "Chọn tỉnh/thành"
                    : shippingCalculating
                      ? "Đang tính..."
                      : shippingInfo
                        ? shippingInfo.is_free_shipping
                          ? "Miễn phí"
                          : formatMoney(
                              shipping,
                            )
                        : "--"}
                </span>
              </div>

              {/* PROVINCE */}

              {selectedProvince && (
                <div className="ck-row">
                  <span>
                    Giao đến
                  </span>

                  <span>
                    {
                      selectedProvince.province_name
                    }
                  </span>
                </div>
              )}

              {/* TOTAL */}

              <div className="ck-total">
                <span>
                  Tổng thanh toán
                </span>

                <span>
                  {formatMoney(
                    total,
                  )}
                </span>
              </div>

              {/* TRUST */}

              <div className="ck-trust-box">
                <div>
                  <i className="bi bi-shield-check" />

                  <span>
                    Hàng chính hãng, bảo hành
                    theo linh kiện
                  </span>
                </div>

                <div>
                  <i className="bi bi-tools" />

                  <span>
                    Hỗ trợ kiểm tra tương thích
                    khi Build PC
                  </span>
                </div>

                <div>
                  <i className="bi bi-truck" />

                  <span>
                    Giao hàng toàn quốc, đóng
                    gói an toàn
                  </span>
                </div>
              </div>

              <Link
                to="/cart"
                className="ck-btn-outline"
              >
                Xem giỏ hàng
              </Link>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Checkout;