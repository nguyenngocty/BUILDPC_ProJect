import "./css/DescriptionEditor.css";

function DescriptionEditor({ formData, setFormData }) {
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="pc-card">
      <h3>Mô tả sản phẩm</h3>

      <div className="pc-field">
        <label>Mô tả ngắn</label>

        <textarea
          rows={4}
          name="short_description"
          value={formData.short_description}
          onChange={handleChange}
        />
      </div>

      <div className="pc-field">
        <label>Mô tả chi tiết</label>

        <textarea
          rows={10}
          name="description"
          value={formData.description}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}

export default DescriptionEditor;
