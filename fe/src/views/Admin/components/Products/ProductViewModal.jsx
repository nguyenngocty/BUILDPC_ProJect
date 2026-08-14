import { useEffect, useMemo, useState } from "react";
import "./css/ProductViewModal.css";

const UPLOAD_URL = process.env.REACT_APP_UPLOAD_URL || "http://localhost:5000";

function ProductViewModal({ open, product, onClose, onEdit }) {
  const galleryImages = useMemo(() => {
    if (!product) return [];

    return [
      product.thumbnail,
      ...(product.gallery || []).map((img) => img.image_url),
    ]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);
  }, [product]);

  const [activeImage, setActiveImage] = useState("");

  useEffect(() => {
    if (!open || !product) {
      setActiveImage("");
      return;
    }

    setActiveImage(galleryImages[0] || null);
  }, [open, product, galleryImages]);

  if (!open || !product) return null;

  const getImageUrl = (image) => {
    if (!image) {
      return "/images/no-image.png";
    }

    // File upload
    if (image instanceof File) {
      return URL.createObjectURL(image);
    }

    // String
    if (typeof image === "string") {
      if (image.startsWith("http")) return image;

      return `${UPLOAD_URL}${image}`;
    }

    // object backend

    if (image.image_url) {
      return `${UPLOAD_URL}${image.image_url}`;
    }

    if (image.path) {
      return `${UPLOAD_URL}${image.path}`;
    }

    if (image.url) {
      return `${UPLOAD_URL}${image.url}`;
    }

    return "/images/no-image.png";
  };

  const formatMoney = (value) => {
    if (!value) return "0 ₫";

    return Number(value).toLocaleString("vi-VN") + " ₫";
  };

  const formatDate = (date) => {
    if (!date) return "Không có";

    return new Date(date).toLocaleDateString("vi-VN");
  };

  return (
    <div className="pc-product-view-overlay">
      <div className="pc-product-view-modal">
        {/* HEADER */}

        <div className="pc-product-view-header">
          <div className="pc-product-view-heading">
            <h2 className="pc-product-view-title">{product.name}</h2>

            <p className="pc-product-view-subtitle">
              Chi tiết thông tin sản phẩm
            </p>
          </div>

          <button className="pc-product-view-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* BODY */}

        <div className="pc-product-view-body">
          <div className="pc-product-view-main">
            {/* LEFT */}

            <div className="pc-product-gallery">
              <div className="pc-product-gallery-main-box">
                <img
                  src={getImageUrl(activeImage)}
                  alt={product.name}
                  className="pc-product-gallery-main"
                />
              </div>

              <div className="pc-product-gallery-list">
                {galleryImages.length > 0 ? (
                  galleryImages.map((image, index) => (
                    <img
                      key={image}
                      src={getImageUrl(image)}
                      alt=""
                      className={
                        activeImage === image
                          ? "pc-product-gallery-thumb active"
                          : "pc-product-gallery-thumb"
                      }
                      onClick={() => setActiveImage(image)}
                    />
                  ))
                ) : (
                  <span>Chưa có hình ảnh</span>
                )}
              </div>
            </div>

            {/* RIGHT */}

            <div className="pc-product-view-right">
              <div className="pc-product-status-box">
                <span
                  className={
                    product.status === 1
                      ? "pc-product-status-active"
                      : "pc-product-status-hidden"
                  }
                >
                  {product.status === 1 ? "Đang bán" : "Ngừng bán"}
                </span>
              </div>

              <div className="pc-product-card">
                <h3>Thông tin sản phẩm</h3>

                <div className="pc-product-information">
                  <div className="pc-product-information-item">
                    <label>SKU</label>
                    <span>{product.sku || "-"}</span>
                  </div>

                  <div className="pc-product-information-item">
                    <label>Danh mục</label>
                    <span>{product.category_name || "-"}</span>
                  </div>

                  <div className="pc-product-information-item">
                    <label>Thương hiệu</label>
                    <span>{product.brand_name || "-"}</span>
                  </div>

                  <div className="pc-product-information-item">
                    <label>Ngày tạo</label>
                    <span>{formatDate(product.created_at)}</span>
                  </div>

                  <div className="pc-product-information-item">
                    <label>Cập nhật</label>
                    <span>{formatDate(product.updated_at)}</span>
                  </div>
                </div>
              </div>

              <div className="pc-product-card">
                <h3>Giá sản phẩm</h3>

                <div className="pc-product-price">
                  <div>
                    <label>Giá bán</label>

                    <strong>{formatMoney(product.price)}</strong>
                  </div>

                  <div>
                    <label>Giá khuyến mãi</label>

                    <strong>
                      {product.sale_price
                        ? formatMoney(product.sale_price)
                        : "Không có"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="pc-product-card">
                <h3>Kho hàng</h3>

                <div className="pc-product-stock">
                  <div>
                    <span>Tồn kho</span>
                    <strong>{product.quantity}</strong>
                  </div>

                  <div>
                    <span>Đã bán</span>
                    <strong>{product.sold || 0}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pc-product-card">
            <h3>Mô tả ngắn</h3>

            <p>{product.short_description || "Chưa có mô tả ngắn."}</p>
          </div>

          <div className="pc-product-card">
            <h3>Mô tả sản phẩm</h3>

            <div className="pc-product-description-content">
              {product.description || "Chưa có mô tả."}
            </div>
          </div>

          <div className="pc-product-card">
            <h3>Thông số kỹ thuật</h3>

            {product.specifications?.length ? (
              <div className="pc-product-spec-table">
                {product.specifications.map((spec, index) => (
                  <div
                    className="pc-product-spec-row"
                    key={`${spec.spec_key}-${index}`}
                  >
                    <span>{spec.spec_key}</span>

                    <strong>{spec.value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p>Chưa có thông số.</p>
            )}
          </div>
        </div>

        {/* FOOTER */}

        <div className="pc-product-view-footer">
          <button className="pc-product-view-btn-close" onClick={onClose}>
            Đóng
          </button>

          {onEdit && (
            <button
              className="pc-product-view-btn-edit"
              onClick={() => onEdit(product)}
            >
              Chỉnh sửa
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductViewModal;
