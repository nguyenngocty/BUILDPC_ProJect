import { useEffect, useState } from "react";
import productService from "../../../../services/productService";
import "./css/ProductStockHistoryModal.css";

function ProductStockHistoryModal({ open, product, onClose }) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!open || !product) return;

    loadHistory();
  }, [open, product]);

  const loadHistory = async () => {
    try {
      setLoading(true);

      const res = await productService.getStockHistory(product.id);

      setHistory(res.data || []);
    } catch (err) {
      console.error(err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const renderType = (type) => {
    switch (type) {
      case "import":
        return (
          <span className="stock-type import">
            <i className="bi bi-plus-circle-fill"></i>
            Nhập kho
          </span>
        );

      case "export":
        return (
          <span className="stock-type export">
            <i className="bi bi-dash-circle-fill"></i>
            Xuất kho
          </span>
        );

      default:
        return (
          <span className="stock-type adjust">
            <i className="bi bi-arrow-repeat"></i>
            Điều chỉnh
          </span>
        );
    }
  };

  const formatDate = (date) => new Date(date).toLocaleString("vi-VN");

  if (!open || !product) return null;

  return (
    <div className="stock-history-overlay">
      <div className="stock-history-modal">
        {/* Header */}

        <div className="stock-history-header">
          <div>
            <h2>Lịch sử tồn kho</h2>

            <p>{product.name}</p>

            <span>SKU: {product.sku}</span>
          </div>

          <button className="stock-history-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Table */}

        <div className="stock-history-body">
          {loading ? (
            <div className="stock-history-loading">Đang tải...</div>
          ) : history.length === 0 ? (
            <div className="stock-history-empty">
              Chưa có lịch sử điều chỉnh tồn kho.
            </div>
          ) : (
            <table className="stock-history-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Loại</th>
                  <th>Số lượng</th>
                  <th>Trước</th>
                  <th>Sau</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>

              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.created_at)}</td>

                    <td>{renderType(item.type)}</td>

                    <td>{item.quantity}</td>

                    <td>{item.quantity_before}</td>

                    <td>{item.quantity_after}</td>

                    <td>{item.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="stock-history-footer">
          <button className="stock-history-btn" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductStockHistoryModal;
