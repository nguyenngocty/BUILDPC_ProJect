import React, { useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import "./Contact.css";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import contactService from "../../../services/contactService";

/* =========================================================
   FALLBACK OPTIONS
========================================================= */

const DEFAULT_CATEGORIES = [
  {
    value: "BUILD_PC",
    label: "Tư vấn Build PC",
  },
  {
    value: "UPGRADE",
    label: "Tư vấn nâng cấp PC",
  },
  {
    value: "PRODUCT",
    label: "Tư vấn sản phẩm / linh kiện",
  },
  {
    value: "ORDER",
    label: "Hỗ trợ đơn hàng",
  },
  {
    value: "WARRANTY",
    label: "Bảo hành",
  },
  {
    value: "TECHNICAL",
    label: "Hỗ trợ kỹ thuật",
  },
  {
    value: "OTHER",
    label: "Liên hệ khác",
  },
];

const DEFAULT_NEEDS = [
  {
    value: "GAMING",
    label: "Gaming",
  },
  {
    value: "GRAPHICS",
    label: "Đồ họa / Render",
  },
  {
    value: "OFFICE",
    label: "Văn phòng",
  },
  {
    value: "PROGRAMMING",
    label: "Lập trình",
  },
  {
    value: "LIVESTREAM",
    label: "Livestream",
  },
  {
    value: "AI",
    label: "AI / Machine Learning",
  },
];

/* =========================================================
   QUICK SUPPORT
========================================================= */

const QUICK_SUPPORTS = [
  {
    category: "BUILD_PC",
    icon: "bi-pc-display-horizontal",
    title: "Tư vấn Build PC",
    description: "Tư vấn cấu hình phù hợp ngân sách và nhu cầu sử dụng.",
  },
  {
    category: "UPGRADE",
    icon: "bi-tools",
    title: "Nâng cấp máy tính",
    description: "Kiểm tra hướng nâng cấp CPU, VGA, RAM, SSD và linh kiện.",
  },
  {
    category: "ORDER",
    icon: "bi-box-seam",
    title: "Hỗ trợ đơn hàng",
    description: "Hỗ trợ về trạng thái đơn, giao hàng và thông tin đặt hàng.",
  },
];

/* =========================================================
   HELPERS
========================================================= */

const formatMoney = (value) => {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  return Number(value || 0).toLocaleString("vi-VN");
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
};

const isValidPhone = (phone) => {
  return /^(0|\+84)[0-9]{9,10}$/.test(
    String(phone || "")
      .replace(/\s+/g, "")
      .trim(),
  );
};

/* =========================================================
   CONTACT
========================================================= */

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "BUILD_PC",
    subject: "",
    order_code: "",
    budget: "",
    needs: [],
    message: "",
    website: "",
  });

  const [errors, setErrors] = useState({});

  const [submitting, setSubmitting] = useState(false);

  const [submittedRequest, setSubmittedRequest] = useState(null);

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  const [consultationNeeds, setConsultationNeeds] = useState(DEFAULT_NEEDS);

  const [optionsLoading, setOptionsLoading] = useState(false);

  const isConsultation =
    formData.category === "BUILD_PC" ||
    formData.category === "UPGRADE" ||
    formData.category === "PRODUCT";

  const isOrderSupport = formData.category === "ORDER";

  const isWarranty = formData.category === "WARRANTY";

  const showOrderCode = isOrderSupport || isWarranty;

  const selectedCategory = useMemo(() => {
    return categories.find((item) => item.value === formData.category) || null;
  }, [categories, formData.category]);

  /* =========================================================
     LOAD OPTIONS
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      try {
        setOptionsLoading(true);

        const response = await contactService.getOptions();

        if (cancelled) {
          return;
        }

        const data = response?.data?.data;

        if (Array.isArray(data?.categories) && data.categories.length > 0) {
          setCategories(data.categories);
        }

        if (
          Array.isArray(data?.consultation_needs) &&
          data.consultation_needs.length > 0
        ) {
          setConsultationNeeds(data.consultation_needs);
        }
      } catch (error) {
        console.warn(
          "Không thể tải tùy chọn liên hệ, sử dụng dữ liệu mặc định:",
          error,
        );
      } finally {
        if (!cancelled) {
          setOptionsLoading(false);
        }
      }
    };

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================================
     INPUT
  ========================================================= */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  const handleCategoryChange = (value) => {
    setFormData((previous) => ({
      ...previous,

      category: value,

      budget: ["BUILD_PC", "UPGRADE", "PRODUCT"].includes(value)
        ? previous.budget
        : "",

      needs: ["BUILD_PC", "UPGRADE", "PRODUCT"].includes(value)
        ? previous.needs
        : [],

      order_code: ["ORDER", "WARRANTY"].includes(value)
        ? previous.order_code
        : "",
    }));

    setErrors({});
  };

  const handleBudgetChange = (event) => {
    const rawValue = event.target.value.replace(/\D/g, "");

    setFormData((previous) => ({
      ...previous,
      budget: rawValue,
    }));

    setErrors((previous) => ({
      ...previous,
      budget: "",
    }));
  };

  const handleNeedToggle = (value) => {
    setFormData((previous) => {
      const exists = previous.needs.includes(value);

      return {
        ...previous,

        needs: exists
          ? previous.needs.filter((item) => item !== value)
          : [...previous.needs, value],
      };
    });

    setErrors((previous) => ({
      ...previous,
      needs: "",
    }));
  };

  /* =========================================================
     QUICK SUPPORT
  ========================================================= */

  const handleQuickSupport = (category) => {
    handleCategoryChange(category);

    setSubmittedRequest(null);

    setTimeout(() => {
      document.querySelector("#contact-request-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  };

  /* =========================================================
     VALIDATE
  ========================================================= */

  const validateForm = () => {
    const newErrors = {};

    const name = formData.name.trim();

    const email = formData.email.trim().toLowerCase();

    const phone = formData.phone.replace(/\s+/g, "").trim();

    const subject = formData.subject.trim();

    const message = formData.message.trim();

    const orderCode = formData.order_code.trim();

    if (!name) {
      newErrors.name = "Vui lòng nhập họ và tên";
    } else if (name.length < 2) {
      newErrors.name = "Họ và tên quá ngắn";
    } else if (name.length > 100) {
      newErrors.name = "Họ và tên tối đa 100 ký tự";
    }

    if (!email) {
      newErrors.email = "Vui lòng nhập email";
    } else if (!isValidEmail(email)) {
      newErrors.email = "Email không hợp lệ";
    }

    if (!phone) {
      newErrors.phone = "Vui lòng nhập số điện thoại";
    } else if (!isValidPhone(phone)) {
      newErrors.phone = "Số điện thoại không hợp lệ";
    }

    if (!formData.category) {
      newErrors.category = "Vui lòng chọn loại yêu cầu";
    }

    if (!subject) {
      newErrors.subject = "Vui lòng nhập tiêu đề";
    } else if (subject.length < 5) {
      newErrors.subject = "Tiêu đề phải có ít nhất 5 ký tự";
    } else if (subject.length > 200) {
      newErrors.subject = "Tiêu đề tối đa 200 ký tự";
    }

    if (isOrderSupport && !orderCode) {
      newErrors.order_code = "Vui lòng nhập mã đơn hàng cần hỗ trợ";
    }

    if (isConsultation && formData.budget) {
      const budget = Number(formData.budget);

      if (!Number.isFinite(budget) || budget <= 0) {
        newErrors.budget = "Ngân sách không hợp lệ";
      }
    }

    if (!message) {
      newErrors.message = "Vui lòng nhập nội dung cần hỗ trợ";
    } else if (message.length < 10) {
      newErrors.message = "Nội dung phải có ít nhất 10 ký tự";
    } else if (message.length > 3000) {
      newErrors.message = "Nội dung tối đa 3000 ký tự";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting || !validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name: formData.name.trim(),

        email: formData.email.trim().toLowerCase(),

        phone: formData.phone.replace(/\s+/g, "").trim(),

        category: formData.category,

        subject: formData.subject.trim(),

        message: formData.message.trim(),

        order_code: showOrderCode ? formData.order_code.trim() : "",

        budget:
          isConsultation && formData.budget ? Number(formData.budget) : null,

        needs: isConsultation ? formData.needs : [],

        website: formData.website,
      };

      const response = await contactService.sendRequest(payload);

      const result = response?.data?.data;

      setSubmittedRequest({
        contact_code: result?.contact_code || "",

        category_label: result?.category_label || selectedCategory?.label || "",

        email: result?.email || formData.email,

        confirmation_mail_sent: result?.confirmation_mail_sent,
      });

      setFormData({
        name: "",
        email: "",
        phone: "",
        category: formData.category,
        subject: "",
        order_code: "",
        budget: "",
        needs: [],
        message: "",
        website: "",
      });

      setErrors({});

      setTimeout(() => {
        document.querySelector("#contact-success")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    } catch (error) {
      console.error("Lỗi gửi liên hệ:", error);

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể gửi yêu cầu. Vui lòng thử lại.";

      setErrors((previous) => ({
        ...previous,
        submit: message,
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendAnother = () => {
    setSubmittedRequest(null);

    setTimeout(() => {
      document.querySelector("#contact-request-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="contact-page">
      <Header />

      {/* BREADCRUMB */}

      <div className="contact-breadcrumb">
        <div className="contact-breadcrumb__shell">
          <Link to="/">Trang chủ</Link>

          <i className="bi bi-chevron-right" />

          <span>Liên hệ & Tư vấn</span>
        </div>
      </div>

      {/* HERO */}

      <section className="contact-hero-section">
        <div className="contact-shell contact-hero-inner">
          <span className="contact-hero-badge">
            <i className="bi bi-headset" />
            KẾT NỐI VỚI BUILDPC
          </span>

          <h1 className="contact-hero-title">
            Chúng tôi luôn sẵn sàng <span>hỗ trợ bạn</span>
          </h1>

          <p className="contact-hero-description">
            Cần tư vấn Build PC, lựa chọn linh kiện, nâng cấp máy tính hay hỗ
            trợ đơn hàng? Hãy gửi yêu cầu cho BuildPC và chúng tôi sẽ phản hồi
            qua email của bạn.
          </p>

          <div className="contact-hero-points">
            <div>
              <i className="bi bi-check-circle-fill" />

              <span>Tư vấn cấu hình theo ngân sách</span>
            </div>

            <div>
              <i className="bi bi-check-circle-fill" />

              <span>Hỗ trợ kỹ thuật & bảo hành</span>
            </div>

            <div>
              <i className="bi bi-check-circle-fill" />

              <span>Theo dõi & hỗ trợ đơn hàng</span>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK SUPPORT */}

      <section className="contact-quick-section">
        <div className="contact-shell">
          <div className="contact-section-heading">
            <span>HỖ TRỢ NHANH</span>

            <h2>Bạn đang cần gì?</h2>

            <p>
              Chọn nhanh nhu cầu để hệ thống chuẩn bị đúng form hỗ trợ cho bạn.
            </p>
          </div>

          <div className="contact-quick-grid">
            {QUICK_SUPPORTS.map((item) => (
              <button
                type="button"
                key={item.category}
                className={`contact-quick-card ${
                  formData.category === item.category ? "is-selected" : ""
                }`}
                onClick={() => handleQuickSupport(item.category)}
              >
                <span className="contact-quick-icon">
                  <i className={`bi ${item.icon}`} />
                </span>

                <strong>{item.title}</strong>

                <p>{item.description}</p>

                <span className="contact-quick-action">
                  Chọn hỗ trợ
                  <i className="bi bi-arrow-right" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* MAIN */}

      <section className="contact-main-section">
        <div className="contact-shell">
          <div className="contact-grid">
            {/* INFO */}

            <aside className="contact-info-card">
              <div className="contact-info-header">
                <span className="contact-info-kicker">BUILDPC</span>

                <h2>Thông tin cửa hàng</h2>

                <p>
                  Bạn cũng có thể liên hệ trực tiếp với BuildPC qua các kênh bên
                  dưới.
                </p>
              </div>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <i className="bi bi-geo-alt-fill" />
                </div>

                <div>
                  <strong>Địa chỉ Showroom</strong>

                  <span>Số 1, Đường Công Nghệ, Quận IT, TP.HCM</span>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <i className="bi bi-telephone-fill" />
                </div>

                <div>
                  <strong>Hotline / Zalo</strong>

                  <a href="tel:19001234">1900 1234</a>

                  <small>Hỗ trợ bán hàng và kỹ thuật</small>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <i className="bi bi-envelope-fill" />
                </div>

                <div>
                  <strong>Email hỗ trợ</strong>

                  <a href="mailto:support@buildpc.com">support@buildpc.com</a>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <i className="bi bi-clock-fill" />
                </div>

                <div>
                  <strong>Giờ làm việc</strong>

                  <span>08:00 - 20:00</span>

                  <small>Thứ 2 - Chủ Nhật</small>
                </div>
              </div>

              <div className="contact-support-box">
                <div>
                  <i className="bi bi-shield-check" />

                  <span>Tư vấn rõ ràng, đúng nhu cầu</span>
                </div>

                <div>
                  <i className="bi bi-cpu" />

                  <span>Hỗ trợ kiểm tra tương thích linh kiện</span>
                </div>

                <div>
                  <i className="bi bi-envelope-check" />

                  <span>Phản hồi trực tiếp qua email</span>
                </div>
              </div>
            </aside>

            {/* FORM */}

            <div className="contact-form-wrapper" id="contact-request-form">
              <div className="contact-form-header">
                <div>
                  <span>LIÊN HỆ & TƯ VẤN</span>

                  <h2>Gửi yêu cầu cho BuildPC</h2>

                  <p>
                    Điền đầy đủ thông tin để chúng tôi có thể hỗ trợ bạn nhanh
                    và chính xác hơn.
                  </p>
                </div>

                <div className="contact-form-header-icon">
                  <i className="bi bi-chat-square-text-fill" />
                </div>
              </div>

              {submittedRequest && (
                <div className="contact-success" id="contact-success">
                  <div className="contact-success-icon">
                    <i className="bi bi-check-lg" />
                  </div>

                  <div className="contact-success-content">
                    <span className="contact-success-kicker">
                      GỬI THÀNH CÔNG
                    </span>

                    <h3>BuildPC đã tiếp nhận yêu cầu của bạn</h3>

                    <p>
                      Yêu cầu <strong>{submittedRequest.category_label}</strong>{" "}
                      đã được gửi thành công.
                    </p>

                    {submittedRequest.contact_code && (
                      <div className="contact-success-code">
                        <span>Mã yêu cầu</span>

                        <strong>{submittedRequest.contact_code}</strong>
                      </div>
                    )}

                    <p>
                      Chúng tôi sẽ phản hồi qua email{" "}
                      <strong>{submittedRequest.email}</strong>.
                    </p>

                    <button
                      type="button"
                      className="contact-btn-secondary"
                      onClick={handleSendAnother}
                    >
                      <i className="bi bi-plus-circle" />
                      Gửi yêu cầu khác
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="contact-form" noValidate>
                <div className="contact-honeypot" aria-hidden="true">
                  <label htmlFor="website">Website</label>

                  <input
                    id="website"
                    name="website"
                    type="text"
                    value={formData.website}
                    onChange={handleChange}
                    tabIndex="-1"
                    autoComplete="off"
                  />
                </div>

                {/* CATEGORY */}

                <div className="contact-form-section">
                  <div className="contact-form-section-title">
                    <span>1</span>

                    <div>
                      <strong>Loại yêu cầu</strong>

                      <small>Chọn nội dung bạn cần BuildPC hỗ trợ.</small>
                    </div>
                  </div>

                  <div className="contact-field">
                    <label htmlFor="category">
                      Bạn cần hỗ trợ về <span>*</span>
                    </label>

                    <select
                      id="category"
                      name="category"
                      className="contact-input contact-select"
                      value={formData.category}
                      onChange={(event) =>
                        handleCategoryChange(event.target.value)
                      }
                      disabled={optionsLoading}
                    >
                      {categories.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>

                    {errors.category && (
                      <small className="contact-error">{errors.category}</small>
                    )}
                  </div>
                </div>

                {/* CUSTOMER INFO */}

                <div className="contact-form-section">
                  <div className="contact-form-section-title">
                    <span>2</span>

                    <div>
                      <strong>Thông tin liên hệ</strong>

                      <small>
                        BuildPC sẽ sử dụng thông tin này để phản hồi yêu cầu của
                        bạn.
                      </small>
                    </div>
                  </div>

                  <div className="contact-field-grid">
                    <div className="contact-field">
                      <label htmlFor="name">
                        Họ và tên <span>*</span>
                      </label>

                      <input
                        type="text"
                        id="name"
                        name="name"
                        className="contact-input"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="VD: Nguyễn Văn A"
                        maxLength={100}
                      />

                      {errors.name && (
                        <small className="contact-error">{errors.name}</small>
                      )}
                    </div>

                    <div className="contact-field">
                      <label htmlFor="phone">
                        Số điện thoại <span>*</span>
                      </label>

                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        className="contact-input"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="VD: 0901234567"
                        maxLength={13}
                      />

                      {errors.phone && (
                        <small className="contact-error">{errors.phone}</small>
                      )}
                    </div>
                  </div>

                  <div className="contact-field">
                    <label htmlFor="email">
                      Email <span>*</span>
                    </label>

                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="contact-input"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="VD: email@gmail.com"
                      maxLength={255}
                    />

                    <small className="contact-hint">
                      Email này sẽ nhận thông báo xác nhận và phản hồi từ
                      BuildPC.
                    </small>

                    {errors.email && (
                      <small className="contact-error">{errors.email}</small>
                    )}
                  </div>
                </div>

                {/* CONSULTATION */}

                {isConsultation && (
                  <div className="contact-form-section contact-consultation-section">
                    <div className="contact-form-section-title">
                      <span>3</span>

                      <div>
                        <strong>Thông tin tư vấn</strong>

                        <small>
                          Cho chúng tôi biết ngân sách và nhu cầu để tư vấn
                          chính xác hơn.
                        </small>
                      </div>
                    </div>

                    <div className="contact-field">
                      <label htmlFor="budget">Ngân sách dự kiến</label>

                      <div className="contact-money-input">
                        <input
                          type="text"
                          id="budget"
                          name="budget"
                          className="contact-input"
                          value={
                            formData.budget ? formatMoney(formData.budget) : ""
                          }
                          onChange={handleBudgetChange}
                          placeholder="VD: 20.000.000"
                          inputMode="numeric"
                        />

                        <span>VNĐ</span>
                      </div>

                      <small className="contact-hint">
                        Không bắt buộc. Ví dụ: 15 - 20 triệu.
                      </small>

                      {errors.budget && (
                        <small className="contact-error">{errors.budget}</small>
                      )}
                    </div>

                    <div className="contact-field">
                      <label>Nhu cầu sử dụng</label>

                      <div className="contact-needs-grid">
                        {consultationNeeds.map((item) => {
                          const checked = formData.needs.includes(item.value);

                          return (
                            <label
                              key={item.value}
                              className={`contact-need-option ${
                                checked ? "is-selected" : ""
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleNeedToggle(item.value)}
                              />

                              <span className="contact-need-check">
                                <i className="bi bi-check-lg" />
                              </span>

                              <span>{item.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ORDER CODE */}

                {showOrderCode && (
                  <div className="contact-form-section">
                    <div className="contact-form-section-title">
                      <span>3</span>

                      <div>
                        <strong>Thông tin đơn hàng</strong>

                        <small>
                          Cung cấp mã đơn để BuildPC kiểm tra nhanh hơn.
                        </small>
                      </div>
                    </div>

                    <div className="contact-field">
                      <label htmlFor="order_code">
                        Mã đơn hàng {isOrderSupport && <span>*</span>}
                      </label>

                      <input
                        type="text"
                        id="order_code"
                        name="order_code"
                        className="contact-input"
                        value={formData.order_code}
                        onChange={handleChange}
                        placeholder="VD: ORD1786123456"
                        maxLength={100}
                      />

                      {isWarranty && (
                        <small className="contact-hint">
                          Không bắt buộc nếu bạn chưa xác định được mã đơn hàng.
                        </small>
                      )}

                      {errors.order_code && (
                        <small className="contact-error">
                          {errors.order_code}
                        </small>
                      )}
                    </div>
                  </div>
                )}

                {/* CONTENT */}

                <div className="contact-form-section">
                  <div className="contact-form-section-title">
                    <span>{isConsultation || showOrderCode ? "4" : "3"}</span>

                    <div>
                      <strong>Nội dung yêu cầu</strong>

                      <small>
                        Mô tả càng chi tiết, BuildPC càng dễ hỗ trợ chính xác.
                      </small>
                    </div>
                  </div>

                  <div className="contact-field">
                    <label htmlFor="subject">
                      Tiêu đề <span>*</span>
                    </label>

                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      className="contact-input"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder={
                        formData.category === "BUILD_PC"
                          ? "VD: Tư vấn PC gaming khoảng 20 triệu"
                          : formData.category === "ORDER"
                            ? "VD: Kiểm tra tình trạng giao hàng"
                            : formData.category === "TECHNICAL"
                              ? "VD: Máy không nhận RAM"
                              : "Nhập tiêu đề yêu cầu"
                      }
                      maxLength={200}
                    />

                    <div className="contact-char-count">
                      {formData.subject.length}
                      /200
                    </div>

                    {errors.subject && (
                      <small className="contact-error">{errors.subject}</small>
                    )}
                  </div>

                  <div className="contact-field">
                    <label htmlFor="message">
                      Nội dung cần hỗ trợ <span>*</span>
                    </label>

                    <textarea
                      id="message"
                      name="message"
                      className="contact-input contact-textarea"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder={
                        isConsultation
                          ? "VD: Mình cần build PC chơi game 2K, ưu tiên NVIDIA, sử dụng thêm để lập trình..."
                          : isOrderSupport
                            ? "Mô tả vấn đề bạn đang gặp với đơn hàng..."
                            : "Hãy mô tả chi tiết vấn đề hoặc yêu cầu bạn cần BuildPC hỗ trợ..."
                      }
                      maxLength={3000}
                    />

                    <div className="contact-char-count">
                      {formData.message.length}
                      /3000
                    </div>

                    {errors.message && (
                      <small className="contact-error">{errors.message}</small>
                    )}
                  </div>
                </div>

                {errors.submit && (
                  <div className="contact-submit-error">
                    <i className="bi bi-exclamation-circle-fill" />

                    <span>{errors.submit}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="contact-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <i className="bi bi-arrow-repeat contact-spin" />
                      Đang gửi yêu cầu...
                    </>
                  ) : (
                    <>
                      <span>Gửi yêu cầu</span>

                      <i className="bi bi-send-fill" />
                    </>
                  )}
                </button>

                <div className="contact-form-note">
                  <i className="bi bi-shield-check" />

                  <span>
                    Thông tin của bạn chỉ được sử dụng để hỗ trợ và phản hồi yêu
                    cầu này.
                  </span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}

      <section className="contact-bottom-section">
        <div className="contact-shell">
          <div className="contact-bottom-card">
            <div>
              <span>MUỐN TỰ CHỌN LINH KIỆN?</span>

              <h2>Thử công cụ Build PC của BuildPC</h2>

              <p>
                Tự xây dựng cấu hình theo nhu cầu và kiểm tra linh kiện phù hợp
                ngay trên website.
              </p>
            </div>

            <Link to="/build-pc" className="contact-build-btn">
              <i className="bi bi-pc-display" />
              Build PC ngay
              <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
