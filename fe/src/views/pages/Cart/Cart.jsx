import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./Cart.css";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import { useCart } from "../../../context/CartContext";
import couponService from "../../../services/couponService";

const IMAGE_BASE_URL = "http://localhost:5000";
const SHIPPING_FEE = 30000;

const getImageUrl = (imageUrl) => {
  if (!imageUrl) {
    return "https://placehold.co/120x120?text=No+Image";
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return `${IMAGE_BASE_URL}${imageUrl}`;
};

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

  // =========================
  // COUPON
  // =========================
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [couponStatus, setCouponStatus] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // =========================
  // QUANTITY INPUT
  // =========================
  const [quantityInputs, setQuantityInputs] = useState({});

  // =========================
  // UI STATE
  // =========================
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

  // =========================
  // ĐỒNG BỘ QUANTITY INPUT
  // =========================
  useEffect(() => {
    const nextValues = {};

    cartItems.forEach((item) => {
      nextValues[item.id] = String(item.quantity ?? 1);
    });

    setQuantityInputs(nextValues);
  }, [cartItems]);

  // =========================
  // FORMAT PRICE
  // =========================
  const formatPrice = (price) => {
    return `${Number(price || 0).toLocaleString("vi-VN")}đ`;
  };

  // =========================
  // ITEM TOTAL
  // =========================
  const getItemTotal = (item) => {
    const savedTotal = Number(item.total_price || 0);

    if (savedTotal > 0) {
      return savedTotal;
    }

    return Number(item.final_price || 0) * Number(item.quantity || 0);
  };

  // =========================
  // TOAST
  // =========================
  const showToast = (type, message) => {
    setToast({
      type,
      message,
    });

    setTimeout(() => {
      setToast(null);
    }, 2600);
  };

  // =========================
  // CONFIRM MODAL
  // =========================
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
    if (confirmLoading) return;

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
    if (!confirmModal.onConfirm) return;

    try {
      setConfirmLoading(true);

      await confirmModal.onConfirm();

      closeConfirm();
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message || error.message || "Thao tác thất bại",
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  // =========================
  // SUBTOTAL
  // =========================
  const subtotal = useMemo(() => {
    if (Number(cartTotal || 0) > 0) {
      return Number(cartTotal || 0);
    }

    return cartItems.reduce((total, item) => {
      return total + getItemTotal(item);
    }, 0);
  }, [cartItems, cartTotal]);

  // =========================
  // DISCOUNT
  // =========================
  const discount = useMemo(() => {
    return Number(appliedCoupon?.discount_amount || 0);
  }, [appliedCoupon]);

  // =========================
  // SHIPPING
  // =========================
  const shipping = cartItems.length > 0 ? SHIPPING_FEE : 0;

  // =========================
  // GRAND TOTAL
  // =========================
  const grandTotal = Math.max(subtotal - discount + shipping, 0);

  // =========================
  // KIỂM TRA LẠI COUPON
  // KHI GIỎ HÀNG THAY ĐỔI
  // =========================
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

        if (cancelled) return;

        const coupon = response.data?.data;

        if (coupon) {
          setAppliedCoupon(coupon);
        }
      } catch (error) {
        if (cancelled) return;

        setAppliedCoupon(null);

        setCouponStatus("error");

        setCouponMessage(
          error.response?.data?.message ||
            "Mã giảm giá không còn đủ điều kiện áp dụng.",
        );
      }
    };

    revalidateCoupon();

    return () => {
      cancelled = true;
    };
  }, [subtotal, appliedCoupon?.code, cartItems.length]);

  // =========================
  // RESET COUPON
  // =========================
  const setDiscountStateEmpty = () => {
    setCouponCode("");
    setCouponMessage("");
    setCouponStatus("");
  };

  // =========================
  // ITEM LOADING
  // =========================
  const runItemAction = async (itemId, callback) => {
    try {
      setUpdatingItemId(itemId);

      await callback();
    } finally {
      setUpdatingItemId(null);
    }
  };

  // =========================
  // RESET QUANTITY INPUT
  // =========================
  const resetQuantityInput = (item) => {
    setQuantityInputs((previous) => ({
      ...previous,
      [item.id]: String(item.quantity ?? 1),
    }));
  };

  // =========================
  // NHẬP QUANTITY
  // =========================
  const handleQuantityInputChange = (item, event) => {
    const value = event.target.value;

    // Cho phép ô trống tạm thời khi user đang gõ.
    // Nếu không rỗng thì chỉ cho nhập số.
    if (value !== "" && !/^\d+$/.test(value)) {
      return;
    }

    setQuantityInputs((previous) => ({
      ...previous,
      [item.id]: value,
    }));
  };

  // =========================
  // LƯU QUANTITY
  // =========================
  const commitQuantityInput = async (item) => {
    const currentQuantity = Number(item.quantity || 0);

    const stock = Number(item.product_stock || 0);

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

    // Sản phẩm hết hàng:
    // không cho tăng thêm số lượng
    if (stock <= 0 && nextQuantity > currentQuantity) {
      resetQuantityInput(item);

      showToast("error", "Sản phẩm hiện đã hết hàng.");

      return;
    }

    // Vượt tồn kho
    if (stock > 0 && nextQuantity > stock) {
      resetQuantityInput(item);

      showToast(
        "error",
        `Số lượng tối đa có thể mua hiện tại là ${stock} sản phẩm.`,
      );

      return;
    }

    // Không thay đổi
    if (nextQuantity === currentQuantity) {
      resetQuantityInput(item);
      return;
    }

    try {
      await runItemAction(item.id, async () => {
        await updateQuantity(item.id, nextQuantity);
      });
    } catch (error) {
      resetQuantityInput(item);

      showToast(
        "error",
        error.response?.data?.message ||
          error.message ||
          "Lỗi cập nhật số lượng",
      );
    }
  };

  // =========================
  // ENTER / ESCAPE
  // =========================
  const handleQuantityKeyDown = async (item, event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      await commitQuantityInput(item);

      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();

      resetQuantityInput(item);

      event.currentTarget.blur();
    }
  };

  // =========================
  // GIẢM QUANTITY
  // =========================
  const handleDecrease = async (item) => {
    const currentQuantity = Number(item.quantity || 0);

    if (currentQuantity <= 1) {
      openConfirm({
        title: "Xóa sản phẩm khỏi giỏ?",

        message: `Bạn muốn xóa "${item.product_name}" khỏi giỏ hàng?`,

        confirmText: "Xóa sản phẩm",

        type: "danger",

        onConfirm: async () => {
          await runItemAction(item.id, async () => {
            await removeItem(item.id);

            showToast("success", "Đã xóa sản phẩm khỏi giỏ hàng");
          });
        },
      });

      return;
    }

    try {
      await runItemAction(item.id, async () => {
        await updateQuantity(item.id, currentQuantity - 1);
      });
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message ||
          error.message ||
          "Lỗi cập nhật số lượng",
      );
    }
  };

  // =========================
  // TĂNG QUANTITY
  // =========================
  const handleIncrease = async (item) => {
    const currentQuantity = Number(item.quantity || 0);

    const stock = Number(item.product_stock || 0);

    if (stock <= 0) {
      showToast("error", "Sản phẩm hiện đã hết hàng.");

      return;
    }

    if (currentQuantity >= stock) {
      showToast("error", "Số lượng đã đạt tối đa tồn kho");

      return;
    }

    try {
      await runItemAction(item.id, async () => {
        await updateQuantity(item.id, currentQuantity + 1);
      });
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message ||
          error.message ||
          "Lỗi cập nhật số lượng",
      );
    }
  };

  // =========================
  // REMOVE ITEM
  // =========================
  const removeCartItem = async (item) => {
    openConfirm({
      title: "Xóa sản phẩm?",

      message: `Bạn có chắc muốn xóa "${item.product_name}" khỏi giỏ hàng?`,

      confirmText: "Xóa sản phẩm",

      type: "danger",

      onConfirm: async () => {
        await runItemAction(item.id, async () => {
          await removeItem(item.id);

          showToast("success", "Đã xóa sản phẩm khỏi giỏ hàng");
        });
      },
    });
  };

  // =========================
  // CLEAR CART
  // =========================
  const handleClearCart = async () => {
    if (cartItems.length === 0) {
      return;
    }

    openConfirm({
      title: "Xóa toàn bộ giỏ hàng?",

      message: "Tất cả sản phẩm trong giỏ sẽ bị xóa. Bạn chắc chắn chứ?",

      confirmText: "Xóa tất cả",

      type: "danger",

      onConfirm: async () => {
        try {
          setClearingCart(true);

          await clearCart();

          setAppliedCoupon(null);

          setDiscountStateEmpty();

          showToast("success", "Đã xóa toàn bộ giỏ hàng");
        } finally {
          setClearingCart(false);
        }
      },
    });
  };

  // =========================
  // NHẬP MÃ COUPON
  // =========================
  const handleCouponCodeChange = (event) => {
    const value = event.target.value;

    setCouponCode(value);

    // Nếu đang áp coupon nhưng user sửa sang mã khác
    // thì bỏ coupon cũ khỏi phép tính.
    if (
      appliedCoupon?.code &&
      value.trim().toUpperCase() !== appliedCoupon.code
    ) {
      setAppliedCoupon(null);
      setCouponStatus("");
      setCouponMessage("");
    }
  };

  // =========================
  // APPLY COUPON
  // =========================
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

      const coupon = response.data?.data;

      if (!coupon) {
        throw new Error("Không nhận được dữ liệu mã giảm giá");
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

      showToast("success", "Áp mã giảm giá thành công");
    } catch (error) {
      setAppliedCoupon(null);

      setCouponStatus("error");

      setCouponMessage(
        error.response?.data?.message ||
          error.message ||
          "Mã giảm giá không hợp lệ.",
      );
    } finally {
      setCouponLoading(false);
    }
  };

  // =========================
  // REMOVE COUPON
  // =========================
  const removeCoupon = () => {
    setAppliedCoupon(null);

    setDiscountStateEmpty();

    showToast("success", "Đã bỏ mã giảm giá");
  };

  // =========================
  // CHECKOUT
  // =========================
  const handleCheckoutClick = (event) => {
    if (cartItems.length === 0) {
      event.preventDefault();

      showToast("error", "Giỏ hàng đang trống.");
    }
  };

  return (
    <main className="cart-page">
      <Header />

      {/* =========================
          TOAST
      ========================= */}
      {toast && (
        <div
          className={
            toast.type === "success"
              ? "cart-toast cart-toast-success"
              : "cart-toast cart-toast-error"
          }
        >
          {toast.type === "success" ? (
            <i className="bi bi-check-circle-fill"></i>
          ) : (
            <i className="bi bi-exclamation-circle-fill"></i>
          )}

          <span>{toast.message}</span>
        </div>
      )}

      {/* =========================
          BREADCRUMB
      ========================= */}
      <div className="cart-breadcrumb">
        <div className="container">
          <Link to="/">Trang chủ</Link>

          <span>/</span>

          <Link to="/Products">Cửa hàng</Link>

          <span>/</span>

          <span>Giỏ hàng</span>
        </div>
      </div>

      <div className="container py-5">
        {/* =========================
            TITLE
        ========================= */}
        <div className="cart-title mb-4">
          <span className="cart-kicker">Giỏ hàng</span>

          <h1 className="mb-2">Kiểm tra đơn hàng của bạn</h1>

          <p className="mb-0">
            Cập nhật số lượng, áp mã ưu đãi và xem tổng tiền trước khi thanh
            toán.
          </p>
        </div>

        {/* =========================
            LOADING
        ========================= */}
        {cartLoading && cartItems.length === 0 ? (
          <section className="cart-panel cart-loading">
            <div className="cart-loading-content">
              <i className="bi bi-arrow-repeat"></i>

              <h3>Đang tải giỏ hàng...</h3>

              <p>Vui lòng chờ trong giây lát.</p>
            </div>
          </section>
        ) : (
          <div className="row g-4 align-items-start">
            {/* =========================
                CART ITEMS
            ========================= */}
            <div className="col-lg-8">
              <section className="cart-panel">
                <div className="cart-panel-head">
                  <div>
                    <h2>Sản phẩm</h2>

                    <p className="mb-0">
                      <span>{cartCount || cartItems.length}</span> sản phẩm
                      trong giỏ
                    </p>
                  </div>

                  <button
                    className="btn-clear"
                    type="button"
                    onClick={handleClearCart}
                    disabled={cartItems.length === 0 || clearingCart}
                  >
                    {clearingCart ? "Đang xóa..." : "Xóa tất cả"}
                  </button>
                </div>

                <div className="cart-list">
                  {cartItems.map((item) => {
                    const isUpdating = updatingItemId === item.id;

                    const stock = Number(item.product_stock || 0);

                    const currentQuantity = Number(item.quantity || 0);

                    const inputValue =
                      quantityInputs[item.id] ?? String(currentQuantity);

                    return (
                      <article
                        className={
                          isUpdating ? "cart-item is-updating" : "cart-item"
                        }
                        key={item.id}
                      >
                        {/* IMAGE */}
                        <img
                          src={getImageUrl(item.product_image)}
                          alt={item.product_name}
                          className="product-img"
                          onError={(event) => {
                            event.currentTarget.onerror = null;

                            event.currentTarget.src =
                              "https://placehold.co/120x120?text=No+Image";
                          }}
                        />

                        {/* PRODUCT INFO */}
                        <div className="product-info">
                          <span
                            className={
                              stock > 0 ? "sale-badge" : "sale-badge yellow"
                            }
                          >
                            {stock > 0 ? "Còn hàng" : "Hết hàng"}
                          </span>

                          <h3>{item.product_name}</h3>

                          <p>
                            Giá: {formatPrice(item.final_price)} • Tồn kho:{" "}
                            {item.product_stock}
                          </p>
                        </div>

                        {/* QUANTITY */}
                        <div className="qty-control" aria-label="Chọn số lượng">
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => handleDecrease(item)}
                            disabled={isUpdating}
                          >
                            -
                          </button>

                          <input
                            className="qty-input"
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
                            title="Nhập số lượng rồi nhấn Enter hoặc bấm ra ngoài để cập nhật"
                          />

                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => handleIncrease(item)}
                            disabled={
                              isUpdating ||
                              stock <= 0 ||
                              currentQuantity >= stock
                            }
                          >
                            +
                          </button>
                        </div>

                        {/* TOTAL */}
                        <strong className="item-total">
                          {formatPrice(getItemTotal(item))}
                        </strong>

                        {/* REMOVE */}
                        <button
                          className="remove-btn"
                          type="button"
                          aria-label={`Xóa ${item.product_name}`}
                          onClick={() => removeCartItem(item)}
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <i className="bi bi-arrow-repeat"></i>
                          ) : (
                            "×"
                          )}
                        </button>
                      </article>
                    );
                  })}
                </div>

                {/* EMPTY CART */}
                {cartItems.length === 0 && (
                  <div className="empty-cart">
                    <i className="bi bi-cart-x"></i>

                    <h3>Giỏ hàng đang trống</h3>

                    <p className="mb-0">
                      Hãy thêm sản phẩm để tiếp tục thanh toán.
                    </p>

                    <Link to="/Products" className="empty-cart-btn">
                      Mua sắm ngay
                    </Link>
                  </div>
                )}
              </section>
            </div>

            {/* =========================
                SUMMARY
            ========================= */}
            <div className="col-lg-4">
              <aside className="cart-panel summary-panel">
                <h2>Tóm tắt đơn hàng</h2>

                {/* COUPON */}
                <div className="coupon-box">
                  <label className="form-label" htmlFor="couponInput">
                    Mã giảm giá
                  </label>

                  <div className="input-group">
                    <input
                      className="form-control"
                      id="couponInput"
                      type="text"
                      placeholder="Nhập mã"
                      value={couponCode}
                      onChange={handleCouponCodeChange}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !couponLoading) {
                          applyCoupon();
                        }
                      }}
                    />

                    <button
                      className="btn coupon-btn"
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponLoading}
                    >
                      {couponLoading ? "Đang kiểm tra..." : "Áp dụng"}
                    </button>
                  </div>

                  {/* APPLIED */}
                  {appliedCoupon && (
                    <div className="applied-coupon">
                      <span>Mã đang áp dụng: {appliedCoupon.code}</span>

                      <button type="button" onClick={removeCoupon}>
                        Bỏ mã
                      </button>
                    </div>
                  )}

                  {/* MESSAGE */}
                  <small
                    className={
                      couponStatus
                        ? `coupon-message ${couponStatus}`
                        : "coupon-message"
                    }
                  >
                    {couponMessage}
                  </small>
                </div>

                {/* =========================
                    PRICE SUMMARY
                ========================= */}
                <div className="summary-list">
                  <div className="summary-row">
                    <span>Tạm tính</span>

                    <strong>{formatPrice(subtotal)}</strong>
                  </div>

                  <div className="summary-row">
                    <span>Giảm giá</span>

                    <strong>-{formatPrice(discount)}</strong>
                  </div>

                  <div className="summary-row">
                    <span>Phí vận chuyển</span>

                    <strong>
                      {cartItems.length === 0 ? "0đ" : formatPrice(shipping)}
                    </strong>
                  </div>
                </div>

                {/* TOTAL */}
                <div className="summary-total">
                  <span>Tổng thanh toán</span>

                  <strong>{formatPrice(grandTotal)}</strong>
                </div>

                {/* TRUST */}
                <div className="cart-trust-box">
                  <div>
                    <i className="bi bi-shield-check"></i>

                    <span>Hàng chính hãng, bảo hành theo linh kiện</span>
                  </div>

                  <div>
                    <i className="bi bi-tools"></i>

                    <span>Hỗ trợ kiểm tra tương thích khi Build PC</span>
                  </div>

                  <div>
                    <i className="bi bi-truck"></i>

                    <span>Giao hàng toàn quốc, đóng gói an toàn</span>
                  </div>
                </div>

                {/* CHECKOUT */}
                <Link
                  to="/checkout"
                  className={
                    cartItems.length === 0
                      ? "btn checkout-btn w-100 text-center disabled"
                      : "btn checkout-btn w-100 text-center"
                  }
                  role="button"
                  onClick={handleCheckoutClick}
                >
                  Thanh toán
                </Link>

                <Link className="btn continue-btn w-100" to="/Products">
                  Tiếp tục mua hàng
                </Link>
              </aside>
            </div>
          </div>
        )}
      </div>

      {/* =========================
          CONFIRM MODAL
      ========================= */}
      {confirmModal.show && (
        <div className="cart-confirm-overlay">
          <div className="cart-confirm-modal">
            <div
              className={
                confirmModal.type === "danger"
                  ? "cart-confirm-icon danger"
                  : "cart-confirm-icon"
              }
            >
              <i className="bi bi-exclamation-triangle-fill"></i>
            </div>

            <h3>{confirmModal.title}</h3>

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
                {confirmLoading ? "Đang xử lý..." : confirmModal.confirmText}
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
