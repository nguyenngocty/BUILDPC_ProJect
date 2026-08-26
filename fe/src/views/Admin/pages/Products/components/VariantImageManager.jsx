import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import productService from "../../../../../services/productService";

const UPLOAD_URL = process.env.REACT_APP_UPLOAD_URL || "http://localhost:5000";

const getImageUrl = (value) => {
  if (!value) {
    return "/images/no-image.png";
  }

  const path =
    typeof value === "string" ? value : value.image_url || value.url || "";

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${UPLOAD_URL}${path}`;
};

function VariantImageManager({ product, variant, onClose, onUpdated }) {
  const [images, setImages] = useState([]);

  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);

  const [actionId, setActionId] = useState(null);

  const [selectedFiles, setSelectedFiles] = useState([]);

  const previews = useMemo(() => {
    return selectedFiles.map((file) => ({
      file,

      url: URL.createObjectURL(file),
    }));
  }, [selectedFiles]);

  useEffect(() => {
    return () => {
      previews.forEach((item) => {
        URL.revokeObjectURL(item.url);
      });
    };
  }, [previews]);

  const loadImages = async () => {
    try {
      setLoading(true);

      const res = await productService.getVariantImages(product.id, variant.id);

      if (res?.success) {
        setImages(res.data?.images || []);

        return;
      }

      setImages([]);
    } catch (error) {
      console.error(error);

      setImages([]);

      toast.error("Không tải được ảnh biến thể.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, [product.id, variant.id]);

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (files.length === 0) {
      return;
    }

    const remaining = 10 - images.length - selectedFiles.length;

    if (remaining <= 0) {
      toast.error("Mỗi biến thể chỉ được tối đa 10 ảnh.");

      return;
    }

    const accepted = files
      .filter((file) => file.size <= 5 * 1024 * 1024)
      .slice(0, remaining);

    if (accepted.length !== files.length) {
      toast("Một số ảnh bị bỏ qua vì quá 5MB hoặc vượt giới hạn 10 ảnh.");
    }

    setSelectedFiles((previous) => [...previous, ...accepted]);

    event.target.value = "";
  };

  const removePendingFile = (index) => {
    setSelectedFiles((previous) =>
      previous.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Vui lòng chọn ảnh.");

      return;
    }

    try {
      setUploading(true);

      const res = await productService.uploadVariantImages(
        product.id,
        variant.id,
        selectedFiles,
      );

      if (!res?.success) {
        toast.error(res?.message || "Không thể upload ảnh biến thể.");

        return;
      }

      toast.success(res.message);

      setSelectedFiles([]);

      setImages(res.data?.images || []);

      const productRes = await productService.getProductById(product.id);

      if (productRes?.success) {
        onUpdated?.(productRes.data);
      }
    } catch (error) {
      console.error(error);

      toast.error(
        error.response?.data?.message || "Không thể upload ảnh biến thể.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (image) => {
    if (Number(image.is_primary) === 1) {
      return;
    }

    try {
      setActionId(image.id);

      const res = await productService.setPrimaryVariantImage(
        product.id,
        variant.id,
        image.id,
      );

      if (!res?.success) {
        toast.error(res?.message || "Không thể đặt ảnh chính.");

        return;
      }

      toast.success(res.message);

      setImages(res.data?.images || []);

      onUpdated?.(res.data?.product);
    } catch (error) {
      console.error(error);

      toast.error(error.response?.data?.message || "Không thể đặt ảnh chính.");
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (image) => {
    const accepted = window.confirm("Bạn có chắc muốn xóa ảnh này?");

    if (!accepted) {
      return;
    }

    try {
      setActionId(image.id);

      const res = await productService.deleteVariantImage(
        product.id,
        variant.id,
        image.id,
      );

      if (!res?.success) {
        toast.error(res?.message || "Không thể xóa ảnh biến thể.");

        return;
      }

      toast.success(res.message);

      setImages(res.data?.images || []);

      onUpdated?.(res.data?.product);
    } catch (error) {
      console.error(error);

      toast.error(
        error.response?.data?.message || "Không thể xóa ảnh biến thể.",
      );
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="adm-product-modal" onClick={onClose}>
      <div
        className="adm-product-modal__dialog adm-product-variant-image-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="adm-product-modal__header">
          <div className="adm-product-modal__heading">
            <span className="adm-product-panel__icon">
              <i className="bi bi-images" />
            </span>

            <div>
              <h2>Ảnh biến thể</h2>

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

        <div className="adm-product-variant-image-body">
          <section className="adm-product-variant-image-upload">
            <div>
              <strong>Thêm ảnh mới</strong>

              <span>Tối đa 10 ảnh / biến thể, mỗi ảnh tối đa 5MB.</span>
            </div>

            <label className="adm-product-variant-image-upload__button">
              <i className="bi bi-cloud-arrow-up" />
              Chọn ảnh
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleFileChange}
              />
            </label>
          </section>

          {selectedFiles.length > 0 && (
            <section className="adm-product-variant-pending">
              <div className="adm-product-variant-image-section-title">
                <div>
                  <strong>Ảnh chờ tải lên</strong>

                  <span>{selectedFiles.length} ảnh đã chọn</span>
                </div>

                <button
                  type="button"
                  className="adm-product-button adm-product-button--primary"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <span className="adm-product-spinner adm-product-spinner--small" />
                      Đang tải...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-cloud-arrow-up" />
                      Tải ảnh lên
                    </>
                  )}
                </button>
              </div>

              <div className="adm-product-variant-image-grid">
                {previews.map((item, index) => (
                  <div
                    key={`${item.file.name}-${index}`}
                    className="adm-product-variant-image-card"
                  >
                    <img src={item.url} alt={item.file.name} />

                    <button
                      type="button"
                      className="adm-product-variant-image-card__remove"
                      onClick={() => removePendingFile(index)}
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="adm-product-variant-current-images">
            <div className="adm-product-variant-image-section-title">
              <div>
                <strong>Ảnh hiện tại</strong>

                <span>{images.length}/10 ảnh</span>
              </div>
            </div>

            {loading ? (
              <div className="adm-product-loading">
                <span className="adm-product-spinner" />

                <strong>Đang tải ảnh...</strong>
              </div>
            ) : images.length === 0 ? (
              <div className="adm-product-variant-image-empty">
                <span>
                  <i className="bi bi-images" />
                </span>

                <strong>Chưa có ảnh riêng</strong>

                <p>Biến thể đang sử dụng ảnh chung của sản phẩm.</p>
              </div>
            ) : (
              <div className="adm-product-variant-image-grid">
                {images.map((image) => (
                  <article
                    key={image.id}
                    className={[
                      "adm-product-variant-image-card",

                      Number(image.is_primary) === 1 &&
                        "adm-product-variant-image-card--primary",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <img src={getImageUrl(image)} alt="" />

                    {Number(image.is_primary) === 1 && (
                      <span className="adm-product-variant-image-primary">
                        <i className="bi bi-star-fill" />
                        Ảnh chính
                      </span>
                    )}

                    <div className="adm-product-variant-image-card__actions">
                      {Number(image.is_primary) !== 1 && (
                        <button
                          type="button"
                          title="Đặt ảnh chính"
                          onClick={() => handleSetPrimary(image)}
                          disabled={Number(actionId) === Number(image.id)}
                        >
                          <i className="bi bi-star" />
                        </button>
                      )}

                      <button
                        type="button"
                        title="Xóa ảnh"
                        className="adm-product-variant-image-card__danger"
                        onClick={() => handleDelete(image)}
                        disabled={Number(actionId) === Number(image.id)}
                      >
                        <i className="bi bi-trash3" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="adm-product-modal__footer">
          <button
            type="button"
            className="adm-product-button adm-product-button--secondary"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default VariantImageManager;
