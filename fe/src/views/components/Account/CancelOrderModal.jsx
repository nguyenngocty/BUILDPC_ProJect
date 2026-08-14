import {
  useEffect,
  useMemo,
  useState,
} from "react";

const CANCEL_REASONS = [
  {
    value: "CHANGE_PRODUCT",
    label:
      "Tôi muốn thay đổi sản phẩm hoặc số lượng",
    icon:
      "bi bi-arrow-left-right",
  },
  {
    value: "WRONG_SHIPPING_INFO",
    label:
      "Thông tin nhận hàng chưa chính xác",
    icon:
      "bi bi-geo-alt",
  },
  {
    value: "CHANGE_PAYMENT",
    label:
      "Tôi muốn đổi phương thức thanh toán",
    icon:
      "bi bi-credit-card",
  },
  {
    value: "DELIVERY_TIME",
    label:
      "Thời gian giao hàng không phù hợp",
    icon:
      "bi bi-clock",
  },
  {
    value: "NO_LONGER_NEEDED",
    label:
      "Tôi không còn nhu cầu mua sản phẩm",
    icon:
      "bi bi-cart-x",
  },
  {
    value: "OTHER",
    label:
      "Lý do khác",
    icon:
      "bi bi-three-dots",
  },
];

function CancelOrderModal({
  isOpen,
  order,
  loading = false,
  onClose,
  onConfirm,
}) {
  const [
    selectedReason,
    setSelectedReason,
  ] = useState("");

  const [
    customReason,
    setCustomReason,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    setSelectedReason("");
    setCustomReason("");
    setError("");

    const handleKeyDown = (
      event
    ) => {
      if (
        event.key === "Escape" &&
        !loading
      ) {
        onClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [
    isOpen,
    loading,
    onClose,
  ]);

  const selectedReasonOption =
    useMemo(
      () =>
        CANCEL_REASONS.find(
          (reason) =>
            reason.value ===
            selectedReason
        ) || null,
      [selectedReason]
    );

  if (!isOpen) {
    return null;
  }

  const handleReasonChange = (
    event
  ) => {
    const nextReason =
      event.target.value;

    setSelectedReason(
      nextReason
    );

    if (
      nextReason !== "OTHER"
    ) {
      setCustomReason("");
    }

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!selectedReasonOption) {
      setError(
        "Vui lòng chọn một lý do hủy đơn hàng."
      );
      return;
    }

    let finalReason =
      selectedReasonOption.label;

    if (
      selectedReason === "OTHER"
    ) {
      const normalizedCustomReason =
        customReason.trim();

      if (!normalizedCustomReason) {
        setError(
          "Vui lòng nhập lý do hủy đơn hàng."
        );
        return;
      }

      if (
        normalizedCustomReason.length <
        5
      ) {
        setError(
          "Lý do khác cần có ít nhất 5 ký tự."
        );
        return;
      }

      finalReason =
        normalizedCustomReason;
    }

    setError("");

    await onConfirm(
      finalReason
    );
  };

  return (
    <div
      className="cancel-order-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !loading
        ) {
          onClose();
        }
      }}
    >
      <div
        className="cancel-order-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancelOrderModalTitle"
      >
        <button
          type="button"
          className="cancel-order-modal-close"
          onClick={onClose}
          disabled={loading}
          aria-label="Đóng"
        >
          <i className="bi bi-x-lg" />
        </button>

        <div className="cancel-order-modal-icon">
          <i className="bi bi-exclamation-triangle-fill" />
        </div>

        <h2 id="cancelOrderModalTitle">
          Hủy đơn hàng
        </h2>

        <p className="cancel-order-modal-description">
          Vui lòng cho biết lý do
          hủy đơn{" "}
          <strong>
            {order?.order_code}
          </strong>
          . Đơn hàng chỉ được hủy
          khi đang chờ xác nhận và
          chưa thanh toán.
        </p>

        <form
          onSubmit={handleSubmit}
        >
          <fieldset
            className="cancel-order-reason-fieldset"
            disabled={loading}
          >
            <legend>
              Chọn lý do hủy đơn
              <span aria-hidden="true">
                *
              </span>
            </legend>

            <div className="cancel-order-reason-list">
              {CANCEL_REASONS.map(
                (reason) => {
                  const inputId =
                    `cancelReason-${reason.value}`;

                  const checked =
                    selectedReason ===
                    reason.value;

                  return (
                    <label
                      className={
                        checked
                          ? "cancel-order-reason-option selected"
                          : "cancel-order-reason-option"
                      }
                      htmlFor={
                        inputId
                      }
                      key={
                        reason.value
                      }
                    >
                      <input
                        id={inputId}
                        type="radio"
                        name="cancelReason"
                        value={
                          reason.value
                        }
                        checked={
                          checked
                        }
                        onChange={
                          handleReasonChange
                        }
                      />

                      <span className="cancel-order-reason-radio">
                        <span />
                      </span>

                      <i
                        className={
                          reason.icon
                        }
                        aria-hidden="true"
                      />

                      <span className="cancel-order-reason-label">
                        {reason.label}
                      </span>
                    </label>
                  );
                }
              )}
            </div>
          </fieldset>

          {selectedReason ===
            "OTHER" && (
            <div className="cancel-order-custom-reason">
              <label
                htmlFor="cancelOrderCustomReason"
              >
                Nhập lý do khác
                <span aria-hidden="true">
                  *
                </span>
              </label>

              <textarea
                id="cancelOrderCustomReason"
                value={customReason}
                onChange={(event) => {
                  setCustomReason(
                    event.target.value.slice(
                      0,
                      500
                    )
                  );

                  if (error) {
                    setError("");
                  }
                }}
                placeholder="Nhập lý do bạn muốn hủy đơn hàng..."
                rows={4}
                maxLength={500}
                disabled={loading}
                autoFocus
              />

              <div className="cancel-order-modal-counter">
                <span>
                  Tối đa 500 ký tự
                </span>

                <strong>
                  {customReason.length}/500
                </strong>
              </div>
            </div>
          )}

          {error && (
            <p
              className="cancel-order-modal-error"
              role="alert"
            >
              <i className="bi bi-exclamation-circle" />
              {error}
            </p>
          )}

          <div className="cancel-order-modal-actions">
            <button
              type="button"
              className="cancel-order-modal-back"
              onClick={onClose}
              disabled={loading}
            >
              Quay lại
            </button>

            <button
              type="submit"
              className="cancel-order-modal-submit"
              disabled={
                loading ||
                !selectedReason
              }
            >
              {loading ? (
                <>
                  <i className="bi bi-arrow-repeat" />
                  Đang hủy...
                </>
              ) : (
                <>
                  <i className="bi bi-x-circle" />
                  Xác nhận hủy
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CancelOrderModal;