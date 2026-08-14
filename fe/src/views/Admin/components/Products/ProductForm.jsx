import "./css/ProductForm.css";
import GeneralInformation from "./GeneralInformation";
import PriceInformation from "./PriceInformation";
import InventoryInformation from "./InventoryInformation";
import DescriptionEditor from "./DescriptionEditor";
import ThumbnailUpload from "./ThumbnailUpload";
import GalleryUpload from "./GalleryUpload";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import categoryService from "../../../../services/categoryService";
import { defaultProduct } from "../../../../constants/productDefault";
import productService from "../../../../services/productService";
import { createProductFormData } from "../../../../utils/productFormData";
function ProductForm({ mode = "create", product = null, onSuccess, onClose }) {
  const [formData, setFormData] = useState(defaultProduct);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  useEffect(() => {
    loadCategories();
  }, []);
  useEffect(() => {
    if (mode === "edit" && product) {
      console.log("EDIT PRODUCT", product);
      setFormData({
        ...defaultProduct,
        ...product,
      });

      console.log("PRODUCT THUMB =", product.thumbnail);
      console.log("PRODUCT GALLERY =", product.gallery);
    }

    if (mode === "create") {
      setFormData({ ...defaultProduct });
    }
    console.log("PRODUCT =", product);
  }, [mode, product]);

  useEffect(() => {
    console.log("FORMDATA =", formData);
    console.log("FORMDATA THUMB =", formData.thumbnail);
    console.log("FORMDATA GALLERY =", formData.gallery);
  }, [formData]);

  const loadCategories = async () => {
    try {
      const res = await categoryService.getAll();

      setCategories(res.data.data);
    } catch (err) {
      toast.error("Không tải được danh mục.");
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!(formData.name || "").trim()) {
      newErrors.name = "Tên sản phẩm không được để trống.";
    }

    if (!(formData.sku || "").trim()) {
      newErrors.sku = "SKU không được để trống.";
    }

    if (!formData.category_id) {
      newErrors.category_id = "Vui lòng chọn danh mục.";
    }

    if (!formData.price || Number(formData.price) <= 0) {
      newErrors.price = "Giá bán phải lớn hơn 0.";
    }

    if (
      formData.sale_price &&
      Number(formData.sale_price) >= Number(formData.price)
    ) {
      newErrors.sale_price = "Giá khuyến mãi phải nhỏ hơn giá bán.";
    }

    if (Number(formData.quantity) < 0) {
      newErrors.quantity = "Số lượng không hợp lệ.";
    }

    if (mode === "create" && !formData.thumbnail) {
      newErrors.thumbnail = "Vui lòng chọn ảnh đại diện.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };
  const clearError = (field) => {
    setErrors((prev) => ({
      ...prev,

      [field]: null,
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);

      const submitData = createProductFormData(formData);

      if (mode === "create") {
        await productService.createProduct(submitData);
      } else {
        await productService.updateProduct(product.id, submitData);
      }

      toast.success(
        mode === "create"
          ? "Thêm sản phẩm thành công."
          : "Cập nhật sản phẩm thành công.",
      );

      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error(err);

      if (err.response?.status === 400 && err.response?.data?.field === "sku") {
        setErrors((prev) => ({
          ...prev,
          sku: err.response.data.message,
        }));

        return;
      }

      toast.error(err.response?.data?.message || "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="pc-admin-product-form" onSubmit={handleSubmit}>
      <GeneralInformation
        formData={formData}
        setFormData={setFormData}
        categories={categories}
        errors={errors}
        clearError={clearError}
      />

      <PriceInformation
        formData={formData}
        setFormData={setFormData}
        errors={errors}
        clearError={clearError}
      />

      <InventoryInformation
        formData={formData}
        setFormData={setFormData}
        errors={errors}
        clearError={clearError}
      />

      <DescriptionEditor formData={formData} setFormData={setFormData} />

      <ThumbnailUpload
        formData={formData}
        setFormData={setFormData}
        errors={errors}
        clearError={clearError}
      />
      <GalleryUpload
        formData={formData}
        setFormData={setFormData}
        mode={mode}
      />

      <div className="pc-admin-form-footer">
        <button type="button" className="pc-btn-cancel" onClick={onClose}>
          Hủy
        </button>

        <button type="submit" className="pc-btn-save" disabled={loading}>
          {loading ? "Đang lưu..." : "Lưu sản phẩm"}
        </button>
      </div>
    </form>
  );
}

export default ProductForm;
