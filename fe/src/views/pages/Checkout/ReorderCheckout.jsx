import { useCallback, useEffect, useMemo, useState } from "react";

import { Link, useNavigate, useParams } from "react-router-dom";

import "./Checkout.css";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import orderService from "../../../services/orderService";
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
// ERROR
// ============================================================

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.message || error?.message || fallback;
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
// NORMALIZE LOCATION TEXT
// ============================================================

const normalizeLocationText = (value) => {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("vi-VN");
};

// ============================================================
// TÁCH PHẦN SỐ NHÀ / TÊN ĐƯỜNG TỪ ĐỊA CHỈ CŨ
//
// Ví dụ:
// "123 Nguyễn Văn Cừ, Phường An Khánh, Quận Ninh Kiều, Cần Thơ"
//
// => "123 Nguyễn Văn Cừ"
// ============================================================

const extractAddressDetail = ({
  fullAddress,
  wardName,
  districtName,
  provinceName,
}) => {
  const raw = String(fullAddress || "").trim();

  if (!raw) {
    return "";
  }

  const parts = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const removeLastIfMatch = (expectedName) => {
    if (!expectedName || parts.length === 0) {
      return;
    }

    const current = normalizeLocationText(parts[parts.length - 1]);

    const expected = normalizeLocationText(expectedName);

    if (current === expected) {
      parts.pop();
    }
  };

  /*
   * Địa chỉ được ghép:
   * detail, ward, district, province
   *
   * nên phải pop ngược lại.
   */
  removeLastIfMatch(provinceName);

  removeLastIfMatch(districtName);

  removeLastIfMatch(wardName);

  return parts.join(", ");
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

function ReorderCheckout() {
  const { id } = useParams();

  const navigate = useNavigate();

  // ==========================================================
  // CHECKOUT DATA
  // ==========================================================

  const [checkoutData, setCheckoutData] = useState(null);

  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState({});

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
  // LOAD REORDER PREVIEW
  // ==========================================================

  const loadCheckout = useCallback(async () => {
    try {
      setLoading(true);

      setLoadError("");

      const response = await orderService.getReorderCheckout(id);

      const result = response?.data?.data || null;

      if (!result) {
        throw new Error("Không nhận được thông tin mua lại.");
      }

      setCheckoutData(result);

      const source = result.source_order || {};

      const addressDetail = extractAddressDetail({
        fullAddress: source.shipping_address,

        wardName: source.shipping_ward_name,

        districtName: source.shipping_district_name,

        provinceName: source.shipping_province_name,
      });

      setForm((current) => ({
        ...current,

        name: source.shipping_name || "",

        phone: source.shipping_phone || "",

        email: source.shipping_email || "",

        province_id: source.shipping_ghn_province_id
          ? String(source.shipping_ghn_province_id)
          : "",

        district_id: source.shipping_district_id
          ? String(source.shipping_district_id)
          : "",

        ward_code: source.shipping_ward_code || "",

        address_detail: addressDetail,

        note: "",
      }));
    } catch (error) {
      console.error("Lỗi tải checkout mua lại:", error);

      setCheckoutData(null);

      setLoadError(getErrorMessage(error, "Không thể tải thông tin mua lại."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCheckout();
  }, [loadCheckout]);

  // ==========================================================
  // ITEMS
  // ==========================================================

  const items = Array.isArray(checkoutData?.items) ? checkoutData.items : [];

  const unavailableItems = Array.isArray(checkoutData?.unavailable_items)
    ? checkoutData.unavailable_items
    : [];

  // ==========================================================
  // SUBTOTAL
  // ==========================================================

  const subtotal = useMemo(() => {
    const backendSubtotal = Number(checkoutData?.subtotal || 0);

    if (backendSubtotal > 0) {
      return backendSubtotal;
    }

    return items.reduce((total, item) => {
      const itemPrice = Number(item.final_price || item.price || 0);

      const quantity = Number(item.quantity || 0);

      const itemTotal = Number(item.total_price || 0);

      if (itemTotal > 0) {
        return total + itemTotal;
      }

      return total + itemPrice * quantity;
    }, 0);
  }, [checkoutData, items]);

  // ==========================================================
  // DISCOUNT
  //
  // Hiện Reorder chưa có UI nhập coupon.
  // Backend vẫn hỗ trợ coupon_code nếu sau này cần.
  // ==========================================================

  const discount = 0;

  // ==========================================================
  // SHIPPING
  // ==========================================================

  const shipping = shippingInfo
    ? Number(shippingInfo.total || shippingInfo.shipping_fee || 0)
    : 0;

  // ==========================================================
  // TOTAL PREVIEW
  //
  // Chỉ dùng để hiển thị.
  // Backend sẽ tự tính lại khi đặt hàng.
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
  // SERVICE
  // ==========================================================

  const selectedService =
    shippingInfo?.selected_service || leadTimeInfo?.selected_service || null;

  // ==========================================================
  // ADDRESS PREVIEW
  // ==========================================================

  const fullShippingAddress = useMemo(() => {
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

        console.error("Lỗi tải tỉnh GHN:", error);

        setProvinces([]);

        setShippingError(
          getErrorMessage(error, "Không thể tải danh sách tỉnh / thành phố."),
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

        console.error("Lỗi tải quận huyện GHN:", error);

        setDistricts([]);

        setShippingError(
          getErrorMessage(error, "Không thể tải danh sách quận / huyện."),
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

        console.error("Lỗi tải phường xã GHN:", error);

        setWards([]);

        setShippingError(
          getErrorMessage(error, "Không thể tải danh sách phường / xã."),
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
  // CALCULATE GHN FEE + LEAD TIME
  // ==========================================================

  useEffect(() => {
    if (!form.district_id || !form.ward_code || subtotal <= 0) {
      setShippingInfo(null);

      setLeadTimeInfo(null);

      return;
    }

    let cancelled = false;

    const calculateShipping = async () => {
      try {
        setShippingCalculating(true);

        setShippingError("");

        /*
         * Chỉ để preview.
         * Backend sẽ tính lại toàn bộ khi create order.
         */
        const insuranceValue = Math.max(subtotal - discount, 0);

        const codValue =
          form.payment === "cod" ? Math.max(subtotal - discount, 0) : 0;

        const [feeResponse, leadTimeResponse] = await Promise.all([
          ghnShippingService.calculateFee({
            toDistrictId: form.district_id,

            toWardCode: form.ward_code,

            insuranceValue,

            codValue,
          }),

          ghnShippingService.calculateLeadTime({
            toDistrictId: form.district_id,

            toWardCode: form.ward_code,
          }),
        ]);

        if (cancelled) {
          return;
        }

        const feeData = feeResponse?.data?.data;

        const leadData = leadTimeResponse?.data?.data;

        if (!feeData) {
          throw new Error("Không nhận được phí vận chuyển từ GHN.");
        }

        setShippingInfo(feeData);

        setLeadTimeInfo(leadData || null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Lỗi tính vận chuyển GHN:", error);

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
  }, [form.district_id, form.ward_code, form.payment, subtotal]);

  // ==========================================================
  // HANDLE CHANGE
  // ==========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "province_id") {
      setForm((current) => ({
        ...current,

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
      setForm((current) => ({
        ...current,

        district_id: value,

        ward_code: "",
      }));

      setWards([]);

      setShippingInfo(null);

      setLeadTimeInfo(null);

      setShippingError("");
    } else if (name === "ward_code") {
      setForm((current) => ({
        ...current,

        ward_code: value,
      }));

      setShippingInfo(null);

      setLeadTimeInfo(null);

      setShippingError("");
    } else {
      setForm((current) => ({
        ...current,

        [name]: value,
      }));
    }

    setErrors((current) => ({
      ...current,

      [name]: "",

      shipping: "",
    }));
  };

  // ==========================================================
  // VALIDATE
  // ==========================================================

  const validateForm = () => {
    const nextErrors = {};

    // ========================================================
    // NAME
    // ========================================================

    if (!form.name.trim()) {
      nextErrors.name = "Vui lòng nhập họ tên";
    } else if (form.name.trim().length < 2) {
      nextErrors.name = "Họ tên quá ngắn";
    } else if (!hasMeaningfulText(form.name)) {
      nextErrors.name = "Họ tên không hợp lệ";
    }

    // ========================================================
    // PHONE
    // ========================================================

    if (!form.phone.trim()) {
      nextErrors.phone = "Vui lòng nhập số điện thoại";
    } else if (!/^(0|\+84)[0-9]{9,10}$/.test(form.phone.trim())) {
      nextErrors.phone = "Số điện thoại không hợp lệ";
    }

    // ========================================================
    // EMAIL
    // ========================================================

    if (!form.email.trim()) {
      nextErrors.email = "Vui lòng nhập email nhận thông báo đơn hàng";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(form.email.trim())) {
        nextErrors.email = "Email không hợp lệ";
      }
    }

    // ========================================================
    // LOCATION
    // ========================================================

    if (!form.province_id) {
      nextErrors.province_id = "Vui lòng chọn tỉnh / thành phố";
    }

    if (!form.district_id) {
      nextErrors.district_id = "Vui lòng chọn quận / huyện";
    }

    if (!form.ward_code) {
      nextErrors.ward_code = "Vui lòng chọn phường / xã";
    }

    // ========================================================
    // ADDRESS DETAIL
    // ========================================================

    const addressDetail = form.address_detail.trim();

    if (!addressDetail) {
      nextErrors.address_detail = "Vui lòng nhập số nhà, tên đường";
    } else if (addressDetail.length < 5) {
      nextErrors.address_detail = "Địa chỉ cụ thể quá ngắn";
    } else if (!hasMeaningfulText(addressDetail)) {
      nextErrors.address_detail = "Địa chỉ cụ thể không hợp lệ";
    }

    // ========================================================
    // PAYMENT
    // ========================================================

    if (!["cod", "bank", "momo"].includes(form.payment)) {
      nextErrors.payment = "Phương thức thanh toán không hợp lệ";
    }

    // ========================================================
    // ITEMS
    // ========================================================

    if (items.length === 0) {
      nextErrors.cart = "Không có sản phẩm nào còn khả dụng để mua lại";
    }

    // ========================================================
    // SHIPPING
    // ========================================================

    if (form.ward_code && !shippingInfo) {
      nextErrors.shipping =
        shippingError || "Chưa xác định được phí vận chuyển";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  // ==========================================================
  // CHECKOUT
  // ==========================================================

  const handleCheckout = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      // ====================================================
      // PAYLOAD
      //
      // KHÔNG GỬI:
      // - shipping_fee
      // - subtotal
      // - total_amount
      // - discount_amount
      //
      // Backend tự tính lại.
      // ====================================================

      const payload = {
        shipping_name: form.name.trim(),

        shipping_phone: form.phone.trim(),

        shipping_email: form.email.trim(),

        shipping_address: fullShippingAddress,

        shipping_ghn_province_id: Number(form.province_id),

        shipping_district_id: Number(form.district_id),

        shipping_ward_code: String(form.ward_code).trim(),

        /*
         * Hiện Reorder không có UI coupon.
         */
        coupon_code: null,

        note: form.note.trim() || null,

        payment_method: form.payment,
      };

      const response = await orderService.createReorderCheckout(id, payload);

      const responseData = response?.data?.data || {};

      const order = responseData.order || responseData;

      const orderId = order?.id;

      // ====================================================
      // MOMO
      // ====================================================

      if (form.payment === "momo" && responseData.payment_url) {
        window.location.href = responseData.payment_url;

        return;
      }

      // ====================================================
      // BANK
      // ====================================================

      if (form.payment === "bank") {
        navigate(`/order-success?order_id=${orderId || ""}&payment=bank`);

        return;
      }

      // ====================================================
      // COD
      // ====================================================

      navigate(`/order-success?order_id=${orderId || ""}&payment=cod`);
    } catch (error) {
      console.error("Lỗi đặt lại đơn hàng:", error);

      alert(
        getErrorMessage(error, "Đặt lại đơn hàng thất bại. Vui lòng thử lại."),
      );

      /*
       * Giá / tồn kho có thể vừa thay đổi.
       * Load lại preview để đồng bộ.
       */
      await loadCheckout();
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

          <Link to="/account/orders">Đơn hàng</Link>

          <span>/</span>

          <span>Mua lại</span>
        </div>

        {/* ===================================================
            TITLE
        =================================================== */}

        <div className="ck-title">
          <span className="ck-kicker">Mua lại đơn hàng</span>

          <h1>Xác nhận đơn mua lại</h1>

          <p>
            Giá, tồn kho và phí vận chuyển sẽ được kiểm tra lại trước khi tạo
            đơn mới.
          </p>
        </div>

        {/* ===================================================
            LOADING
        =================================================== */}

        {loading ? (
          <div className="ck-loading">
            <i className="bi bi-arrow-repeat" />

            <span>Đang kiểm tra sản phẩm và tồn kho hiện tại...</span>
          </div>
        ) : loadError ? (
          /* =================================================
             LOAD ERROR
          ================================================= */

          <div className="ck-empty">
            <i className="bi bi-exclamation-circle" />

            <h2>Không thể mua lại đơn hàng</h2>

            <p>{loadError}</p>

            <button
              type="button"
              className="ck-btn-empty"
              onClick={loadCheckout}
            >
              Tải lại
            </button>

            <Link to="/account/orders" className="ck-btn-outline">
              Quay lại đơn hàng
            </Link>
          </div>
        ) : items.length === 0 ? (
          /* =================================================
             EMPTY
          ================================================= */

          <div className="ck-empty">
            <i className="bi bi-cart-x" />

            <h2>Không còn sản phẩm khả dụng</h2>

            <p>Các sản phẩm trong đơn cũ hiện đã hết hàng hoặc ngừng bán.</p>

            <Link to="/account/orders" className="ck-btn-empty">
              Quay lại đơn hàng
            </Link>
          </div>
        ) : (
          /* =================================================
             CHECKOUT
          ================================================= */

          <div className="ck-grid">
            {/* ===============================================
                FORM
            =============================================== */}

            <div className="ck-form">
              {/* =============================================
                  SHIPPING INFORMATION
              ============================================= */}

              <div className="ck-section-head">
                <div>
                  <h2>Thông tin nhận hàng</h2>

                  <p>Bạn có thể thay đổi địa chỉ nhận hàng cho đơn mua lại.</p>
                </div>

                <span>1</span>
              </div>

              <div
                className="ck-error-box"
                style={{
                  marginBottom: "18px",
                }}
              >
                <strong>Giỏ hàng hiện tại được giữ nguyên.</strong> Đơn mới được
                tạo trực tiếp từ đơn đã hủy{" "}
                <strong>{checkoutData?.source_order?.order_code}</strong>.
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

              {fullShippingAddress && (
                <div className="ck-payment-helper">
                  <div className="ck-payment-helper-icon bank">
                    <i className="bi bi-geo-alt-fill" />
                  </div>

                  <div>
                    <strong>Địa chỉ giao hàng</strong>

                    <p>{fullShippingAddress}</p>
                  </div>
                </div>
              )}

              {/* =============================================
                  GHN SHIPPING
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
                          Phí và thời gian giao hàng được lấy trực tiếp từ GHN.
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
                  placeholder="Ghi chú cho đơn mua lại nếu có"
                  value={form.note}
                  onChange={handleChange}
                  maxLength={500}
                />
              </div>

              {/* =============================================
                  PAYMENT HEADER
              ============================================= */}

              <div className="ck-section-head ck-payment-head">
                <div>
                  <h2>Phương thức thanh toán</h2>

                  <p>Chọn cách thanh toán cho đơn mua lại.</p>
                </div>

                <span>2</span>
              </div>

              {/* =============================================
                  PAYMENT OPTIONS
              ============================================= */}

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
                        Chuyển khoản theo mã đơn hàng mới sau khi đặt hàng.
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

              {/* =============================================
                  PAYMENT HELPER
              ============================================= */}

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
                disabled={submitting || shippingCalculating || !shippingInfo}
              >
                {submitting ? (
                  <>
                    <i className="bi bi-arrow-repeat ck-btn-spin" />
                    Đang tạo đơn...
                  </>
                ) : form.payment === "momo" ? (
                  "Tiếp tục thanh toán MoMo"
                ) : (
                  "Đặt lại đơn hàng"
                )}
              </button>
            </div>

            {/* ===============================================
                SUMMARY
            =============================================== */}

            <div className="ck-summary">
              <h2>Đơn mua lại</h2>

              <div className="ck-summary-count">
                {items.reduce(
                  (sum, item) => sum + Number(item.quantity || 0),
                  0,
                )}{" "}
                sản phẩm
              </div>

              {/* =============================================
                  ITEMS
              ============================================= */}

              <div className="ck-summary-items">
                {items.map((item, index) => {
                  const itemPrice = Number(item.final_price || item.price || 0);

                  const itemQuantity = Number(item.quantity || 0);

                  const itemTotal =
                    Number(item.total_price || 0) || itemPrice * itemQuantity;

                  return (
                    <div
                      className="ck-item"
                      key={`${item.product_id}-${item.variant_id || "default"}-${index}`}
                    >
                      <div>
                        <span className="ck-item-name">
                          {item.product_name}

                          {item.variant_name ? ` - ${item.variant_name}` : ""}
                        </span>

                        <small>
                          SL: {item.quantity} × {formatMoney(itemPrice)}
                        </small>

                        {item.quantity_adjusted && (
                          <small
                            style={{
                              display: "block",

                              marginTop: "4px",

                              color: "#d97706",
                            }}
                          >
                            Đơn cũ: {item.requested_quantity} • Hiện chỉ còn{" "}
                            {item.quantity}
                          </small>
                        )}
                      </div>

                      <strong>{formatMoney(itemTotal)}</strong>
                    </div>
                  );
                })}
              </div>

              {/* =============================================
                  UNAVAILABLE
              ============================================= */}

              {unavailableItems.length > 0 && (
                <>
                  <div className="ck-divider" />

                  <div className="ck-error-box">
                    <strong>Một số sản phẩm đã thay đổi:</strong>

                    {unavailableItems.map((item, index) => (
                      <div
                        key={`${item.product_id}-${item.variant_id || "default"}-${index}`}
                        style={{
                          marginTop: "7px",
                        }}
                      >
                        {item.product_name}
                        {item.variant_name ? ` - ${item.variant_name}` : ""}:{" "}
                        {item.reason}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="ck-divider" />

              {/* =============================================
                  SUBTOTAL
              ============================================= */}

              <div className="ck-row">
                <span>Tạm tính</span>

                <span>{formatMoney(subtotal)}</span>
              </div>

              {/* =============================================
                  DISCOUNT
              ============================================= */}

              <div className="ck-row">
                <span>Giảm giá</span>

                <span>-{formatMoney(discount)}</span>
              </div>

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
                  {shippingCalculating ? "Đang tính..." : formatMoney(total)}
                </span>
              </div>

              {/* =============================================
                  TRUST
              ============================================= */}

              <div className="ck-trust-box">
                <div>
                  <i className="bi bi-shield-check" />

                  <span>Giỏ hàng hiện tại không bị thay đổi</span>
                </div>

                <div>
                  <i className="bi bi-arrow-repeat" />

                  <span>
                    Giá và tồn kho được kiểm tra lại trước khi tạo đơn
                  </span>
                </div>

                <div>
                  <i className="bi bi-truck" />

                  <span>Phí vận chuyển được tính trực tiếp từ GHN</span>
                </div>
              </div>

              <Link to={`/account/orders/${id}`} className="ck-btn-outline">
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
