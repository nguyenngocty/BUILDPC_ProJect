import { useMemo, useEffect } from "react";
import "./css/GalleryUpload.css";
import toast from "react-hot-toast";
import productService from "../../../../services/productService";

const UPLOAD_URL = process.env.REACT_APP_UPLOAD_URL || "http://localhost:5000";

function GalleryUpload({ formData, setFormData, mode }) {
  const handleGallery = (e) => {
    const files = Array.from(e.target.files);

    if (!files.length) return;

    setFormData((prev) => ({
      ...prev,
      gallery: [...(prev.gallery || []), ...files],
    }));

    // Cho phép chọn lại đúng file vừa chọn
    e.target.value = "";
  };

  const removeImage = async (index) => {
    const image = formData.gallery[index];

    try {
      // Ảnh đã tồn tại trong DB
      if (mode === "edit" && image.id) {
        await productService.deleteGalleryImage(formData.id, image.id);

        toast.success("Xóa ảnh thành công.");
      }

      // Cập nhật giao diện
      setFormData((prev) => ({
        ...prev,
        gallery: prev.gallery.filter((_, i) => i !== index),
      }));
    } catch (err) {
      console.error(err);

      toast.error(err.response?.data?.message || "Không thể xóa ảnh.");
    }
  };

  /**
   * Tạo danh sách preview chỉ một lần
   */
  const previews = useMemo(() => {
    return (formData.gallery || []).map((image) => {
      // File mới chọn
      if (image instanceof File) {
        return {
          key: image.name + image.size,
          url: URL.createObjectURL(image),
          isObjectUrl: true,
        };
      }

      // image_url
      if (image?.image_url) {
        return {
          key: image.id || image.image_id,
          url: image.image_url.startsWith("http")
            ? image.image_url
            : `${UPLOAD_URL}${image.image_url}`,
          isObjectUrl: false,
        };
      }

      // path
      if (image?.path) {
        return {
          key: image.id || image.image_id,
          url: image.path.startsWith("http")
            ? image.path
            : `${UPLOAD_URL}${image.path}`,
          isObjectUrl: false,
        };
      }

      // string
      if (typeof image === "string") {
        return {
          key: image,
          url: image.startsWith("http") ? image : `${UPLOAD_URL}${image}`,
          isObjectUrl: false,
        };
      }

      return {
        key: Math.random(),
        url: "",
        isObjectUrl: false,
      };
    });
  }, [formData.gallery]);

  /**
   * Cleanup ObjectURL
   */
  useEffect(() => {
    return () => {
      previews.forEach((item) => {
        if (item.isObjectUrl) {
          URL.revokeObjectURL(item.url);
        }
      });
    };
  }, [previews]);

  return (
    <div className="pc-card">
      <h3>Album ảnh</h3>

      <input type="file" multiple accept="image/*" onChange={handleGallery} />

      <div className="pc-gallery">
        {previews.length > 0 ? (
          previews.map((item, index) => (
            <div key={item.key || index} className="pc-gallery-item">
              <img src={item.url} alt={`gallery-${index}`} />

              <button type="button" onClick={() => removeImage(index)}>
                ×
              </button>
            </div>
          ))
        ) : (
          <div className="pc-gallery-empty">
            <i className="bi bi-images"></i>
            <span>Chưa có ảnh trong album</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default GalleryUpload;
