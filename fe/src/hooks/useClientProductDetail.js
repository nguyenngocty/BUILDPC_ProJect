import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ProductService from "../services/productService";
// 👇 QUAN TRỌNG: Import hàm lấy bình luận mà ta đã tạo ở service
import { getProductComments } from "../services/commentService";

const EMPTY_DETAIL = {
  product: null,
  gallery: [],
  specifications: [],
  rating: {
    average: 0,
    total: 0,
    distribution: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    },
  },
  reviews: [],
  relatedProducts: [],
};

function useClientProductDetail() {
  const { slug } = useParams();

  const [data, setData] = useState(EMPTY_DETAIL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 👇 Hàm loadProduct đã được mở rộng để lấy cả reviews
  const loadProduct = useCallback(async () => {
    if (!slug) {
      setError("Đường dẫn sản phẩm không hợp lệ.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      // 1. Lấy chi tiết sản phẩm như cũ
      const response = await ProductService.getClientProductBySlug(slug);

      if (!response?.success) {
        throw new Error(response?.message || "Không thể tải sản phẩm.");
      }

      const detail = response.data || {};
      const product = detail.product || null;

      // 2. Lấy danh sách đánh giá (reviews)
      let reviews = Array.isArray(detail.reviews) ? detail.reviews : [];

      // Nếu API sản phẩm chưa trả về reviews, gọi API riêng
      if (product?.id && (!reviews || reviews.length === 0)) {
        try {
          const res = await getProductComments(product.id);
          reviews = res.data || [];
        } catch (err) {
          console.warn("Không lấy được đánh giá sản phẩm:", err);
        }
      }

      // 3. Cập nhật data
      setData({
        product: product,
        gallery: Array.isArray(detail.gallery) ? detail.gallery : [],
        specifications: Array.isArray(detail.specifications)
          ? detail.specifications
          : [],
        rating: {
          average: Number(detail.rating?.average) || 0,
          total: Number(detail.rating?.total) || 0,
          distribution: detail.rating?.distribution || {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
          },
        },
        reviews: reviews, // 👈 Gán reviews vào data
        relatedProducts: Array.isArray(detail.relatedProducts)
          ? detail.relatedProducts
          : [],
      });
    } catch (err) {
      console.error("Load product detail:", err);
      setData(EMPTY_DETAIL);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể kết nối máy chủ.",
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  return {
    slug,
    ...data,
    loading,
    error,
    refresh: loadProduct,
  };
}

export default useClientProductDetail;