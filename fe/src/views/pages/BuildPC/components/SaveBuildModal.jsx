import React, { useEffect, useState } from "react";

const SaveBuildModal = ({
  open,
  saving = false,
  totalPrice = 0,
  itemCount = 0,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setName("");
    setDescription("");
    setError("");
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) {
        onClose?.();
      }
    };

    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;

      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, saving, onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedName = name.trim();

    if (!normalizedName) {
      setError("Vui lòng nhập tên cấu hình.");
      return;
    }

    if (normalizedName.length < 3) {
      setError("Tên cấu hình phải có ít nhất 3 ký tự.");
      return;
    }

    if (normalizedName.length > 150) {
      setError("Tên cấu hình không được vượt quá 150 ký tự.");
      return;
    }

    setError("");

    await onSave?.({
      name: normalizedName,
      description: description.trim(),
    });
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="client-build-action-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose?.();
        }
      }}
    >
      <form className="client-build-save-dialog" onSubmit={handleSubmit}>
        <header className="client-build-action-modal-header">
          <div>
            <span className="client-build-action-kicker">
              <i className="bi bi-bookmark-heart" />
              MY BUILDS
            </span>

            <h2>Lưu cấu hình của bạn</h2>

            <p>
              Cấu hình sẽ được lưu vào tài khoản để bạn có thể xem, chỉnh sửa
              hoặc thêm lại vào giỏ hàng.
            </p>
          </div>

          <button
            type="button"
            className="client-build-action-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Đóng"
          >
            <i className="bi bi-x-lg" />
          </button>
        </header>

        <div className="client-build-save-content">
          <div className="client-build-save-overview">
            <div>
              <span>
                <i className="bi bi-grid-3x3-gap" />
              </span>

              <div>
                <small>Linh kiện đã chọn</small>
                <strong>{itemCount} nhóm</strong>
              </div>
            </div>

            <div>
              <span>
                <i className="bi bi-cash-stack" />
              </span>

              <div>
                <small>Tổng giá trị</small>

                <strong>
                  {Number(totalPrice || 0).toLocaleString("vi-VN")}đ
                </strong>
              </div>
            </div>
          </div>

          <label className="client-build-save-field">
            <span>
              Tên cấu hình
              <em>*</em>
            </span>

            <div>
              <i className="bi bi-pc-display" />

              <input
                type="text"
                value={name}
                maxLength={150}
                disabled={saving}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
                placeholder="Ví dụ: PC Gaming RTX 5070 của tôi"
                autoFocus
              />
            </div>

            <small>{name.length}/150 ký tự</small>
          </label>

          <label className="client-build-save-field">
            <span>Mô tả</span>

            <textarea
              value={description}
              disabled={saving}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ghi chú thêm về mục đích sử dụng, ngân sách hoặc cấu hình..."
              rows={4}
            />
          </label>

          <div className="client-build-save-security">
            <i className="bi bi-shield-check" />

            <div>
              <strong>Dữ liệu được Backend xác minh</strong>

              <p>
                Product, Variant, giá và tổng tiền không lấy trực tiếp từ dữ
                liệu FE khi lưu cấu hình.
              </p>
            </div>
          </div>

          {error && (
            <div className="client-build-action-error">
              <i className="bi bi-exclamation-circle" />
              {error}
            </div>
          )}
        </div>

        <footer className="client-build-action-footer">
          <button
            type="button"
            className="client-build-action-cancel"
            onClick={onClose}
            disabled={saving}
          >
            Hủy
          </button>

          <button
            type="submit"
            className="client-build-action-submit"
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="client-build-button-spinner" />
                Đang lưu...
              </>
            ) : (
              <>
                <i className="bi bi-bookmark-check" />
                Lưu cấu hình
              </>
            )}
          </button>
        </footer>
      </form>
    </div>
  );
};

export default SaveBuildModal;
