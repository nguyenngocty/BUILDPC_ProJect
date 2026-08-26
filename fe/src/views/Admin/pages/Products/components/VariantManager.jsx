import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import productService from "../../../../../services/productService";

import VariantFormModal from "./VariantFormModal";
import VariantStockModal from "./VariantStockModal";
import VariantImageManager from "./VariantImageManager";

const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

const getVariantValueLabel = (variant) => {
  const values = Array.isArray(variant?.values) ? variant.values : [];

  if (values.length === 0) {
    return variant?.variant_name || "Mặc định";
  }

  return values
    .map((item) => item.label || item.value)
    .filter(Boolean)
    .join(" / ");
};

function VariantManager({ product, onProductUpdated }) {
  const [formOpen, setFormOpen] = useState(false);

  const [formMode, setFormMode] = useState("create");

  const [selectedVariant, setSelectedVariant] = useState(null);

  const [stockOpen, setStockOpen] = useState(false);

  const [imageOpen, setImageOpen] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState(null);

  const variants = useMemo(() => {
    return Array.isArray(product?.variants) ? product.variants : [];
  }, [product]);

  const activeVariants = useMemo(() => {
    return variants.filter((item) => !item.deleted_at);
  }, [variants]);

  const totalStock = useMemo(() => {
    return activeVariants.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );
  }, [activeVariants]);

  const handleCreate = () => {
    setSelectedVariant(null);

    setFormMode("create");

    setFormOpen(true);
  };

  const handleEdit = (variant) => {
    setSelectedVariant(variant);

    setFormMode("edit");

    setFormOpen(true);
  };

  const handleStock = (variant) => {
    setSelectedVariant(variant);

    setStockOpen(true);
  };

  const handleImages = (variant) => {
    setSelectedVariant(variant);

    setImageOpen(true);
  };

  const handleToggleStatus = async (variant) => {
    if (actionLoadingId) {
      return;
    }

    try {
      setActionLoadingId(variant.id);

      const res = await productService.toggleVariantStatus(
        product.id,
        variant.id,
      );

      if (!res?.success) {
        toast.error(res?.message || "Không thể thay đổi trạng thái biến thể.");

        return;
      }

      toast.success(res.message || "Đã cập nhật trạng thái biến thể.");

      onProductUpdated?.(res.data?.product);
    } catch (error) {
      console.error(error);

      toast.error(
        error.response?.data?.message ||
          "Không thể thay đổi trạng thái biến thể.",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSetDefault = async (variant) => {
    if (Number(variant.is_default) === 1) {
      toast("Biến thể này đã là mặc định.");

      return;
    }

    if (actionLoadingId) {
      return;
    }

    try {
      setActionLoadingId(variant.id);

      const res = await productService.setDefaultVariant(
        product.id,
        variant.id,
      );

      if (!res?.success) {
        toast.error(res?.message || "Không thể đặt biến thể mặc định.");

        return;
      }

      toast.success(res.message || "Đã đặt biến thể mặc định.");

      onProductUpdated?.(res.data?.product);
    } catch (error) {
      console.error(error);

      toast.error(
        error.response?.data?.message || "Không thể đặt biến thể mặc định.",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (variant) => {
    const accepted = window.confirm(
      `Bạn có chắc muốn xóa biến thể "${variant.variant_name}"?`,
    );

    if (!accepted || actionLoadingId) {
      return;
    }

    try {
      setActionLoadingId(variant.id);

      const res = await productService.deleteVariant(product.id, variant.id);

      if (!res?.success) {
        toast.error(res?.message || "Không thể xóa biến thể.");

        return;
      }

      toast.success(res.message || "Xóa biến thể thành công.");

      onProductUpdated?.(res.data?.product);
    } catch (error) {
      console.error(error);

      toast.error(error.response?.data?.message || "Không thể xóa biến thể.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSaved = (updatedProduct) => {
    setFormOpen(false);

    setSelectedVariant(null);

    if (updatedProduct) {
      onProductUpdated?.(updatedProduct);
    }
  };

  const handleStockUpdated = (updatedProduct) => {
    setStockOpen(false);

    setSelectedVariant(null);

    if (updatedProduct) {
      onProductUpdated?.(updatedProduct);
    }
  };

  const handleImagesUpdated = (updatedProduct) => {
    if (updatedProduct) {
      onProductUpdated?.(updatedProduct);
    }
  };

  return (
    <>
      <section className="adm-product-variant-section">
        <div className="adm-product-variant-section__header">
          <div>
            <span className="adm-product-variant-section__kicker">
              Biến thể sản phẩm
            </span>

            <h3>Quản lý biến thể</h3>

            <p>
              Quản lý SKU, giá bán, tồn kho, trạng thái, ảnh và thuộc tính của
              từng phiên bản sản phẩm.
            </p>
          </div>

          <button
            type="button"
            className="adm-product-button adm-product-button--primary"
            onClick={handleCreate}
          >
            <i className="bi bi-plus-lg" />
            Thêm biến thể
          </button>
        </div>

        <div className="adm-product-variant-summary">
          <div>
            <span>Tổng biến thể</span>

            <strong>{activeVariants.length}</strong>
          </div>

          <div>
            <span>Tổng tồn kho</span>

            <strong>{totalStock}</strong>
          </div>

          <div>
            <span>Đang hiển thị</span>

            <strong>
              {
                activeVariants.filter((variant) => Number(variant.status) === 1)
                  .length
              }
            </strong>
          </div>

          <div>
            <span>Biến thể mặc định</span>

            <strong>
              {activeVariants.find(
                (variant) => Number(variant.is_default) === 1,
              )?.variant_name || "--"}
            </strong>
          </div>
        </div>

        {activeVariants.length === 0 ? (
          <div className="adm-product-variant-empty">
            <span>
              <i className="bi bi-diagram-3" />
            </span>

            <strong>Chưa có biến thể</strong>

            <p>Sản phẩm hiện chưa có phiên bản riêng để quản lý.</p>

            <button
              type="button"
              className="adm-product-button adm-product-button--primary"
              onClick={handleCreate}
            >
              <i className="bi bi-plus-lg" />
              Tạo biến thể đầu tiên
            </button>
          </div>
        ) : (
          <div className="adm-product-variant-list">
            {activeVariants.map((variant) => {
              const isDefault = Number(variant.is_default) === 1;

              const isActive = Number(variant.status) === 1;

              const loading = Number(actionLoadingId) === Number(variant.id);

              return (
                <article
                  key={variant.id}
                  className={[
                    "adm-product-variant-card",

                    isDefault && "adm-product-variant-card--default",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="adm-product-variant-card__top">
                    <div className="adm-product-variant-card__identity">
                      <span className="adm-product-variant-card__icon">
                        <i className="bi bi-box-seam" />
                      </span>

                      <div>
                        <div className="adm-product-variant-card__title-row">
                          <h4>
                            {variant.variant_name ||
                              getVariantValueLabel(variant)}
                          </h4>

                          {isDefault && (
                            <span className="adm-product-variant-default-badge">
                              <i className="bi bi-star-fill" />
                              Mặc định
                            </span>
                          )}

                          <span
                            className={[
                              "adm-product-variant-status-badge",

                              isActive
                                ? "adm-product-variant-status-badge--active"
                                : "adm-product-variant-status-badge--inactive",
                            ].join(" ")}
                          >
                            <span />

                            {isActive ? "Đang hiển thị" : "Đang ẩn"}
                          </span>
                        </div>

                        <div className="adm-product-variant-card__sku">
                          SKU: {variant.sku || "--"}
                        </div>
                      </div>
                    </div>

                    <div className="adm-product-variant-card__quick-actions">
                      <button
                        type="button"
                        title="Chỉnh sửa"
                        onClick={() => handleEdit(variant)}
                      >
                        <i className="bi bi-pencil-square" />
                      </button>

                      <button
                        type="button"
                        title="Quản lý ảnh"
                        onClick={() => handleImages(variant)}
                      >
                        <i className="bi bi-images" />
                      </button>

                      <button
                        type="button"
                        title="Điều chỉnh kho"
                        onClick={() => handleStock(variant)}
                      >
                        <i className="bi bi-boxes" />
                      </button>

                      <button
                        type="button"
                        className="adm-product-variant-card__delete"
                        title="Xóa biến thể"
                        onClick={() => handleDelete(variant)}
                        disabled={loading}
                      >
                        <i className="bi bi-trash3" />
                      </button>
                    </div>
                  </div>

                  <div className="adm-product-variant-card__values">
                    {(variant.values || []).map((value) => (
                      <div key={`${variant.id}-${value.option_id}`}>
                        <span>{value.option_name}</span>

                        <strong>{value.label || value.value}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="adm-product-variant-card__metrics">
                    <div>
                      <span>Giá bán</span>

                      <strong>{formatMoney(variant.price)}</strong>
                    </div>

                    <div>
                      <span>Khuyến mãi</span>

                      <strong>
                        {variant.sale_price
                          ? formatMoney(variant.sale_price)
                          : "Không có"}
                      </strong>
                    </div>

                    <div>
                      <span>Tồn kho</span>

                      <strong>{Number(variant.quantity || 0)} SP</strong>
                    </div>

                    <div>
                      <span>Thứ tự</span>

                      <strong>{Number(variant.sort_order || 0)}</strong>
                    </div>
                  </div>

                  <div className="adm-product-variant-card__footer">
                    <div className="adm-product-variant-card__footer-info">
                      <span>
                        <i className="bi bi-image" />
                        {(variant.images || []).length} ảnh riêng
                      </span>

                      {variant.thumbnail && (
                        <span>
                          <i className="bi bi-check-circle-fill" />
                          Có thumbnail riêng
                        </span>
                      )}
                    </div>

                    <div className="adm-product-variant-card__footer-actions">
                      {!isDefault && (
                        <button
                          type="button"
                          className="adm-product-button adm-product-button--warning-soft"
                          onClick={() => handleSetDefault(variant)}
                          disabled={loading || !isActive}
                        >
                          <i className="bi bi-star" />
                          Đặt mặc định
                        </button>
                      )}

                      <button
                        type="button"
                        className={[
                          "adm-product-button",

                          isActive
                            ? "adm-product-button--secondary"
                            : "adm-product-button--success-soft",
                        ].join(" ")}
                        onClick={() => handleToggleStatus(variant)}
                        disabled={loading}
                      >
                        {loading ? (
                          <span className="adm-product-spinner adm-product-spinner--small-dark" />
                        ) : (
                          <i
                            className={
                              isActive ? "bi bi-eye-slash" : "bi bi-eye"
                            }
                          />
                        )}

                        {isActive ? "Ẩn biến thể" : "Hiển thị"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {formOpen && (
        <VariantFormModal
          product={product}
          variant={selectedVariant}
          mode={formMode}
          onClose={() => {
            setFormOpen(false);
            setSelectedVariant(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {stockOpen && selectedVariant && (
        <VariantStockModal
          product={product}
          variant={selectedVariant}
          onClose={() => {
            setStockOpen(false);
            setSelectedVariant(null);
          }}
          onUpdated={handleStockUpdated}
        />
      )}

      {imageOpen && selectedVariant && (
        <VariantImageManager
          product={product}
          variant={selectedVariant}
          onClose={() => {
            setImageOpen(false);
            setSelectedVariant(null);
          }}
          onUpdated={handleImagesUpdated}
        />
      )}
    </>
  );
}

export default VariantManager;
