import { useEffect, useMemo, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import "./Checkout.css";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import { useCart } from "../../../context/CartContext";

import orderService from "../../../services/orderService";
import couponService from "../../../services/couponService";
import ghnShippingService from "../../../services/ghnShippingService";

// ============================================================
// FORMAT MONEY
// ============================================================

const formatMoney = (value) => {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
};

// ============================================================
// TEXT VALIDATION
// ============================================================

const hasMeaningfulText = (value) => {
  return /[\p{L}\p{N}]/u.test(String(value || ""));
};

// ============================================================
// LEAD TIME
// ============================================================

const formatLeadTime = (value) => {
  if (!value) {
    return "";
  }

  const numericValue = Number(value);

  if (Number.isFinite(numericValue)) {
    const timestamp =
      numericValue < 1000000000000 ? numericValue * 1000 : numericValue;

    const date = new Date(timestamp);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("vi-VN", {
        weekday: "long",

        day: "2-digit",

        month: "2-digit",

        year: "numeric",
      });
    }
  }

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",

      day: "2-digit",

      month: "2-digit",

      year: "numeric",
    });
  }

  return String(value);
};

// ============================================================
// PAYMENT
// ============================================================

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

// ============================================================
// COMPONENT
// ============================================================

const Checkout = () => {
  const navigate = useNavigate();

  const {
    userId,

    cartItems,

    cartLoading,

    cartCount,

    cartTotal,

    clearCart,

    appliedCoupon,

    setAppliedCoupon,

    clearAppliedCoupon,
  } = useCart();

  // ==========================================================
  // FORM
  // ==========================================================

  const [form, setForm] = useState({
    name: "",

    phone: "",

    email: "",

    province_id: "",

    district_id: "",

    ward_code: "",

    address_detail: "",

    note: "",

    payment: "cod",
  });

  const [errors, setErrors] = useState({});

  const [submitting, setSubmitting] = useState(false);

  // ==========================================================
  // COUPON
  // ==========================================================

  const [validatedCoupon, setValidatedCoupon] = useState(null);

  const [couponValidating, setCouponValidating] = useState(false);

  const [couponError, setCouponError] = useState("");

  // ==========================================================
  // GHN
  // ==========================================================

  const [provinces, setProvinces] = useState([]);

  const [districts, setDistricts] = useState([]);

  const [wards, setWards] = useState([]);

  const [provincesLoading, setProvincesLoading] = useState(false);

  const [districtsLoading, setDistrictsLoading] = useState(false);

  const [wardsLoading, setWardsLoading] = useState(false);

  const [shippingCalculating, setShippingCalculating] = useState(false);

  const [shippingInfo, setShippingInfo] = useState(null);

  const [leadTimeInfo, setLeadTimeInfo] = useState(null);

  const [shippingError, setShippingError] = useState("");

  // ==========================================================
  // ERROR HELPER
  // ==========================================================

  const getErrorMessage = (error, fallback) => {
    return error?.response?.data?.message || error?.message || fallback;
  };

  // ==========================================================
  // SUBTOTAL
  // ==========================================================

  const subtotal = useMemo(() => {
    if (Number(cartTotal || 0) > 0) {
      return Number(cartTotal || 0);
    }

    return cartItems.reduce((total, item) => {
      const itemPrice = Number(item.final_price || item.price || 0);

      const itemQuantity = Number(item.quantity || 0);

      const itemTotal = Number(item.total_price || 0);

      if (itemTotal > 0) {
        return total + itemTotal;
      }

      return total + itemPrice * itemQuantity;
    }, 0);
  }, [cartItems, cartTotal]);

  // ==========================================================
  // DISCOUNT
  // ==========================================================

  const discount = useMemo(() => {
    return Number(validatedCoupon?.discount_amount || 0);
  }, [validatedCoupon]);

  // ==========================================================
  // SHIPPING
  // ==========================================================

  const shipping = shippingInfo
    ? Number(shippingInfo.total || shippingInfo.shipping_fee || 0)
    : 0;

  // ==========================================================
  // TOTAL PREVIEW
  //
  // Chỉ để hiển thị.
  // Backend sẽ tự tính lại.
  // ==========================================================

  const total = Math.max(subtotal - discount + shipping, 0);

  // ==========================================================
  // PAYMENT
  // ==========================================================

  const selectedPayment = PAYMENT_INFO[form.payment] || PAYMENT_INFO.cod;

  // ==========================================================
  // SELECTED LOCATION
  // ==========================================================

  const selectedProvince = useMemo(() => {
    return (
      provinces.find(
        (item) => String(item.ProvinceID) === String(form.province_id),
      ) || null
    );
  }, [provinces, form.province_id]);

  const selectedDistrict = useMemo(() => {
    return (
      districts.find(
        (item) => String(item.DistrictID) === String(form.district_id),
      ) || null
    );
  }, [districts, form.district_id]);

  const selectedWard = useMemo(() => {
    return (
      wards.find((item) => String(item.WardCode) === String(form.ward_code)) ||
      null
    );
  }, [wards, form.ward_code]);

  // ==========================================================
  // GHN SERVICE
  // ==========================================================

  const selectedService =
    shippingInfo?.selected_service || leadTimeInfo?.selected_service || null;

  // ==========================================================
  // ADDRESS PREVIEW
  // ==========================================================

  const fullAddressPreview = useMemo(() => {
    const parts = [
      form.address_detail.trim(),

      selectedWard?.WardName || "",

      selectedDistrict?.DistrictName || "",

      selectedProvince?.ProvinceName || "",
    ].filter(Boolean);

    return parts.join(", ");
  }, [form.address_detail, selectedWard, selectedDistrict, selectedProvince]);

  // ==========================================================
  // LEAD TIME
  // ==========================================================

  const formattedLeadTime = useMemo(() => {
    const value =
      leadTimeInfo?.leadtime ||
      leadTimeInfo?.lead_time ||
      leadTimeInfo?.expected_delivery_time;

    return formatLeadTime(value);
  }, [leadTimeInfo]);

  // ==========================================================
  // VALIDATE COUPON
  // ==========================================================

  useEffect(() => {
    if (!appliedCoupon?.code) {
      setValidatedCoupon(null);

      setCouponError("");

      return;
    }

    if (subtotal <= 0) {
      setValidatedCoupon(null);

      return;
    }

    let cancelled = false;

    const validateCheckoutCoupon = async () => {
      try {
        setCouponValidating(true);

        setCouponError("");

        const response = await couponService.validate({
          code: appliedCoupon.code,

          subtotal,
        });

        if (cancelled) {
          return;
        }

        const coupon = response?.data?.data;

        if (!coupon) {
          throw new Error("Không nhận được thông tin mã giảm giá");
        }

        setValidatedCoupon(coupon);

        setAppliedCoupon(coupon);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setValidatedCoupon(null);

        clearAppliedCoupon();

        setCouponError(getErrorMessage(error, "Mã giảm giá không còn hợp lệ."));
      } finally {
        if (!cancelled) {
          setCouponValidating(false);
        }
      }
    };

    validateCheckoutCoupon();

    return () => {
      cancelled = true;
    };
  }, [appliedCoupon?.code, subtotal, setAppliedCoupon, clearAppliedCoupon]);

  // ==========================================================
  // LOAD PROVINCES
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const loadProvinces = async () => {
      try {
        setProvincesLoading(true);

        setShippingError("");

        const response = await ghnShippingService.getProvinces();

        if (cancelled) {
          return;
        }

        const data = response?.data?.data;

        setProvinces(Array.isArray(data) ? data : []);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setProvinces([]);

        setShippingError(
          getErrorMessage(error, "Không thể tải danh sách tỉnh/thành."),
        );
      } finally {
        if (!cancelled) {
          setProvincesLoading(false);
        }
      }
    };

    loadProvinces();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================================
  // LOAD DISTRICTS
  // ==========================================================

  useEffect(() => {
    if (!form.province_id) {
      setDistricts([]);

      return;
    }

    let cancelled = false;

    const loadDistricts = async () => {
      try {
        setDistrictsLoading(true);

        setShippingError("");

        const response = await ghnShippingService.getDistricts(
          form.province_id,
        );

        if (cancelled) {
          return;
        }

        const data = response?.data?.data;

        setDistricts(Array.isArray(data) ? data : []);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setDistricts([]);

        setShippingError(
          getErrorMessage(error, "Không thể tải danh sách quận/huyện."),
        );
      } finally {
        if (!cancelled) {
          setDistrictsLoading(false);
        }
      }
    };

    loadDistricts();

    return () => {
      cancelled = true;
    };
  }, [form.province_id]);

  // ==========================================================
  // LOAD WARDS
  // ==========================================================

  useEffect(() => {
    if (!form.district_id) {
      setWards([]);

      return;
    }

    let cancelled = false;

    const loadWards = async () => {
      try {
        setWardsLoading(true);

        setShippingError("");

        const response = await ghnShippingService.getWards(form.district_id);

        if (cancelled) {
          return;
        }

        const data = response?.data?.data;

        setWards(Array.isArray(data) ? data : []);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setWards([]);

        setShippingError(
          getErrorMessage(error, "Không thể tải danh sách phường/xã."),
        );
      } finally {
        if (!cancelled) {
          setWardsLoading(false);
        }
      }
    };

    loadWards();

    return () => {
      cancelled = true;
    };
  }, [form.district_id]);

  // ==========================================================
  // GHN QUOTE
  //
  // Thay hoàn toàn logic cũ:
  // calculateFee + calculateLeadTime
  //
  // bằng 1 endpoint /quote.
  // ==========================================================

  useEffect(() => {
    if (
      !form.province_id ||
      !form.district_id ||
      !form.ward_code ||
      subtotal <= 0
    ) {
      setShippingInfo(null);

      setLeadTimeInfo(null);

      return;
    }

    let cancelled = false;

    const calculateShipping = async () => {
      try {
        setShippingCalculating(true);

        setShippingError("");

        const insuranceValue = Math.max(subtotal - discount, 0);

        const codValue =
          form.payment === "cod" ? Math.max(subtotal - discount, 0) : 0;

        const quoteResponse = await ghnShippingService.getQuote({
          provinceId: form.province_id,

          districtId: form.district_id,

          wardCode: form.ward_code,

          insuranceValue,

          codValue,
        });

        if (cancelled) {
          return;
        }

        const quote = quoteResponse?.data?.data;

        if (!quote) {
          throw new Error("Không nhận được thông tin vận chuyển từ GHN");
        }

        setShippingInfo({
          total: Number(quote.shipping_fee || 0),

          shipping_fee: Number(quote.shipping_fee || 0),

          selected_service: quote.selected_service || null,
        });

        setLeadTimeInfo({
          leadtime: quote.leadtime || null,

          lead_time: quote.lead_time || null,

          expected_delivery_time: quote.expected_delivery_time || null,

          selected_service: quote.selected_service || null,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Lỗi tính phí GHN:", error);

        setShippingInfo(null);

        setLeadTimeInfo(null);

        setShippingError(
          getErrorMessage(error, "Không thể tính phí vận chuyển GHN."),
        );
      } finally {
        if (!cancelled) {
          setShippingCalculating(false);
        }
      }
    };

    calculateShipping();

    return () => {
      cancelled = true;
    };
  }, [
    form.province_id,
    form.district_id,
    form.ward_code,
    form.payment,
    subtotal,
    discount,
  ]);

  // ==========================================================
  // HANDLE CHANGE
  // ==========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "province_id") {
      setForm((previous) => ({
        ...previous,

        province_id: value,

        district_id: "",

        ward_code: "",
      }));

      setDistricts([]);

      setWards([]);

      setShippingInfo(null);

      setLeadTimeInfo(null);

      setShippingError("");
    } else if (name === "district_id") {
      setForm((previous) => ({
        ...previous,

        district_id: value,

        ward_code: "",
      }));

      setWards([]);

      setShippingInfo(null);

      setLeadTimeInfo(null);

      setShippingError("");
    } else if (name === "ward_code") {
      setForm((previous) => ({
        ...previous,

        ward_code: value,
      }));

      setShippingInfo(null);

      setLeadTimeInfo(null);

      setShippingError("");
    } else {
      setForm((previous) => ({
        ...previous,

        [name]: value,
      }));
    }

    setErrors((previous) => ({
      ...previous,

      [name]: "",

      shipping: "",
    }));
  };

  // ==========================================================
  // VALIDATE FORM
  // ==========================================================

  const validateForm = () => {
    const newErrors = {};

    // ========================================================
    // NAME
    // ========================================================

    if (!form.name.trim()) {
      newErrors.name = "Vui lòng nhập họ tên";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Họ tên quá ngắn";
    } else if (!hasMeaningfulText(form.name)) {
      newErrors.name = "Họ tên không hợp lệ";
    }

    // ========================================================
    // PHONE
    // ========================================================

    if (!form.phone.trim()) {
      newErrors.phone = "Vui lòng nhập số điện thoại";
    } else if (!/^(0|\+84)[0-9]{9,10}$/.test(form.phone.trim())) {
      newErrors.phone = "Số điện thoại không hợp lệ";
    }

    // ========================================================
    // EMAIL
    // ========================================================

    if (!form.email.trim()) {
      newErrors.email = "Vui lòng nhập email nhận thông báo đơn hàng";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(form.email.trim())) {
        newErrors.email = "Email không hợp lệ";
      }
    }

    // ========================================================
    // LOCATION
    // ========================================================

    if (!form.province_id) {
      newErrors.province_id = "Vui lòng chọn tỉnh / thành phố";
    }

    if (!form.district_id) {
      newErrors.district_id = "Vui lòng chọn quận / huyện";
    }

    if (!form.ward_code) {
      newErrors.ward_code = "Vui lòng chọn phường / xã";
    }

    // ========================================================
    // ADDRESS
    // ========================================================

    const addressDetail = form.address_detail.trim();

    if (!addressDetail) {
      newErrors.address_detail = "Vui lòng nhập số nhà, tên đường";
    } else if (addressDetail.length < 5) {
      newErrors.address_detail = "Địa chỉ cụ thể quá ngắn";
    } else if (!hasMeaningfulText(addressDetail)) {
      newErrors.address_detail = "Địa chỉ cụ thể không hợp lệ";
    }

    // ========================================================
    // PAYMENT
    // ========================================================

    if (!form.payment) {
      newErrors.payment = "Vui lòng chọn phương thức thanh toán";
    }

    if (!["cod", "bank", "momo"].includes(form.payment)) {
      newErrors.payment = "Phương thức thanh toán không hợp lệ";
    }

    // ========================================================
    // CART
    // ========================================================

    if (cartItems.length === 0) {
      newErrors.cart = "Giỏ hàng đang trống";
    }

    // ========================================================
    // SHIPPING
    // ========================================================

    if (form.ward_code && !shippingInfo) {
      newErrors.shipping = shippingError || "Chưa xác định được phí vận chuyển";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // ==========================================================
  // CLEAR CART
  // ==========================================================

  const syncClearCartAfterOrder = async () => {
    try {
      await clearCart();
    } catch (error) {
      console.warn("Không thể đồng bộ xóa giỏ hàng sau đặt hàng:", error);
    }
  };

  // ==========================================================
  // CHECKOUT
  // ==========================================================

  const handleCheckout = async () => {
    if (!userId) {
      alert("Vui lòng đăng nhập trước khi thanh toán.");

      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      // ====================================================
      // COUPON - VALIDATE LẦN CUỐI
      // ====================================================

      let finalDiscount = 0;

      let finalCouponCode = null;

      if (appliedCoupon?.code) {
        const couponResponse = await couponService.validate({
          code: appliedCoupon.code,

          subtotal,
        });

        const latestCoupon = couponResponse?.data?.data;

        if (!latestCoupon) {
          throw new Error("Không thể xác nhận mã giảm giá");
        }

        finalDiscount = Number(latestCoupon.discount_amount || 0);

        finalCouponCode = latestCoupon.code || appliedCoupon.code;

        setValidatedCoupon(latestCoupon);

        setAppliedCoupon(latestCoupon);
      }

      // ====================================================
      // GHN - VALIDATE LẦN CUỐI
      //
      // Chỉ validate trước khi submit.
      // Backend vẫn tính lại lần nữa.
      // ====================================================

      const insuranceValue = Math.max(subtotal - finalDiscount, 0);

      const codValue =
        form.payment === "cod" ? Math.max(subtotal - finalDiscount, 0) : 0;

      const quoteResponse = await ghnShippingService.getQuote({
        provinceId: form.province_id,

        districtId: form.district_id,

        wardCode: form.ward_code,

        insuranceValue,

        codValue,
      });

      const latestQuote = quoteResponse?.data?.data;

      if (!latestQuote) {
        throw new Error("Không thể xác định phí vận chuyển GHN");
      }

      // ====================================================
      // ADDRESS
      // ====================================================

      const fullShippingAddress = [
        form.address_detail.trim(),

        selectedWard?.WardName,

        selectedDistrict?.DistrictName,

        selectedProvince?.ProvinceName,
      ]
        .filter(Boolean)
        .join(", ");

      if (!fullShippingAddress) {
        throw new Error("Địa chỉ giao hàng không hợp lệ.");
      }

      // ====================================================
      // ORDER PAYLOAD
      //
      // FE KHÔNG GỬI:
      // - user_id
      // - subtotal
      // - discount_amount
      // - shipping_fee
      // - total_amount
      //
      // Backend tự tính toàn bộ.
      // ====================================================

      const payload = {
        shipping_name: form.name.trim(),

        shipping_phone: form.phone.trim(),

        shipping_email: form.email.trim(),

        shipping_address: fullShippingAddress,

        shipping_ghn_province_id: Number(form.province_id),

        shipping_district_id: Number(form.district_id),

        shipping_ward_code: String(form.ward_code).trim(),

        coupon_code: finalCouponCode,

        note: form.note.trim() || null,

        payment_method: form.payment,
      };

      // ====================================================
      // CREATE ORDER
      // ====================================================

      const response = await orderService.createOrder(payload);

      const responseData = response?.data?.data || {};

      const order = responseData.order || responseData;

      const orderId = order?.id;

      if (!orderId) {
        throw new Error("Không nhận được mã đơn hàng sau khi đặt hàng.");
      }

      // ====================================================
      // MOMO
      //
      // Không clear cart ở FE trước redirect.
      // Backend đã xử lý cart khi tạo order.
      // ====================================================

      if (form.payment === "momo" && responseData?.payment_url) {
        window.location.href = responseData.payment_url;

        return;
      }

      // ====================================================
      // SYNC CART CONTEXT
      //
      // Backend đã soft delete cart_items.
      // clearCart ở đây chủ yếu đồng bộ state FE.
      // ====================================================

      await syncClearCartAfterOrder();

      // ====================================================
      // BANK
      // ====================================================

      if (form.payment === "bank") {
        navigate(`/order-success?order_id=${orderId}&payment=bank`);

        return;
      }

      // ====================================================
      // COD
      // ====================================================

      navigate(`/order-success?order_id=${orderId}&payment=cod`);
    } catch (error) {
      console.error("Lỗi đặt hàng:", error);

      alert(
        getErrorMessage(error, "Đặt hàng thất bại. Vui lòng kiểm tra lại."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="ck-page">
      <Header />

      <div className="ck-container">
        {/* ===================================================
            BREADCRUMB
        =================================================== */}

        <div className="ck-breadcrumb">
          <Link to="/">Trang chủ</Link>

          <span>/</span>

          <Link to="/cart">Giỏ hàng</Link>

          <span>/</span>

          <span>Thanh toán</span>
        </div>

        {/* ===================================================
            TITLE
        =================================================== */}

        <div className="ck-title">
          <span className="ck-kicker">Thanh toán</span>

          <h1>Xác nhận đơn hàng</h1>

          <p>
            Kiểm tra thông tin nhận hàng và phương thức thanh toán trước khi đặt
            hàng.
          </p>
        </div>

        {/* ===================================================
            LOADING / EMPTY
        =================================================== */}

        {cartLoading && cartItems.length === 0 ? (
          <div className="ck-loading">
            <i className="bi bi-arrow-repeat" />

            <span>Đang tải thông tin giỏ hàng...</span>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="ck-empty">
            <i className="bi bi-cart-x" />

            <h2>Giỏ hàng đang trống</h2>

            <p>Vui lòng thêm sản phẩm trước khi thanh toán.</p>

            <Link to="/products" className="ck-btn-empty">
              Tiếp tục mua hàng
            </Link>
          </div>
        ) : (
          <div className="ck-grid">
            {/* ===============================================
                FORM
            =============================================== */}

            <div className="ck-form">
              <div className="ck-section-head">
                <div>
                  <h2>Thông tin nhận hàng</h2>

                  <p>Nhập thông tin chính xác để shop liên hệ và giao hàng.</p>
                </div>

                <span>1</span>
              </div>

              {errors.cart && <div className="ck-error-box">{errors.cart}</div>}

              {/* =============================================
                  NAME + PHONE
              ============================================= */}

              <div className="ck-field-grid">
                <div className="ck-field">
                  <label>Họ và tên</label>

                  <input
                    name="name"
                    placeholder="VD: Nguyễn Văn A"
                    value={form.name}
                    onChange={handleChange}
                    maxLength={100}
                  />

                  {errors.name && <small>{errors.name}</small>}
                </div>

                <div className="ck-field">
                  <label>Số điện thoại</label>

                  <input
                    name="phone"
                    placeholder="VD: 0901234567"
                    value={form.phone}
                    onChange={handleChange}
                    maxLength={13}
                  />

                  {errors.phone && <small>{errors.phone}</small>}
                </div>
              </div>

              {/* =============================================
                  EMAIL
              ============================================= */}

              <div className="ck-field">
                <label>Email</label>

                <input
                  name="email"
                  placeholder="Email nhận thông báo đơn hàng"
                  value={form.email}
                  onChange={handleChange}
                  maxLength={150}
                />

                {errors.email && <small>{errors.email}</small>}
              </div>

              {/* =============================================
                  PROVINCE
              ============================================= */}

              <div className="ck-field">
                <label>Tỉnh / Thành phố</label>

                <select
                  name="province_id"
                  className="ck-select"
                  value={form.province_id}
                  onChange={handleChange}
                  disabled={provincesLoading}
                >
                  <option value="">
                    {provincesLoading
                      ? "Đang tải tỉnh/thành..."
                      : "-- Chọn tỉnh / thành phố --"}
                  </option>

                  {provinces.map((province) => (
                    <option
                      key={province.ProvinceID}
                      value={province.ProvinceID}
                    >
                      {province.ProvinceName}
                    </option>
                  ))}
                </select>

                {errors.province_id && <small>{errors.province_id}</small>}
              </div>

              {/* =============================================
                  DISTRICT + WARD
              ============================================= */}

              <div className="ck-field-grid">
                <div className="ck-field">
                  <label>Quận / Huyện</label>

                  <select
                    name="district_id"
                    className="ck-select"
                    value={form.district_id}
                    onChange={handleChange}
                    disabled={!form.province_id || districtsLoading}
                  >
                    <option value="">
                      {districtsLoading
                        ? "Đang tải quận/huyện..."
                        : !form.province_id
                          ? "Chọn tỉnh/thành trước"
                          : "-- Chọn quận / huyện --"}
                    </option>

                    {districts.map((district) => (
                      <option
                        key={district.DistrictID}
                        value={district.DistrictID}
                      >
                        {district.DistrictName}
                      </option>
                    ))}
                  </select>

                  {errors.district_id && <small>{errors.district_id}</small>}
                </div>

                <div className="ck-field">
                  <label>Phường / Xã</label>

                  <select
                    name="ward_code"
                    className="ck-select"
                    value={form.ward_code}
                    onChange={handleChange}
                    disabled={!form.district_id || wardsLoading}
                  >
                    <option value="">
                      {wardsLoading
                        ? "Đang tải phường/xã..."
                        : !form.district_id
                          ? "Chọn quận/huyện trước"
                          : "-- Chọn phường / xã --"}
                    </option>

                    {wards.map((ward) => (
                      <option key={ward.WardCode} value={ward.WardCode}>
                        {ward.WardName}
                      </option>
                    ))}
                  </select>

                  {errors.ward_code && <small>{errors.ward_code}</small>}
                </div>
              </div>

              {/* =============================================
                  ADDRESS DETAIL
              ============================================= */}

              <div className="ck-field">
                <label>Số nhà, tên đường</label>

                <input
                  name="address_detail"
                  placeholder="VD: 123 Nguyễn Văn Cừ"
                  value={form.address_detail}
                  onChange={handleChange}
                  maxLength={200}
                />

                {errors.address_detail && (
                  <small>{errors.address_detail}</small>
                )}
              </div>

              {/* =============================================
                  ADDRESS PREVIEW
              ============================================= */}

              {fullAddressPreview && (
                <div className="ck-payment-helper">
                  <div className="ck-payment-helper-icon bank">
                    <i className="bi bi-geo-alt-fill" />
                  </div>

                  <div>
                    <strong>Địa chỉ giao hàng</strong>

                    <p>{fullAddressPreview}</p>
                  </div>
                </div>
              )}

              {/* =============================================
                  SHIPPING
              ============================================= */}

              {form.ward_code && (
                <div className="ck-shipping-info">
                  {shippingCalculating ? (
                    <div className="ck-shipping-loading">
                      <i className="bi bi-arrow-repeat ck-btn-spin" />

                      <span>Đang tính phí vận chuyển GHN...</span>
                    </div>
                  ) : shippingInfo ? (
                    <>
                      <div className="ck-shipping-info-row">
                        <div>
                          <i className="bi bi-truck" />

                          <span>Đơn vị vận chuyển</span>
                        </div>

                        <strong>
                          GHN
                          {selectedService?.short_name
                            ? ` - ${selectedService.short_name}`
                            : ""}
                        </strong>
                      </div>

                      <div className="ck-shipping-info-row">
                        <div>
                          <i className="bi bi-cash-stack" />

                          <span>Phí vận chuyển</span>
                        </div>

                        <strong>{formatMoney(shipping)}</strong>
                      </div>

                      {formattedLeadTime && (
                        <div className="ck-shipping-info-row">
                          <div>
                            <i className="bi bi-clock-history" />

                            <span>Dự kiến giao</span>
                          </div>

                          <strong>{formattedLeadTime}</strong>
                        </div>
                      )}

                      <div className="ck-shipping-more">
                        <i className="bi bi-info-circle" />

                        <span>
                          Dịch vụ, phí và thời gian giao hàng được tính trực
                          tiếp qua GHN.
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {shippingError && (
                <div className="ck-error-box">{shippingError}</div>
              )}

              {errors.shipping && (
                <div className="ck-error-box">{errors.shipping}</div>
              )}

              {/* =============================================
                  NOTE
              ============================================= */}

              <div className="ck-field">
                <label>Ghi chú</label>

                <textarea
                  name="note"
                  placeholder="Ghi chú cho đơn hàng nếu có"
                  value={form.note}
                  onChange={handleChange}
                  maxLength={500}
                />
              </div>

              {/* =============================================
                  PAYMENT
              ============================================= */}

              <div className="ck-section-head ck-payment-head">
                <div>
                  <h2>Phương thức thanh toán</h2>

                  <p>Chọn cách thanh toán phù hợp với bạn.</p>
                </div>

                <span>2</span>
              </div>

              <div className="ck-payment">
                {/* COD */}

                <label className="ck-pay-option">
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={form.payment === "cod"}
                    onChange={handleChange}
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

                        <span className="ck-pay-tag">COD</span>
                      </div>

                      <span className="ck-pay-sub">
                        Trả tiền mặt khi nhận sản phẩm tại địa chỉ giao hàng.
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
                    checked={form.payment === "bank"}
                    onChange={handleChange}
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

                        <span className="ck-pay-tag">QR Bank</span>
                      </div>

                      <span className="ck-pay-sub">
                        Chuyển khoản theo mã đơn hàng sau khi đặt hàng.
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
                    checked={form.payment === "momo"}
                    onChange={handleChange}
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
                        Thanh toán qua thẻ ATM / Napas trên cổng MoMo.
                      </span>
                    </div>

                    <span className="ck-pay-check">
                      <i className="bi bi-check-lg" />
                    </span>
                  </div>
                </label>
              </div>

              <div className={`ck-payment-helper ${selectedPayment.className}`}>
                <div
                  className={`ck-payment-helper-icon ${selectedPayment.className}`}
                >
                  <i className={`bi ${selectedPayment.icon}`} />
                </div>

                <div>
                  <strong>{selectedPayment.title}</strong>

                  <p>{selectedPayment.description}</p>
                </div>
              </div>

              {errors.payment && (
                <div className="ck-error-box">{errors.payment}</div>
              )}

              {/* =============================================
                  SUBMIT
              ============================================= */}

              <button
                className="ck-btn-primary"
                type="button"
                onClick={handleCheckout}
                disabled={
                  submitting ||
                  shippingCalculating ||
                  couponValidating ||
                  !shippingInfo
                }
              >
                {submitting ? (
                  <>
                    <i className="bi bi-arrow-repeat ck-btn-spin" />
                    Đang đặt hàng...
                  </>
                ) : form.payment === "momo" ? (
                  "Tiếp tục thanh toán MoMo"
                ) : (
                  "Đặt hàng"
                )}
              </button>
            </div>

            {/* ===============================================
                ORDER SUMMARY
            =============================================== */}

            <div className="ck-summary">
              <h2>Đơn hàng</h2>

              <div className="ck-summary-count">
                {cartCount || cartItems.length} sản phẩm trong giỏ
              </div>

              {/* =============================================
                  ITEMS
              ============================================= */}

              <div className="ck-summary-items">
                {cartItems.map((item) => {
                  const itemPrice = Number(item.final_price || item.price || 0);

                  const itemQuantity = Number(item.quantity || 0);

                  const itemTotal =
                    Number(item.total_price || 0) || itemPrice * itemQuantity;

                  return (
                    <div className="ck-item" key={item.id}>
                      <div>
                        <span className="ck-item-name">
                          {item.product_name}

                          {item.variant_name ? ` - ${item.variant_name}` : ""}
                        </span>

                        <small>
                          SL: {item.quantity} × {formatMoney(itemPrice)}
                        </small>
                      </div>

                      <strong>{formatMoney(itemTotal)}</strong>
                    </div>
                  );
                })}
              </div>

              <div className="ck-divider" />

              {/* =============================================
                  SUBTOTAL
              ============================================= */}

              <div className="ck-row">
                <span>Tạm tính</span>

                <span>{formatMoney(subtotal)}</span>
              </div>

              {/* =============================================
                  COUPON
              ============================================= */}

              {appliedCoupon?.code && (
                <div className="ck-row">
                  <span>Mã giảm giá</span>

                  <span>
                    {couponValidating
                      ? "Đang kiểm tra..."
                      : validatedCoupon
                        ? validatedCoupon.code
                        : appliedCoupon.code}
                  </span>
                </div>
              )}

              <div className="ck-row">
                <span>Giảm giá</span>

                <span>
                  {couponValidating
                    ? "Đang kiểm tra..."
                    : `-${formatMoney(discount)}`}
                </span>
              </div>

              {couponError && <div className="ck-error-box">{couponError}</div>}

              {/* =============================================
                  SHIPPING
              ============================================= */}

              <div className="ck-row">
                <span>Phí vận chuyển</span>

                <span>
                  {!form.ward_code
                    ? "Chọn địa chỉ"
                    : shippingCalculating
                      ? "Đang tính..."
                      : shippingInfo
                        ? formatMoney(shipping)
                        : "--"}
                </span>
              </div>

              {selectedProvince && (
                <div className="ck-row">
                  <span>Giao đến</span>

                  <span>{selectedProvince.ProvinceName}</span>
                </div>
              )}

              {selectedService && (
                <div className="ck-row">
                  <span>Vận chuyển</span>

                  <span>
                    GHN
                    {selectedService?.short_name
                      ? ` - ${selectedService.short_name}`
                      : ""}
                  </span>
                </div>
              )}

              {formattedLeadTime && (
                <div className="ck-row">
                  <span>Dự kiến giao</span>

                  <span>{formattedLeadTime}</span>
                </div>
              )}

              {/* =============================================
                  TOTAL
              ============================================= */}

              <div className="ck-total">
                <span>Tổng thanh toán</span>

                <span>
                  {couponValidating || shippingCalculating
                    ? "Đang tính..."
                    : formatMoney(total)}
                </span>
              </div>

              {/* =============================================
                  TRUST
              ============================================= */}

              <div className="ck-trust-box">
                <div>
                  <i className="bi bi-shield-check" />

                  <span>Hàng chính hãng, bảo hành theo linh kiện</span>
                </div>

                <div>
                  <i className="bi bi-tools" />

                  <span>Hỗ trợ kiểm tra tương thích khi Build PC</span>
                </div>

                <div>
                  <i className="bi bi-truck" />

                  <span>Phí giao hàng được tính trực tiếp từ GHN</span>
                </div>
              </div>

              <Link to="/cart" className="ck-btn-outline">
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
