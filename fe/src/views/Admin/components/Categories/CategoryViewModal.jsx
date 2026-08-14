import "./css/CategoryViewModal.css";

function CategoryViewModal({ open, category, onClose }) {
  if (!open || !category) return null;

  return (
    <div className="cvm-overlay" onClick={onClose}>
      <div className="cvm-container" onClick={(e) => e.stopPropagation()}>
        {/* ================= HEADER ================= */}

        <div className="cvm-header">
          <div className="cvm-heading">
            <h2>Chi tiết danh mục</h2>

            <p>Thông tin đầy đủ của danh mục.</p>
          </div>

          <button className="cvm-close" onClick={onClose} type="button">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* ================= BODY ================= */}

        <div className="cvm-body">
          {/* IMAGE */}

          <div className="cvm-image-box">
            {category.image ? (
              <img
                src={`http://localhost:5000${category.image}`}
                alt={category.name}
                className="cvm-image"
              />
            ) : (
              <div className="cvm-no-image">
                <i className="bi bi-image"></i>
              </div>
            )}
          </div>

          {/* CONTENT */}

          <div className="cvm-content">
            <div className="cvm-item">
              <span>Tên danh mục</span>

              <strong>{category.name}</strong>
            </div>

            <div className="cvm-item">
              <span>Slug</span>

              <strong>{category.slug}</strong>
            </div>

            <div className="cvm-item">
              <span>Trạng thái</span>

              <strong
                className={`cvm-status ${
                  Number(category.status) === 1 ? "active" : "inactive"
                }`}
              >
                {Number(category.status) === 1 ? "Hoạt động" : "Tạm khóa"}
              </strong>
            </div>

            <div className="cvm-item">
              <span>Ngày tạo</span>

              <strong>
                {category.created_at
                  ? new Date(category.created_at).toLocaleString("vi-VN")
                  : "--"}
              </strong>
            </div>

            <div className="cvm-item">
              <span>Cập nhật</span>

              <strong>
                {category.updated_at
                  ? new Date(category.updated_at).toLocaleString("vi-VN")
                  : "--"}
              </strong>
            </div>

            <div className="cvm-description">
              <span>Mô tả</span>

              <p>{category.description || "Không có mô tả."}</p>
            </div>
          </div>
        </div>

        {/* ================= FOOTER ================= */}

        <div className="cvm-footer">
          <button
            type="button"
            className="cvm-btn cvm-btn-close"
            onClick={onClose}
          >
            <i className="bi bi-x-circle"></i>

            <span>Đóng</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default CategoryViewModal;
