import { useEffect, useMemo, useRef, useState } from "react";

import { Link } from "react-router-dom";

import "./Cart.css";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import { useCart } from "../../../context/CartContext";

import couponService from "../../../services/couponService";

// ============================================================
// CONFIG
// ============================================================

const IMAGE_BASE_URL =
  process.env.REACT_APP_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000";

const SHIPPING_FEE = 30000;

// ============================================================
// IMAGE
// ============================================================

const getImageUrl = (imageUrl) => {
  if (!imageUrl) {
    return "/images/no-image.png";
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return `${IMAGE_BASE_URL}${imageUrl}`;
};

// ============================================================
// FORMAT
// ============================================================

const formatPrice = (value) => {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
};

// ============================================================
// VARIANT HELPERS
// ============================================================

const getItemStock = (item) => {
  const stock =
    item.available_stock ?? item.variant_stock ?? item.product_stock ?? 0;

  return Math.max(Number(stock || 0), 0);
};

const getItemImage = (item) => {
  return (
    item.display_image || item.variant_thumbnail || item.product_image || null
  );
};

const getItemPrice = (item) => {
  return Number(item.final_price ?? item.price ?? 0);
};

const getItemTotal = (item) => {
  const storedTotal = Number(item.total_price || 0);

  if (storedTotal > 0) {
    return storedTotal;
  }

  return getItemPrice(item) * Number(item.quantity || 0);
};

const getVariantOptions = (item) => {
  if (!Array.isArray(item.variant_options)) {
    return [];
  }

  return item.variant_options;
};

// ============================================================
// CART
// ============================================================

function Cart() {
  const {
    cartItems,

    cartLoading,

    cartCount,

    cartTotal,

    updateQuantity,

    removeItem,

    clearCart,
  } = useCart();

  const toastTimerRef = useRef(null);

  // ==========================================================
  // COUPON
  // ==========================================================

  const [couponCode, setCouponCode] = useState("");

  const [couponMessage, setCouponMessage] = useState("");

  const [couponStatus, setCouponStatus] = useState("");

  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const [couponLoading, setCouponLoading] = useState(false);

  // ==========================================================
  // QUANTITY
  // ==========================================================

  const [quantityInputs, setQuantityInputs] = useState({});

  // ==========================================================
  // UI
  // ==========================================================

  const [updatingItemId, setUpdatingItemId] = useState(null);

  const [clearingCart, setClearingCart] = useState(false);

  const [toast, setToast] = useState(null);

  const [confirmModal, setConfirmModal] = useState({
    show: false,

    title: "",

    message: "",

    confirmText: "Xác nhận",

    type: "danger",

    onConfirm: null,
  });

  const [confirmLoading, setConfirmLoading] = useState(false);

  // ==========================================================
  // SYNC QUANTITY INPUT
  // ==========================================================

  useEffect(() => {
    const nextValues = {};

    cartItems.forEach((item) => {
      nextValues[item.id] = String(item.quantity ?? 1);
    });

    setQuantityInputs(nextValues);
  }, [cartItems]);

  // ==========================================================
  // LOCK BODY WHEN MODAL OPEN
  // ==========================================================

  useEffect(() => {
    if (!confirmModal.show) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [confirmModal.show]);

  // ==========================================================
  // ESC MODAL
  // ==========================================================

  useEffect(() => {
    if (!confirmModal.show) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !confirmLoading) {
        setConfirmModal({
          show: false,

          title: "",

          message: "",

          confirmText: "Xác nhận",

          type: "danger",

          onConfirm: null,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirmModal.show, confirmLoading]);

  // ==========================================================
  // CLEAN TOAST TIMER
  // ==========================================================

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // ==========================================================
  // TOAST
  // ==========================================================

  const showToast = (type, message) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    setToast({
      type,
      message,
    });

    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 2800);
  };

  // ==========================================================
  // CONFIRM
  // ==========================================================

  const openConfirm = ({ title, message, confirmText, type, onConfirm }) => {
    setConfirmModal({
      show: true,

      title,

      message,

      confirmText: confirmText || "Xác nhận",

      type: type || "danger",

      onConfirm,
    });
  };

  const closeConfirm = () => {
    if (confirmLoading) {
      return;
    }

    setConfirmModal({
      show: false,

      title: "",

      message: "",

      confirmText: "Xác nhận",

      type: "danger",

      onConfirm: null,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal.onConfirm) {
      return;
    }

    try {
      setConfirmLoading(true);

      await confirmModal.onConfirm();

      setConfirmModal({
        show: false,

        title: "",

        message: "",

        confirmText: "Xác nhận",

        type: "danger",

        onConfirm: null,
      });
    } catch (error) {
      showToast(
        "error",

        error?.response?.data?.message || error.message || "Thao tác thất bại",
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  // ==========================================================
  // SUBTOTAL
  // ==========================================================

  const subtotal = useMemo(() => {
    if (Number(cartTotal || 0) > 0) {
      return Number(cartTotal);
    }

    return cartItems.reduce((total, item) => {
      return total + getItemTotal(item);
    }, 0);
  }, [cartItems, cartTotal]);

  // ==========================================================
  // DISCOUNT
  // ==========================================================

  const discount = useMemo(() => {
    return Number(appliedCoupon?.discount_amount || 0);
  }, [appliedCoupon]);

  // ==========================================================
  // SHIPPING PREVIEW
  // ==========================================================

  const shipping = cartItems.length > 0 ? SHIPPING_FEE : 0;

  // ==========================================================
  // GRAND TOTAL
  // ==========================================================

  const grandTotal = Math.max(
    subtotal - discount + shipping,

    0,
  );

  // ==========================================================
  // REVALIDATE COUPON
  // ==========================================================

  useEffect(() => {
    if (!appliedCoupon?.code) {
      return;
    }

    if (cartItems.length === 0 || subtotal <= 0) {
      setAppliedCoupon(null);

      setCouponStatus("");

      setCouponMessage("");

      return;
    }

    let cancelled = false;

    const revalidateCoupon = async () => {
      try {
        const response = await couponService.validate({
          code: appliedCoupon.code,

          subtotal,
        });

        if (cancelled) {
          return;
        }

        const coupon = response?.data?.data;

        if (coupon) {
          setAppliedCoupon(coupon);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setAppliedCoupon(null);

        setCouponStatus("error");

        setCouponMessage(
          error?.response?.data?.message ||
            "Mã giảm giá không còn đủ điều kiện áp dụng.",
        );
      }
    };

    revalidateCoupon();

    return () => {
      cancelled = true;
    };
  }, [subtotal, appliedCoupon?.code, cartItems.length]);

  // ==========================================================
  // RESET COUPON
  // ==========================================================

  const resetCoupon = () => {
    setCouponCode("");

    setCouponMessage("");

    setCouponStatus("");
  };

  // ==========================================================
  // ITEM ACTION
  // ==========================================================

  const runItemAction = async (itemId, callback) => {
    try {
      setUpdatingItemId(itemId);

      await callback();
    } finally {
      setUpdatingItemId(null);
    }
  };

  // ==========================================================
  // RESET QUANTITY INPUT
  // ==========================================================

  const resetQuantityInput = (item) => {
    setQuantityInputs((previous) => ({
      ...previous,

      [item.id]: String(item.quantity ?? 1),
    }));
  };

  // ==========================================================
  // INPUT QUANTITY
  // ==========================================================

  const handleQuantityInputChange = (item, event) => {
    const value = event.target.value;

    if (value !== "" && !/^\d+$/.test(value)) {
      return;
    }

    setQuantityInputs((previous) => ({
      ...previous,

      [item.id]: value,
    }));
  };

  // ==========================================================
  // COMMIT QUANTITY
  // ==========================================================

  const commitQuantityInput = async (item) => {
    const currentQuantity = Number(item.quantity || 0);

    const stock = getItemStock(item);

    const rawValue = quantityInputs[item.id];

    if (rawValue === undefined) {
      return;
    }

    const value = String(rawValue).trim();

    if (!value) {
      resetQuantityInput(item);

      showToast("error", "Vui lòng nhập số lượng sản phẩm.");

      return;
    }

    const nextQuantity = Number(value);

    if (!Number.isInteger(nextQuantity) || nextQuantity <= 0) {
      resetQuantityInput(item);

      showToast("error", "Số lượng phải là số nguyên lớn hơn 0.");

      return;
    }

    if (stock <= 0 && nextQuantity > currentQuantity) {
      resetQuantityInput(item);

      showToast(
        "error",

        item.variant_id
          ? "Biến thể này hiện đã hết hàng."
          : "Sản phẩm hiện đã hết hàng.",
      );

      return;
    }

    if (stock > 0 && nextQuantity > stock) {
      resetQuantityInput(item);

      showToast(
        "error",

        item.variant_id
          ? `Biến thể "${item.variant_name}" chỉ còn ${stock} sản phẩm.`
          : `Số lượng tối đa có thể mua hiện tại là ${stock} sản phẩm.`,
      );

      return;
    }

    if (nextQuantity === currentQuantity) {
      resetQuantityInput(item);

      return;
    }

    try {
      await runItemAction(
        item.id,

        async () => {
          await updateQuantity(
            item.id,

            nextQuantity,
          );
        },
      );
    } catch (error) {
      resetQuantityInput(item);

      showToast(
        "error",

        error?.response?.data?.message ||
          error.message ||
          "Không thể cập nhật số lượng.",
      );
    }
  };

  // ==========================================================
  // KEY
  // ==========================================================

  const handleQuantityKeyDown = async (item, event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      await commitQuantityInput(item);

      event.currentTarget.blur();

      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();

      resetQuantityInput(item);

      event.currentTarget.blur();
    }
  };

  // ==========================================================
  // DECREASE
  // ==========================================================

  const handleDecrease = async (item) => {
    const currentQuantity = Number(item.quantity || 0);

    if (currentQuantity <= 1) {
      openConfirm({
        title: "Xóa sản phẩm khỏi giỏ?",

        message: item.variant_name
          ? `Bạn muốn xóa "${item.product_name} - ${item.variant_name}" khỏi giỏ hàng?`
          : `Bạn muốn xóa "${item.product_name}" khỏi giỏ hàng?`,

        confirmText: "Xóa sản phẩm",

        type: "danger",

        onConfirm: async () => {
          await runItemAction(
            item.id,

            async () => {
              await removeItem(item.id);

              showToast("success", "Đã xóa sản phẩm khỏi giỏ hàng.");
            },
          );
        },
      });

      return;
    }

    try {
      await runItemAction(
        item.id,

        async () => {
          await updateQuantity(
            item.id,

            currentQuantity - 1,
          );
        },
      );
    } catch (error) {
      showToast(
        "error",

        error?.response?.data?.message ||
          error.message ||
          "Không thể cập nhật số lượng.",
      );
    }
  };

  // ==========================================================
  // INCREASE
  // ==========================================================

  const handleIncrease = async (item) => {
    const currentQuantity = Number(item.quantity || 0);

    const stock = getItemStock(item);

    if (stock <= 0) {
      showToast(
        "error",

        item.variant_id
          ? "Biến thể này hiện đã hết hàng."
          : "Sản phẩm hiện đã hết hàng.",
      );

      return;
    }

    if (currentQuantity >= stock) {
      showToast(
        "error",

        item.variant_id
          ? `Biến thể "${item.variant_name}" chỉ còn ${stock} sản phẩm.`
          : "Số lượng đã đạt tối đa tồn kho.",
      );

      return;
    }

    try {
      await runItemAction(
        item.id,

        async () => {
          await updateQuantity(
            item.id,

            currentQuantity + 1,
          );
        },
      );
    } catch (error) {
      showToast(
        "error",

        error?.response?.data?.message ||
          error.message ||
          "Không thể cập nhật số lượng.",
      );
    }
  };

  // ==========================================================
  // REMOVE
  // ==========================================================

  const removeCartItem = (item) => {
    openConfirm({
      title: "Xóa sản phẩm?",

      message: item.variant_name
        ? `Bạn có chắc muốn xóa "${item.product_name} - ${item.variant_name}" khỏi giỏ hàng?`
        : `Bạn có chắc muốn xóa "${item.product_name}" khỏi giỏ hàng?`,

      confirmText: "Xóa sản phẩm",

      type: "danger",

      onConfirm: async () => {
        await runItemAction(
          item.id,

          async () => {
            await removeItem(item.id);

            showToast("success", "Đã xóa sản phẩm khỏi giỏ hàng.");
          },
        );
      },
    });
  };

  // ==========================================================
  // CLEAR CART
  // ==========================================================

  const handleClearCart = () => {
    if (cartItems.length === 0) {
      return;
    }

    openConfirm({
      title: "Xóa toàn bộ giỏ hàng?",

      message:
        "Tất cả sản phẩm và phiên bản sản phẩm đang chọn sẽ bị xóa khỏi giỏ hàng.",

      confirmText: "Xóa tất cả",

      type: "danger",

      onConfirm: async () => {
        try {
          setClearingCart(true);

          await clearCart();

          setAppliedCoupon(null);

          resetCoupon();

          showToast("success", "Đã xóa toàn bộ giỏ hàng.");
        } finally {
          setClearingCart(false);
        }
      },
    });
  };

  // ==========================================================
  // COUPON INPUT
  // ==========================================================

  const handleCouponCodeChange = (event) => {
    const value = event.target.value;

    setCouponCode(value);

    if (
      appliedCoupon?.code &&
      value.trim().toUpperCase() !== appliedCoupon.code
    ) {
      setAppliedCoupon(null);

      setCouponStatus("");

      setCouponMessage("");
    }
  };

  // ==========================================================
  // APPLY COUPON
  // ==========================================================

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();

    if (!code) {
      setAppliedCoupon(null);

      setCouponStatus("error");

      setCouponMessage("Vui lòng nhập mã giảm giá.");

      return;
    }

    if (cartItems.length === 0 || subtotal <= 0) {
      setAppliedCoupon(null);

      setCouponStatus("error");

      setCouponMessage("Giỏ hàng đang trống, không thể áp mã.");

      return;
    }

    try {
      setCouponLoading(true);

      setCouponStatus("");

      setCouponMessage("");

      const response = await couponService.validate({
        code,

        subtotal,
      });

      const coupon = response?.data?.data;

      if (!coupon) {
        throw new Error("Không nhận được dữ liệu mã giảm giá.");
      }

      setCouponCode(coupon.code);

      setAppliedCoupon(coupon);

      setCouponStatus("success");

      if (coupon.type === "percent") {
        setCouponMessage(
          `Áp dụng ${coupon.code} thành công: giảm ${Number(
            coupon.value,
          ).toLocaleString("vi-VN")}%.`,
        );
      } else {
        setCouponMessage(
          `Áp dụng ${coupon.code} thành công: giảm ${formatPrice(
            coupon.discount_amount,
          )}.`,
        );
      }

      showToast("success", "Áp mã giảm giá thành công.");
    } catch (error) {
      setAppliedCoupon(null);

      setCouponStatus("error");

      setCouponMessage(
        error?.response?.data?.message ||
          error.message ||
          "Mã giảm giá không hợp lệ.",
      );
    } finally {
      setCouponLoading(false);
    }
  };

  // ==========================================================
  // REMOVE COUPON
  // ==========================================================

  const removeCoupon = () => {
    setAppliedCoupon(null);

    resetCoupon();

    showToast("success", "Đã bỏ mã giảm giá.");
  };

  // ==========================================================
  // CHECKOUT
  // ==========================================================

  const handleCheckoutClick = (event) => {
    if (cartItems.length === 0) {
      event.preventDefault();

      showToast("error", "Giỏ hàng đang trống.");
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="cart-page">
      <Header />

      {/* ======================================================
          BACKGROUND DECORATION
      ====================================================== */}

      <div className="cart-bg-orb cart-bg-orb-one" aria-hidden="true" />

      <div className="cart-bg-orb cart-bg-orb-two" aria-hidden="true" />

      {/* ======================================================
          TOAST
      ====================================================== */}

      {toast && (
        <div
          className={
            toast.type === "success"
              ? "cart-toast cart-toast-success"
              : "cart-toast cart-toast-error"
          }
          role="status"
        >
          <span className="cart-toast-icon">
            <i
              className={
                toast.type === "success"
                  ? "bi bi-check-lg"
                  : "bi bi-exclamation-lg"
              }
            />
          </span>

          <div className="cart-toast-copy">
            <strong>
              {toast.type === "success" ? "Thành công" : "Có lỗi xảy ra"}
            </strong>

            <span>{toast.message}</span>
          </div>

          <button
            type="button"
            className="cart-toast-close"
            onClick={() => setToast(null)}
            aria-label="Đóng thông báo"
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>
      )}

      {/* ======================================================
          BREADCRUMB
      ====================================================== */}

      <nav className="cart-breadcrumb" aria-label="Breadcrumb">
        <div className="cart-shell">
          <Link to="/">Trang chủ</Link>

          <i className="bi bi-chevron-right" />

          <Link to="/Products">Sản phẩm</Link>

          <i className="bi bi-chevron-right" />

          <span>Giỏ hàng</span>
        </div>
      </nav>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <div className="cart-shell cart-main-shell">
        <header className="cart-title">
          <div className="cart-title-copy">
            <span className="cart-kicker">
              <i className="bi bi-bag-check" />
              Giỏ hàng
            </span>

            <h1>Giỏ hàng của bạn</h1>

            <p>
              Kiểm tra chính xác sản phẩm, phiên bản, số lượng và giá trước khi
              chuyển sang bước thanh toán.
            </p>
          </div>

          <div className="cart-title-summary">
            <div className="cart-title-summary-icon">
              <i className="bi bi-cart3" />
            </div>

            <div>
              <span>Tổng số lượng</span>

              <strong>{Number(cartCount || 0)}</strong>
            </div>
          </div>
        </header>

        {/* ====================================================
            LOADING
        ==================================================== */}

        {cartLoading && cartItems.length === 0 ? (
          <section className="cart-panel cart-loading">
            <div className="cart-loading-visual">
              <span />
              <span />
              <span />
            </div>

            <div className="cart-loading-content">
              <h3>Đang tải giỏ hàng</h3>

              <p>Hệ thống đang đồng bộ sản phẩm và tồn kho mới nhất.</p>
            </div>
          </section>
        ) : (
          <div className="cart-layout">
            {/* =================================================
                PRODUCTS
            ================================================= */}

            <section className="cart-panel cart-products-panel">
              <div className="cart-panel-head">
                <div className="cart-panel-heading">
                  <span className="cart-panel-icon">
                    <i className="bi bi-bag" />
                  </span>

                  <div>
                    <h2>Sản phẩm đã chọn</h2>

                    <p>
                      <strong>{Number(cartCount || 0)}</strong> sản phẩm trong
                      giỏ
                    </p>
                  </div>
                </div>

                <button
                  className="cart-clear-btn"
                  type="button"
                  onClick={handleClearCart}
                  disabled={cartItems.length === 0 || clearingCart}
                >
                  <i className="bi bi-trash3" />

                  <span>{clearingCart ? "Đang xóa..." : "Xóa tất cả"}</span>
                </button>
              </div>

              {cartItems.length > 0 ? (
                <div className="cart-list">
                  {cartItems.map((item, index) => {
                    const isUpdating = updatingItemId === item.id;

                    const stock = getItemStock(item);

                    const itemPrice = getItemPrice(item);

                    const itemImage = getItemImage(item);

                    const currentQuantity = Number(item.quantity || 0);

                    const inputValue =
                      quantityInputs[item.id] ?? String(currentQuantity);

                    const variantOptions = getVariantOptions(item);

                    return (
                      <article
                        className={
                          isUpdating
                            ? "cart-item cart-item-updating"
                            : "cart-item"
                        }
                        key={item.id}
                        style={{
                          "--cart-item-delay": `${Math.min(index * 55, 280)}ms`,
                        }}
                      >
                        {isUpdating && (
                          <div
                            className="cart-item-processing"
                            aria-hidden="true"
                          >
                            <i className="bi bi-arrow-repeat" />
                          </div>
                        )}

                        <Link
                          className="cart-item-image-link"
                          to={
                            item.product_slug
                              ? `/products/${item.product_slug}`
                              : "/Products"
                          }
                        >
                          <div className="cart-item-image-wrap">
                            <img
                              src={getImageUrl(itemImage)}
                              alt={item.product_name}
                              className="cart-product-image"
                              onError={(event) => {
                                event.currentTarget.onerror = null;

                                event.currentTarget.src =
                                  "/images/no-image.png";
                              }}
                            />

                            {item.variant_id && (
                              <span className="cart-image-variant-label">
                                <i className="bi bi-layers" />
                                Variant
                              </span>
                            )}
                          </div>
                        </Link>

                        <div className="cart-product-info">
                          <div className="cart-item-status-row">
                            <span
                              className={
                                stock > 0
                                  ? "cart-stock-badge cart-stock-badge-available"
                                  : "cart-stock-badge cart-stock-badge-empty"
                              }
                            >
                              <span className="cart-stock-dot" />

                              {stock > 0 ? "Còn hàng" : "Hết hàng"}
                            </span>

                            {item.variant_id && (
                              <span className="cart-variant-badge">
                                <i className="bi bi-boxes" />
                                Phiên bản
                              </span>
                            )}
                          </div>

                          <Link
                            className="cart-product-name-link"
                            to={
                              item.product_slug
                                ? `/products/${item.product_slug}`
                                : "/Products"
                            }
                          >
                            <h3>{item.product_name}</h3>
                          </Link>

                          {item.variant_name && (
                            <div className="cart-variant-name">
                              <i className="bi bi-diagram-3" />

                              <span>{item.variant_name}</span>
                            </div>
                          )}

                          {variantOptions.length > 0 && (
                            <div className="cart-variant-options">
                              {variantOptions.map((option) => (
                                <span
                                  key={`${option.option_id}-${option.option_value_id}`}
                                >
                                  <small>{option.option_name}</small>

                                  <strong>
                                    {option.label || option.value}
                                  </strong>
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="cart-product-meta">
                            <span>
                              <i className="bi bi-upc-scan" />

                              <span>SKU</span>

                              <strong>
                                {item.variant_sku || item.product_sku || "—"}
                              </strong>
                            </span>

                            <span>
                              <i className="bi bi-box-seam" />

                              <span>Tồn kho</span>

                              <strong>{stock}</strong>
                            </span>
                          </div>

                          <div className="cart-unit-price">
                            <span>Đơn giá</span>

                            <strong>{formatPrice(itemPrice)}</strong>
                          </div>
                        </div>

                        <div className="cart-item-controls">
                          <span className="cart-control-label">Số lượng</span>

                          <div
                            className="cart-quantity-control"
                            aria-label="Chọn số lượng"
                          >
                            <button
                              type="button"
                              className="cart-quantity-btn"
                              onClick={() => handleDecrease(item)}
                              disabled={isUpdating}
                              aria-label="Giảm số lượng"
                            >
                              <i className="bi bi-dash-lg" />
                            </button>

                            <input
                              className="cart-quantity-input"
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={inputValue}
                              onChange={(event) =>
                                handleQuantityInputChange(item, event)
                              }
                              onBlur={() => commitQuantityInput(item)}
                              onKeyDown={(event) =>
                                handleQuantityKeyDown(item, event)
                              }
                              onFocus={(event) => event.currentTarget.select()}
                              disabled={isUpdating}
                              aria-label={`Số lượng ${item.product_name}`}
                            />

                            <button
                              type="button"
                              className="cart-quantity-btn"
                              onClick={() => handleIncrease(item)}
                              disabled={
                                isUpdating ||
                                stock <= 0 ||
                                currentQuantity >= stock
                              }
                              aria-label="Tăng số lượng"
                            >
                              <i className="bi bi-plus-lg" />
                            </button>
                          </div>

                          <small className="cart-stock-helper">
                            Tối đa <strong>{stock}</strong> sản phẩm
                          </small>
                        </div>

                        <div className="cart-item-price">
                          <span>Thành tiền</span>

                          <strong>{formatPrice(getItemTotal(item))}</strong>
                        </div>

                        <button
                          className="cart-remove-btn"
                          type="button"
                          aria-label={`Xóa ${item.product_name}`}
                          title="Xóa sản phẩm"
                          onClick={() => removeCartItem(item)}
                          disabled={isUpdating}
                        >
                          <i className="bi bi-trash3" />
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="cart-empty">
                  <div className="cart-empty-icon">
                    <i className="bi bi-cart-x" />
                  </div>

                  <span className="cart-empty-kicker">Giỏ hàng trống</span>

                  <h3>Bạn chưa chọn sản phẩm nào</h3>

                  <p>
                    Khám phá linh kiện PC và chọn đúng phiên bản phù hợp với nhu
                    cầu của bạn.
                  </p>

                  <Link to="/Products" className="cart-empty-btn">
                    <span>Khám phá sản phẩm</span>

                    <i className="bi bi-arrow-right" />
                  </Link>
                </div>
              )}
            </section>

            {/* =================================================
                SUMMARY
            ================================================= */}

            <aside className="cart-summary-card">
              <div className="cart-summary-top">
                <span className="cart-summary-icon">
                  <i className="bi bi-receipt" />
                </span>

                <div>
                  <span>Thanh toán</span>

                  <h2>Tóm tắt đơn hàng</h2>
                </div>
              </div>

              <div className="cart-coupon-box">
                <div className="cart-coupon-heading">
                  <div>
                    <span>Mã ưu đãi</span>

                    <small>Nhập mã nếu bạn có voucher</small>
                  </div>

                  <i className="bi bi-ticket-perforated" />
                </div>

                <div className="cart-coupon-input-group">
                  <input
                    id="couponInput"
                    type="text"
                    placeholder="VD: BUILDPC10"
                    value={couponCode}
                    onChange={handleCouponCodeChange}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !couponLoading) {
                        applyCoupon();
                      }
                    }}
                  />

                  <button
                    className="cart-coupon-btn"
                    type="button"
                    onClick={applyCoupon}
                    disabled={couponLoading}
                  >
                    {couponLoading ? (
                      <i className="bi bi-arrow-repeat cart-spin" />
                    ) : (
                      <i className="bi bi-arrow-right-short" />
                    )}

                    <span>{couponLoading ? "Đang kiểm tra" : "Áp dụng"}</span>
                  </button>
                </div>

                {appliedCoupon && (
                  <div className="cart-applied-coupon">
                    <div>
                      <span className="cart-applied-coupon-icon">
                        <i className="bi bi-check2" />
                      </span>

                      <div>
                        <small>Đã áp dụng</small>

                        <strong>{appliedCoupon.code}</strong>
                      </div>
                    </div>

                    <button type="button" onClick={removeCoupon}>
                      Gỡ
                    </button>
                  </div>
                )}

                {couponMessage && (
                  <div
                    className={
                      couponStatus === "success"
                        ? "cart-coupon-message cart-coupon-message-success"
                        : "cart-coupon-message cart-coupon-message-error"
                    }
                  >
                    <i
                      className={
                        couponStatus === "success"
                          ? "bi bi-check-circle"
                          : "bi bi-exclamation-circle"
                      }
                    />

                    <span>{couponMessage}</span>
                  </div>
                )}
              </div>

              <div className="cart-summary-lines">
                <div className="cart-summary-line">
                  <span>Tạm tính</span>

                  <strong>{formatPrice(subtotal)}</strong>
                </div>

                <div className="cart-summary-line">
                  <span>Giảm giá</span>

                  <strong className="cart-summary-discount">
                    -{formatPrice(discount)}
                  </strong>
                </div>

                <div className="cart-summary-line">
                  <span>Phí vận chuyển</span>

                  <strong>
                    {cartItems.length === 0 ? "0đ" : formatPrice(shipping)}
                  </strong>
                </div>
              </div>

              <div className="cart-summary-total">
                <div>
                  <span>Tổng dự kiến</span>

                  <small>Đã gồm phí vận chuyển tạm tính</small>
                </div>

                <strong>{formatPrice(grandTotal)}</strong>
              </div>

              <div className="cart-summary-note">
                <span className="cart-summary-note-icon">
                  <i className="bi bi-info-lg" />
                </span>

                <p>
                  Phí vận chuyển chính xác sẽ được tính lại theo tỉnh/thành ở
                  bước thanh toán.
                </p>
              </div>

              <div className="cart-trust-box">
                <div className="cart-trust-item">
                  <span>
                    <i className="bi bi-patch-check" />
                  </span>

                  <div>
                    <strong>Chính hãng</strong>

                    <small>Bảo hành theo từng linh kiện</small>
                  </div>
                </div>

                <div className="cart-trust-item">
                  <span>
                    <i className="bi bi-boxes" />
                  </span>

                  <div>
                    <strong>Đúng phiên bản</strong>

                    <small>Giữ nguyên variant bạn đã chọn</small>
                  </div>
                </div>

                <div className="cart-trust-item">
                  <span>
                    <i className="bi bi-truck" />
                  </span>

                  <div>
                    <strong>Giao toàn quốc</strong>

                    <small>Đóng gói an toàn trước khi giao</small>
                  </div>
                </div>
              </div>

              <Link
                to="/checkout"
                className={
                  cartItems.length === 0
                    ? "cart-checkout-btn cart-checkout-btn-disabled"
                    : "cart-checkout-btn"
                }
                aria-disabled={cartItems.length === 0}
                onClick={handleCheckoutClick}
              >
                <span>Tiến hành thanh toán</span>

                <span className="cart-checkout-arrow">
                  <i className="bi bi-arrow-right" />
                </span>
              </Link>

              <Link className="cart-continue-btn" to="/Products">
                <i className="bi bi-arrow-left" />

                <span>Tiếp tục mua hàng</span>
              </Link>

              <div className="cart-secure-row">
                <i className="bi bi-shield-lock" />

                <span>Thanh toán an toàn và bảo mật</span>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* ======================================================
          CONFIRM MODAL
      ====================================================== */}

      {confirmModal.show && (
        <div
          className="cart-confirm-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeConfirm();
            }
          }}
          role="presentation"
        >
          <div
            className="cart-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cartConfirmTitle"
          >
            <div
              className={
                confirmModal.type === "danger"
                  ? "cart-confirm-icon cart-confirm-icon-danger"
                  : "cart-confirm-icon"
              }
            >
              <i className="bi bi-trash3" />
            </div>

            <span className="cart-confirm-kicker">Xác nhận thao tác</span>

            <h3 id="cartConfirmTitle">{confirmModal.title}</h3>

            <p>{confirmModal.message}</p>

            <div className="cart-confirm-actions">
              <button
                type="button"
                className="cart-confirm-cancel"
                onClick={closeConfirm}
                disabled={confirmLoading}
              >
                Hủy
              </button>

              <button
                type="button"
                className="cart-confirm-submit"
                onClick={handleConfirmAction}
                disabled={confirmLoading}
              >
                {confirmLoading ? (
                  <>
                    <i className="bi bi-arrow-repeat cart-spin" />
                    Đang xử lý
                  </>
                ) : (
                  <>
                    <i className="bi bi-trash3" />

                    {confirmModal.confirmText}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}

export default Cart;
