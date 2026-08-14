import { useEffect, useMemo } from "react";
import "./css/ThumbnailUpload.css";

const UPLOAD_URL = process.env.REACT_APP_UPLOAD_URL || "http://localhost:5000";

function ThumbnailUpload({ formData, setFormData, errors, clearError }) {
  const preview = useMemo(() => {
    if (!formData.thumbnail) return null;

    if (formData.thumbnail instanceof File) {
      return URL.createObjectURL(formData.thumbnail);
    }

    if (typeof formData.thumbnail === "string") {
      if (
        formData.thumbnail.startsWith("http://") ||
        formData.thumbnail.startsWith("https://")
      ) {
        return formData.thumbnail;
      }

      return `${UPLOAD_URL}${formData.thumbnail}`;
    }

    return null;
  }, [formData.thumbnail]);

  useEffect(() => {
    return () => {
      if (preview && formData.thumbnail instanceof File) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview, formData.thumbnail]);

  const handleImage = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setFormData((prev) => ({
      ...prev,
      thumbnail: file,
    }));

    clearError?.("thumbnail");

    // Cho phép chọn lại cùng một file
    e.target.value = "";
  };

  return (
    <div className="pc-card">
      <h3>Ảnh đại diện</h3>

      <input type="file" accept="image/*" onChange={handleImage} />

      {errors?.thumbnail && <p className="pc-form-error">{errors.thumbnail}</p>}

      <div className="pc-thumb-preview">
        {preview ? (
          <>
            {console.log("PREVIEW =", preview)}

            <img src={preview} alt="thumbnail" />
          </>
        ) : (
          <div className="pc-thumb-empty">
            <i className="bi bi-image"></i>
            <span>Chưa có ảnh đại diện</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ThumbnailUpload;
