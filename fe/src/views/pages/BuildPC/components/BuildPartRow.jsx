import React from "react";

import api from "../../../../services/api";

// ============================================================
// HELPERS
// ============================================================

const formatPrice = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Liên hệ";
  }

  return `${Math.round(number).toLocaleString("vi-VN")}đ`;
};

const getImageUrl = (path) => {
  if (!path) {
    return "/images/no-image.png";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  try {
    return new URL(
      path,
      api.defaults.baseURL,
    ).toString();
  } catch {
    return path;
  }
};

const getSpecValue = (
  item,
  keys,
) => {
  const specifications =
    item?.specifications || {};

  for (const key of keys) {
    const value =
      specifications?.[key] ??
      item?.[key];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return String(value);
    }
  }

  return "";
};

// ============================================================
// COMPONENT
// ============================================================

const BuildPartRow = ({
  index,
  typeCode,
  icon,
  partType,
  selectedItems = [],
  allowQuantity = false,
  onSelect,
  onReplace,
  onRemove,
  onQuantityChange,
}) => {
  const selectedItem =
    selectedItems[0] || null;

  const typeName =
    partType?.type_name ||
    "Linh kiện";

  const description =
    partType?.description ||
    partType?.type_description ||
    "";

  if (!selectedItem) {
    return (
      <article className="client-build-part-row">
        <div className="client-build-part-index">
          {String(index).padStart(
            2,
            "0",
          )}
        </div>

        <div className="client-build-part-type">
          <div className="client-build-part-type-icon">
            <i
              className={`bi ${
                icon || "bi-pc"
              }`}
            />
          </div>

          <div>
            <h3>
              {typeName}
            </h3>

            {description && (
              <p>
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="client-build-part-empty">
          <div>
            <span>
              CHƯA CHỌN
            </span>

            <strong>
              Chọn {typeName}
            </strong>

            <p>
              Tìm sản phẩm phù hợp cho
              vị trí này.
            </p>
          </div>

          <button
            type="button"
            className="client-build-choose-button"
            onClick={onSelect}
          >
            <i className="bi bi-plus-lg" />
            Chọn linh kiện
          </button>
        </div>
      </article>
    );
  }

  const originalPrice =
    Number(
      selectedItem.original_price ||
        selectedItem.product_price ||
        selectedItem.price ||
        0,
    );

  const salePrice =
    Number(
      selectedItem.sale_price ||
        selectedItem.product_sale_price ||
        0,
    );

  const price =
    Number(
      selectedItem.effective_price ||
        (salePrice > 0 &&
        salePrice < originalPrice
          ? salePrice
          : originalPrice),
    );

  const stock =
    Math.max(
      0,
      Number(
        selectedItem.stock_quantity ||
          0,
      ),
    );

  const quantity =
    allowQuantity
      ? Math.max(
          1,
          Number(
            selectedItem.buildQuantity ||
              1,
          ),
        )
      : 1;

  const image =
    getImageUrl(
      selectedItem.display_thumbnail ||
        selectedItem.product_thumbnail ||
        selectedItem.thumbnail,
    );

  const displayName =
    selectedItem.display_name ||
    selectedItem.product_name ||
    selectedItem.name ||
    typeName;

  const sku =
    selectedItem.display_sku ||
    selectedItem.product_sku ||
    selectedItem.sku ||
    "";

  const specCandidates = [
    {
      label: "Socket",
      value: getSpecValue(
        selectedItem,
        ["socket"],
      ),
    },
    {
      label: "RAM",
      value: getSpecValue(
        selectedItem,
        ["ram_type"],
      ),
    },
    {
      label: "Form Factor",
      value: getSpecValue(
        selectedItem,
        ["form_factor"],
      ),
    },
    {
      label: "Công suất",
      value: getSpecValue(
        selectedItem,
        [
          "wattage",
          "power_recommend",
        ],
      ),
    },
  ].filter((item) => item.value);

  const handleDecrease = () => {
    if (
      !allowQuantity ||
      quantity <= 1
    ) {
      return;
    }

    onQuantityChange?.(
      0,
      quantity - 1,
    );
  };

  const handleIncrease = () => {
    if (
      !allowQuantity ||
      quantity >= stock
    ) {
      return;
    }

    onQuantityChange?.(
      0,
      quantity + 1,
    );
  };

  const handleQuantityInput = (
    event,
  ) => {
    if (!allowQuantity) {
      return;
    }

    const value =
      Number(
        event.target.value,
      );

    if (
      !Number.isFinite(value)
    ) {
      return;
    }

    onQuantityChange?.(
      0,
      value,
    );
  };

  return (
    <article className="client-build-part-row client-build-part-row--selected">
      <div className="client-build-part-index">
        {String(index).padStart(
          2,
          "0",
        )}
      </div>

      <div className="client-build-part-type">
        <div className="client-build-part-type-icon client-build-part-type-icon--selected">
          <i
            className={`bi ${
              icon || "bi-pc"
            }`}
          />
        </div>

        <div>
          <h3>
            {typeName}
          </h3>

          <p>
            {description}
          </p>
        </div>
      </div>

      <div className="client-build-selected">
        <div className="client-build-selected-main">
          <div className="client-build-selected-image">
            <img
              src={image}
              alt={displayName}
              onError={(event) => {
                event.currentTarget.src =
                  "/images/no-image.png";
              }}
            />
          </div>

          <div className="client-build-selected-content">
            <div className="client-build-selected-topline">
              <span>
                <i className="bi bi-check-circle-fill" />
                Đã chọn
              </span>

              {selectedItem.variant_id && (
                <span className="client-build-variant-badge">
                  Variant
                </span>
              )}
            </div>

            <h4>
              {displayName}
            </h4>

            {sku && (
              <p className="client-build-selected-sku">
                SKU: {sku}
              </p>
            )}

            {specCandidates.length >
              0 && (
              <div className="client-build-selected-specs">
                {specCandidates
                  .slice(0, 3)
                  .map((spec) => (
                    <span
                      key={
                        spec.label
                      }
                    >
                      <small>
                        {
                          spec.label
                        }
                      </small>

                      <strong>
                        {
                          spec.value
                        }
                      </strong>
                    </span>
                  ))}
              </div>
            )}

            <div className="client-build-selected-bottom">
              <div className="client-build-selected-price">
                <strong>
                  {formatPrice(
                    price,
                  )}
                </strong>

                {salePrice > 0 &&
                  originalPrice >
                    salePrice && (
                    <del>
                      {formatPrice(
                        originalPrice,
                      )}
                    </del>
                  )}
              </div>

              <span
                className={`client-build-stock ${
                  stock > 0
                    ? "client-build-stock--available"
                    : "client-build-stock--unavailable"
                }`}
              >
                <i />

                {stock > 0
                  ? `Còn ${stock}`
                  : "Hết hàng"}
              </span>
            </div>
          </div>
        </div>

        <div className="client-build-selected-actions">
          {allowQuantity && (
            <div className="client-build-quantity">
              <span>
                Số lượng
              </span>

              <div className="client-build-quantity-control">
                <button
                  type="button"
                  onClick={
                    handleDecrease
                  }
                  disabled={
                    quantity <= 1
                  }
                >
                  <i className="bi bi-dash" />
                </button>

                <input
                  type="number"
                  min="1"
                  max={stock}
                  value={quantity}
                  onChange={
                    handleQuantityInput
                  }
                />

                <button
                  type="button"
                  onClick={
                    handleIncrease
                  }
                  disabled={
                    quantity >= stock
                  }
                >
                  <i className="bi bi-plus" />
                </button>
              </div>
            </div>
          )}

          <div className="client-build-row-buttons">
            <button
              type="button"
              className="client-build-change-button"
              onClick={onReplace}
            >
              <i className="bi bi-arrow-left-right" />
              Thay đổi
            </button>

            <button
              type="button"
              className="client-build-remove-button"
              onClick={onRemove}
              aria-label={`Xóa ${typeName}`}
              title={`Xóa ${typeName}`}
            >
              <i className="bi bi-trash3" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default BuildPartRow;