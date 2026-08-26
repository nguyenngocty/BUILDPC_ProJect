import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import productService from "../../../../../services/productService";

import { validateVariantForm } from "../../../../../utils/validateForm";

const createInitialValues = (variant, options) => {
  const result = {};

  if (Array.isArray(variant?.values)) {
    for (const item of variant.values) {
      if (!item.option_code) {
        continue;
      }

      result[item.option_code] = item.value;
    }
  }

  for (const option of options || []) {
    if (result[option.code] === undefined) {
      result[option.code] = "";
    }
  }

  return result;
};

function VariantFormModal({
  product,
  variant,
  mode = "create",
  onClose,
  onSaved,
}) {
  const options = useMemo(() => {
    return Array.isArray(product?.options) ? product.options : [];
  }, [product]);

  const [form, setForm] = useState(() => ({
    sku: variant?.sku || "",

    variant_name: variant?.variant_name || "",

    price: variant?.price !== undefined ? variant.price : "",

    sale_price:
      variant?.sale_price !== null && variant?.sale_price !== undefined
        ? variant.sale_price
        : "",

    quantity: variant?.quantity !== undefined ? variant.quantity : 0,

    status: variant?.status !== undefined ? Number(variant.status) : 1,

    is_default:
      variant?.is_default !== undefined ? Number(variant.is_default) : 0,

    sort_order:
      variant?.sort_order !== undefined
        ? Number(variant.sort_order)
        : (product?.variants?.length || 0) + 1,

    values: createInitialValues(variant, options),
  }));

  const [errors, setErrors] = useState({});

  const [saving, setSaving] = useState(false);

  const isCreate = mode === "create";

  const handleChange = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [field]: "",
    }));
  };

  const handleValueChange = (optionCode, value) => {
    setForm((previous) => ({
      ...previous,

      values: {
        ...(previous.values || {}),

        [optionCode]: value,
      },
    }));

    setErrors((previous) => ({
      ...previous,

      [`value_${optionCode}`]: "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validateVariantForm(form, options, {
      creating: isCreate,
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);

      toast.error("Vui lòng kiểm tra lại thông tin biến thể.");

      return;
    }

    try {
      setSaving(true);

      const payload = {
        sku: String(form.sku || "").trim(),

        variant_name: String(form.variant_name || "").trim() || "Mặc định",

        price: Number(form.price),

        sale_price: form.sale_price === "" ? null : Number(form.sale_price),

        status: Number(form.status),

        sort_order: Number(form.sort_order || 0),

        values: form.values || {},
      };

      let res;

      if (isCreate) {
        payload.quantity = Number(form.quantity || 0);

        payload.is_default = Number(form.is_default || 0);

        res = await productService.createVariant(product.id, payload);
      } else {
        res = await productService.updateVariant(
          product.id,
          variant.id,
          payload,
        );
      }

      if (!res?.success) {
        toast.error(res?.message || "Không thể lưu biến thể.");

        return;
      }

      toast.success(
        res.message ||
          (isCreate
            ? "Thêm biến thể thành công."
            : "Cập nhật biến thể thành công."),
      );

      onSaved?.(res.data?.product);
    } catch (error) {
      console.error(error);

      const response = error.response?.data;

      if (response?.errors) {
        setErrors(response.errors);
      }

      toast.error(
        response?.error || response?.message || "Không thể lưu biến thể.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-product-modal" onClick={onClose}>
      <div
        className="adm-product-modal__dialog adm-product-variant-form-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="adm-product-modal__header">
          <div className="adm-product-modal__heading">
            <span className="adm-product-panel__icon">
              <i
                className={isCreate ? "bi bi-plus-lg" : "bi bi-pencil-square"}
              />
            </span>

            <div>
              <h2>{isCreate ? "Thêm biến thể" : "Cập nhật biến thể"}</h2>

              <p>{product.name}</p>
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

        <form className="adm-product-variant-form" onSubmit={handleSubmit}>
          <section className="adm-product-form-card">
            <div className="adm-product-form-card__header">
              <span>
                <i className="bi bi-upc-scan" />
              </span>

              <div>
                <h3>Thông tin biến thể</h3>

                <p>SKU và tên hiển thị riêng cho phiên bản sản phẩm.</p>
              </div>
            </div>

            <div className="adm-product-form-grid adm-product-form-grid--2">
              <div className="adm-product-field">
                <label>
                  SKU biến thể
                  <b>*</b>
                </label>

                <input
                  type="text"
                  className={[
                    "adm-product-input",

                    errors.sku && "adm-product-input--error",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  value={form.sku}
                  onChange={(event) => handleChange("sku", event.target.value)}
                />

                {errors.sku && <small>{errors.sku}</small>}
              </div>

              <div className="adm-product-field">
                <label>
                  Tên biến thể
                  <b>*</b>
                </label>

                <input
                  type="text"
                  className={[
                    "adm-product-input",

                    errors.variant_name && "adm-product-input--error",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  value={form.variant_name}
                  onChange={(event) =>
                    handleChange("variant_name", event.target.value)
                  }
                  placeholder="Ví dụ: 64GB / 5200MHz"
                />

                {errors.variant_name && <small>{errors.variant_name}</small>}
              </div>
            </div>
          </section>

          {options.length > 0 && (
            <section className="adm-product-form-card">
              <div className="adm-product-form-card__header">
                <span className="adm-product-form-card__icon--purple">
                  <i className="bi bi-sliders" />
                </span>

                <div>
                  <h3>Thuộc tính</h3>

                  <p>Chọn đúng tổ hợp thuộc tính cho biến thể.</p>
                </div>
              </div>

              <div className="adm-product-variant-option-grid">
                {options.map((option) => (
                  <div key={option.id} className="adm-product-field">
                    <label>
                      {option.name}
                      <b>*</b>
                    </label>

                    <div className="adm-product-variant-option-values">
                      {(option.values || []).map((value) => {
                        const current = form.values?.[option.code];

                        const selected =
                          String(current || "")
                            .trim()
                            .toLowerCase() ===
                          String(value.value || "")
                            .trim()
                            .toLowerCase();

                        return (
                          <button
                            type="button"
                            key={value.id}
                            className={[
                              "adm-product-variant-option",

                              selected &&
                                "adm-product-variant-option--selected",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() =>
                              handleValueChange(option.code, value.value)
                            }
                          >
                            {value.label || value.value}
                          </button>
                        );
                      })}
                    </div>

                    {errors[`value_${option.code}`] && (
                      <small>{errors[`value_${option.code}`]}</small>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="adm-product-form-card">
            <div className="adm-product-form-card__header">
              <span className="adm-product-form-card__icon--green">
                <i className="bi bi-cash-coin" />
              </span>

              <div>
                <h3>Giá bán</h3>

                <p>Giá niêm yết và giá khuyến mãi của riêng biến thể.</p>
              </div>
            </div>

            <div className="adm-product-form-grid adm-product-form-grid--2">
              <div className="adm-product-field">
                <label>
                  Giá bán
                  <b>*</b>
                </label>

                <input
                  type="number"
                  min="0"
                  className={[
                    "adm-product-input",

                    errors.price && "adm-product-input--error",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  value={form.price}
                  onChange={(event) =>
                    handleChange("price", event.target.value)
                  }
                />

                {errors.price && <small>{errors.price}</small>}
              </div>

              <div className="adm-product-field">
                <label>Giá khuyến mãi</label>

                <input
                  type="number"
                  min="0"
                  className={[
                    "adm-product-input",

                    errors.sale_price && "adm-product-input--error",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  value={form.sale_price}
                  onChange={(event) =>
                    handleChange("sale_price", event.target.value)
                  }
                />

                {errors.sale_price && <small>{errors.sale_price}</small>}
              </div>
            </div>
          </section>

          <section className="adm-product-form-card">
            <div className="adm-product-form-card__header">
              <span className="adm-product-form-card__icon--orange">
                <i className="bi bi-boxes" />
              </span>

              <div>
                <h3>Trạng thái và kho</h3>

                <p>
                  {isCreate
                    ? "Thiết lập tồn kho ban đầu và trạng thái."
                    : "Tồn kho được quản lý riêng qua chức năng Điều chỉnh kho."}
                </p>
              </div>
            </div>

            <div className="adm-product-form-grid adm-product-form-grid--3">
              {isCreate && (
                <div className="adm-product-field">
                  <label>Tồn kho ban đầu</label>

                  <input
                    type="number"
                    min="0"
                    className={[
                      "adm-product-input",

                      errors.quantity && "adm-product-input--error",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    value={form.quantity}
                    onChange={(event) =>
                      handleChange("quantity", event.target.value)
                    }
                  />

                  {errors.quantity && <small>{errors.quantity}</small>}
                </div>
              )}

              <div className="adm-product-field">
                <label>Trạng thái</label>

                <select
                  className="adm-product-input"
                  value={form.status}
                  onChange={(event) =>
                    handleChange("status", Number(event.target.value))
                  }
                >
                  <option value={1}>Đang hiển thị</option>

                  <option value={0}>Đang ẩn</option>
                </select>
              </div>

              <div className="adm-product-field">
                <label>Thứ tự hiển thị</label>

                <input
                  type="number"
                  min="0"
                  className="adm-product-input"
                  value={form.sort_order}
                  onChange={(event) =>
                    handleChange("sort_order", event.target.value)
                  }
                />
              </div>
            </div>

            {isCreate && (
              <label className="adm-product-variant-default-toggle">
                <input
                  type="checkbox"
                  checked={Number(form.is_default) === 1}
                  onChange={(event) =>
                    handleChange("is_default", event.target.checked ? 1 : 0)
                  }
                />

                <span>
                  <i className="bi bi-star" />
                  Đặt làm biến thể mặc định
                </span>
              </label>
            )}

            {!isCreate && (
              <div className="adm-product-variant-stock-hint">
                <i className="bi bi-info-circle-fill" />

                <span>
                  Tồn kho hiện tại:{" "}
                  <strong>{Number(variant?.quantity || 0)} SP</strong>. Muốn
                  thay đổi số lượng, hãy dùng chức năng Điều chỉnh kho.
                </span>
              </div>
            )}
          </section>

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
              type="submit"
              className="adm-product-button adm-product-button--primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="adm-product-spinner adm-product-spinner--small" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg" />

                  {isCreate ? "Thêm biến thể" : "Lưu thay đổi"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VariantFormModal;
