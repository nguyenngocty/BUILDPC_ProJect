import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import productService from "../../../../../services/productService";

import { validateStockPayload } from "../../../../../utils/validateForm";

function VariantStockModal({ product, variant, onClose, onUpdated }) {
  const [type, setType] = useState("import");

  const [quantity, setQuantity] = useState("");

  const [note, setNote] = useState("");

  const [saving, setSaving] = useState(false);

  const currentQuantity = Number(variant?.quantity || 0);

  const previewQuantity = useMemo(() => {
    const qty = Number(quantity);

    if (!Number.isFinite(qty)) {
      return currentQuantity;
    }

    if (type === "import") {
      return currentQuantity + qty;
    }

    if (type === "export") {
      return Math.max(currentQuantity - qty, 0);
    }

    if (type === "adjust") {
      return Math.max(qty, 0);
    }

    return currentQuantity;
  }, [type, quantity, currentQuantity]);

  const handleSubmit = async () => {
    const error = validateStockPayload(type, quantity);

    if (error) {
      toast.error(error);

      return;
    }

    try {
      setSaving(true);

      const res = await productService.adjustVariantStock(
        product.id,
        variant.id,
        {
          type,

          quantity: Number(quantity),

          note: note.trim(),
        },
      );

      if (!res?.success) {
        toast.error(res?.message || "Không thể điều chỉnh tồn kho.");

        return;
      }

      toast.success(res.message || "Điều chỉnh tồn kho biến thể thành công.");

      onUpdated?.(res.data?.product);
    } catch (error) {
      console.error(error);

      toast.error(
        error.response?.data?.message || "Không thể điều chỉnh tồn kho.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-product-modal" onClick={onClose}>
      <div
        className="adm-product-modal__dialog adm-product-variant-stock-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="adm-product-modal__header">
          <div className="adm-product-modal__heading">
            <span className="adm-product-panel__icon">
              <i className="bi bi-boxes" />
            </span>

            <div>
              <h2>Điều chỉnh tồn kho biến thể</h2>

              <p>
                {variant.variant_name} • {variant.sku}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="adm-product-modal__close"
            onClick={onClose}
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="adm-product-variant-stock-body">
          <div className="adm-product-variant-stock-overview">
            <div>
              <span>Tồn kho hiện tại</span>

              <strong>{currentQuantity}</strong>
            </div>

            <span className="adm-product-variant-stock-arrow">
              <i className="bi bi-arrow-right" />
            </span>

            <div className="adm-product-variant-stock-overview__after">
              <span>Sau điều chỉnh</span>

              <strong>{previewQuantity}</strong>
            </div>
          </div>

          <div className="adm-product-stock-field">
            <label>Loại điều chỉnh</label>

            <div className="adm-product-variant-stock-types">
              <button
                type="button"
                className={[
                  "adm-product-variant-stock-type",

                  type === "import" && "adm-product-variant-stock-type--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setType("import")}
              >
                <span>
                  <i className="bi bi-plus-lg" />
                </span>

                <div>
                  <strong>Nhập kho</strong>

                  <small>Cộng thêm tồn kho</small>
                </div>
              </button>

              <button
                type="button"
                className={[
                  "adm-product-variant-stock-type",

                  type === "export" && "adm-product-variant-stock-type--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setType("export")}
              >
                <span>
                  <i className="bi bi-dash-lg" />
                </span>

                <div>
                  <strong>Xuất kho</strong>

                  <small>Trừ bớt tồn kho</small>
                </div>
              </button>

              <button
                type="button"
                className={[
                  "adm-product-variant-stock-type",

                  type === "adjust" && "adm-product-variant-stock-type--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setType("adjust")}
              >
                <span>
                  <i className="bi bi-arrow-repeat" />
                </span>

                <div>
                  <strong>Điều chỉnh</strong>

                  <small>Đặt số lượng mới</small>
                </div>
              </button>
            </div>
          </div>

          <div className="adm-product-stock-field">
            <label>{type === "adjust" ? "Tồn kho mới" : "Số lượng"}</label>

            <input
              type="number"
              min={type === "adjust" ? 0 : 1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder={
                type === "adjust" ? "Nhập tồn kho mới..." : "Nhập số lượng..."
              }
            />
          </div>

          <div className="adm-product-stock-field">
            <label>Ghi chú</label>

            <textarea
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ví dụ: Nhập hàng đợt tháng 8..."
            />
          </div>

          {type === "export" && Number(quantity) > currentQuantity && (
            <div className="adm-product-variant-stock-warning">
              <i className="bi bi-exclamation-triangle-fill" />

              <span>
                Không đủ tồn kho. Hiện chỉ còn{" "}
                <strong>{currentQuantity}</strong> sản phẩm.
              </span>
            </div>
          )}
        </div>

        <div className="adm-product-modal__footer">
          <button
            type="button"
            className="adm-product-button adm-product-button--secondary"
            onClick={onClose}
            disabled={saving}
          >
            Hủy
          </button>

          <button
            type="button"
            className="adm-product-button adm-product-button--primary"
            onClick={handleSubmit}
            disabled={
              saving ||
              (type === "export" && Number(quantity) > currentQuantity)
            }
          >
            {saving ? (
              <>
                <span className="adm-product-spinner adm-product-spinner--small" />
                Đang cập nhật...
              </>
            ) : (
              <>
                <i className="bi bi-check-lg" />
                Xác nhận
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VariantStockModal;
