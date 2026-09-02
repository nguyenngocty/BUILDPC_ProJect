import { useCallback, useEffect, useState } from "react";

import { useParams } from "react-router-dom";

import ProductService from "../services/productService";

import { getProductComments } from "../services/commentService";

// ============================================================
// EMPTY DETAIL
// ============================================================

const EMPTY_DETAIL = {
  product: null,

  gallery: [],

  specifications: [],

  options: [],

  variants: [],

  defaultVariant: null,

  hasVariants: false,

  variantSummary: {
    total: 0,

    quantity: 0,
  },

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

// ============================================================
// HOOK
// ============================================================

function useClientProductDetail() {
  const { slug } = useParams();

  const [data, setData] = useState(EMPTY_DETAIL);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ==========================================================
  // LOAD PRODUCT
  // ==========================================================

  const loadProduct = useCallback(async () => {
    if (!slug) {
      setError("Đường dẫn sản phẩm không hợp lệ.");

      setLoading(false);

      return;
    }

    try {
      setLoading(true);

      setError("");

      // ==================================================
      // PRODUCT DETAIL
      // ==================================================

      const response = await ProductService.getClientProductBySlug(slug);

      if (!response?.success) {
        throw new Error(response?.message || "Không thể tải sản phẩm.");
      }

      const detail = response?.data || {};

      const product = detail?.product || null;

      if (!product) {
        throw new Error("Không tìm thấy sản phẩm.");
      }

      // ==================================================
      // REVIEWS
      //
      // Luôn ưu tiên API Comment mới.
      // Không sử dụng API comments legacy trong product.
      // ==================================================

      let reviews = [];

      let reviewRating = {
        average: 0,

        total: 0,

        distribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
      };

      try {
        const reviewResponse = await getProductComments(product.id, {
          page: 1,

          limit: 50,

          sort: "newest",
        });

        const reviewPayload = reviewResponse?.data || {};

        reviews = Array.isArray(reviewPayload?.data) ? reviewPayload.data : [];

        reviewRating = {
          average: Number(reviewPayload?.rating?.average || 0),

          total: Number(reviewPayload?.rating?.total || 0),

          distribution: reviewPayload?.rating?.distribution || {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
          },
        };
      } catch (reviewError) {
        console.warn("Không lấy được đánh giá sản phẩm:", reviewError);

        // ================================================
        // FALLBACK
        // ================================================

        reviews = Array.isArray(detail?.reviews) ? detail.reviews : [];

        reviewRating = {
          average: Number(detail?.rating?.average || 0),

          total: Number(detail?.rating?.total || 0),

          distribution: detail?.rating?.distribution || {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
          },
        };
      }

      // ==================================================
      // OPTIONS
      // ==================================================

      const options = Array.isArray(detail?.options) ? detail.options : [];

      // ==================================================
      // VARIANTS
      // ==================================================

      const variants = Array.isArray(detail?.variants) ? detail.variants : [];

      // ==================================================
      // DEFAULT VARIANT
      // ==================================================

      let defaultVariant = detail?.defaultVariant || null;

      if (!defaultVariant) {
        defaultVariant =
          variants.find((variant) => Number(variant?.is_default) === 1) ||
          variants[0] ||
          null;
      }

      // ==================================================
      // HAS VARIANTS
      // ==================================================

      const hasVariants =
        typeof detail?.hasVariants === "boolean"
          ? detail.hasVariants
          : Boolean(
              product?.has_variants ||
              options.length > 0 ||
              variants.length > 1,
            );

      // ==================================================
      // SET DATA
      // ==================================================

      setData({
        product,

        gallery: Array.isArray(detail?.gallery) ? detail.gallery : [],

        specifications: Array.isArray(detail?.specifications)
          ? detail.specifications
          : [],

        options,

        variants,

        defaultVariant,

        hasVariants,

        variantSummary: {
          total: Number(detail?.variantSummary?.total ?? variants.length ?? 0),

          quantity: Number(
            detail?.variantSummary?.quantity ??
              product?.total_available_quantity ??
              product?.quantity ??
              0,
          ),
        },

        rating: reviewRating,

        reviews,

        relatedProducts: Array.isArray(detail?.relatedProducts)
          ? detail.relatedProducts
          : [],
      });
    } catch (loadError) {
      console.error("Load product detail:", loadError);

      setData(EMPTY_DETAIL);

      setError(
        loadError?.response?.data?.message ||
          loadError?.message ||
          "Không thể kết nối máy chủ.",
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

  // ==========================================================
  // EFFECT
  // ==========================================================

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    slug,

    ...data,

    loading,

    error,

    refresh: loadProduct,
  };
}

export default useClientProductDetail;
