import React from "react";
import api from "../../../../services/api";

const formatPrice = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Liên hệ";
  }

  return `${number.toLocaleString("vi-VN")}đ`;
};

const getImageUrl = (path) => {
  if (!path) return "";

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  try {
    return new URL(path, api.defaults.baseURL).toString();
  } catch {
    return path;
  }
};

const BuildPartRow = ({
  index,
  partType,
  selectedItems = [],
  onSelect,
  onReplace,
  onRemove,
  onQuantityChange,
}) => {
  const selectedItem = selectedItems[0] || null;

  const typeName = partType?.type_name || "Linh kiện";

  const description = partType?.description || partType?.type_description || "";

  const originalPrice = Number(selectedItem?.product_price || 0);

  const salePrice = Number(selectedItem?.product_sale_price || 0);

  const price = salePrice > 0 ? salePrice : originalPrice;

  const stock = Number(selectedItem?.product_quantity || 0);

  const quantity = Math.max(1, Number(selectedItem?.buildQuantity || 1));

  const image = getImageUrl(selectedItem?.product_thumbnail);

  const initials = String(typeName).trim().slice(0, 2).toUpperCase();

  const handleDecrease = () => {
    if (quantity <= 1) return;

    onQuantityChange?.(0, quantity - 1);
  };

  const handleIncrease = () => {
    if (quantity >= stock) return;

    onQuantityChange?.(0, quantity + 1);
  };

  const handleQuantityInput = (event) => {
    const value = Number(event.target.value);

    if (!Number.isFinite(value)) {
      return;
    }

    onQuantityChange?.(0, value);
  };

  return (
    <article className={`build-part-item ${selectedItem ? "has-product" : ""}`}>
      <div className="build-part-order">{String(index).padStart(2, "0")}</div>

      <div className="build-part-heading">
        <div className="build-part-avatar">{initials}</div>

        <div className="build-part-heading-text">
          <h3>{typeName}</h3>

          {description && <p>{description}</p>}
        </div>
      </div>

      {!selectedItem ? (
        <div className="build-part-placeholder">
          <div>
            <strong>Chưa chọn {typeName}</strong>
            <span>Lựa chọn sản phẩm cho vị trí này</span>
          </div>

          <button
            type="button"
            className="build-choose-button"
            onClick={onSelect}
          >
            <span>+</span>
            Chọn linh kiện
          </button>
        </div>
      ) : (
        <div className="build-selected-product">
          <div className="build-selected-info">
            <div className="build-selected-image">
              {image ? (
                <img src={image} alt={selectedItem.product_name} />
              ) : (
                <span>NO IMAGE</span>
              )}
            </div>

            <div className="build-selected-detail">
              <span className="build-selected-status">Đã chọn</span>

              <h4>{selectedItem.product_name}</h4>

              {selectedItem.product_sku && (
                <p className="build-selected-sku">
                  SKU: {selectedItem.product_sku}
                </p>
              )}

              <div className="build-selected-meta">
                <div className="build-selected-price">
                  <strong>{formatPrice(price)}</strong>

                  {salePrice > 0 && salePrice < originalPrice && (
                    <del>{formatPrice(originalPrice)}</del>
                  )}
                </div>

                <span
                  className={
                    stock > 0
                      ? "build-stock available"
                      : "build-stock unavailable"
                  }
                >
                  <i />
                  {stock > 0 ? `Còn ${stock} sản phẩm` : "Hết hàng"}
                </span>
              </div>
            </div>
          </div>

          <div className="build-selected-actions">
            <div className="build-quantity">
              <span>Số lượng</span>

              <div className="build-quantity-control">
                <button
                  type="button"
                  onClick={handleDecrease}
                  disabled={quantity <= 1}
                >
                  −
                </button>

                <input
                  type="number"
                  min="1"
                  max={stock}
                  value={quantity}
                  onChange={handleQuantityInput}
                />

                <button
                  type="button"
                  onClick={handleIncrease}
                  disabled={stock <= 0 || quantity >= stock}
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              className="build-change-button"
              onClick={onReplace}
            >
              Thay đổi
            </button>

            <button
              type="button"
              className="build-remove-button"
              onClick={onRemove}
              aria-label={`Xóa ${typeName}`}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </article>
  );
};

export default BuildPartRow;
