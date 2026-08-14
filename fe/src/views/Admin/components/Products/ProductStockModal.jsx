import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import productService from "../../../../services/productService";
import "./css/ProductStockModal.css";

function ProductStockModal({ open, product, loading, onClose, onSuccess }) {
  const [type, setType] = useState("import");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setType("import");
      setQuantity("");
      setNote("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!quantity || Number(quantity) <= 0) {
      toast.error("Vui lòng nhập số lượng hợp lệ.");
      return;
    }

    try {
      const payload = {
        type,
        quantity: Number(quantity),
        note,
      };

      const res = await productService.adjustStock(product.id, payload);

      toast.success(res.message || "Điều chỉnh tồn kho thành công.");

      onSuccess?.();

      onClose();
    } catch (err) {
      console.error(err);

      toast.error(
        err.response?.data?.message || "Không thể điều chỉnh tồn kho.",
      );
    }
  };

  if (!open || !product) return null;

  return (
    <div className="stock-modal-overlay">
      <div className="stock-modal">
        {/* Header */}

        <div className="stock-header">
          <div>
            <h2>Điều chỉnh tồn kho</h2>

            <p>Cập nhật số lượng sản phẩm trong kho</p>
          </div>

          <button type="button" className="stock-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Product */}

        <div className="stock-product">
          <h3>{product.name}</h3>

          <span>SKU: {product.sku}</span>

          <div className="stock-current">
            Tồn kho hiện tại
            <strong>{product.remaining} sản phẩm</strong>
          </div>
        </div>

        {/* Type */}

        <div className="stock-group">
          <label>Loại điều chỉnh</label>

          <div className="stock-radio-group">
            <label className="stock-radio">
              <input
                type="radio"
                value="import"
                checked={type === "import"}
                onChange={(e) => setType(e.target.value)}
              />
              Nhập thêm
            </label>

            <label className="stock-radio">
              <input
                type="radio"
                value="export"
                checked={type === "export"}
                onChange={(e) => setType(e.target.value)}
              />
              Xuất bớt
            </label>
          </div>
        </div>

        {/* Quantity */}

        <div className="stock-group">
          <label>Số lượng</label>

          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Nhập số lượng..."
          />
        </div>

        {/* Note */}

        <div className="stock-group">
          <label>Ghi chú</label>

          <textarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nhập ghi chú..."
          />
        </div>

        {/* Footer */}

        <div className="stock-footer">
          <button
            type="button"
            className="stock-btn stock-cancel"
            onClick={onClose}
          >
            Hủy
          </button>

          <button
            type="button"
            className="stock-btn stock-save"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? "Đang cập nhật..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductStockModal;
