import { useEffect, useMemo, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import "./ProductDetail.css";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import ProductGallery from "../../components/ProductDetail/ProductGallery";
import ProductInfo from "../../components/ProductDetail/ProductInfo";
import ProductTabs from "../../components/ProductDetail/ProductTabs";
import ProductRelated from "../../components/ProductDetail/ProductRelated";
import ProductStickyBox from "../../components/ProductDetail/ProductStickyBox";
import Skeleton from "../../components/ProductDetail/Skeleton";

import useClientProductDetail from "../../../hooks/useClientProductDetail";

import { useCart } from "../../../context/CartContext";

import { useAuth } from "../../../context/AuthContext";

// ============================================================
// HELPERS
// ============================================================

const normalizeCode = (value = "") => {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

// ============================================================
// GET VARIANT VALUE MAP
//
// variant.values:
//
// [
//   {
//     option_code: "capacity",
//     value: "64GB"
//   },
//   {
//     option_code: "bus",
//     value: "5200MHz"
//   }
// ]
//
// =>
//
// {
//   capacity: "64GB",
//   bus: "5200MHz"
// }
// ============================================================

const getVariantValueMap = (variant) => {
  const map = {};

  const values = Array.isArray(variant?.values) ? variant.values : [];

  values.forEach((item) => {
    const code = normalizeCode(item?.option_code);

    if (!code) {
      return;
    }

    map[code] = String(item?.value ?? "").trim();
  });

  return map;
};

// ============================================================
// VARIANT MATCH
// ============================================================

const isVariantMatch = (variant, selectedValues, optionCodes) => {
  if (!variant) {
    return false;
  }

  const map = getVariantValueMap(variant);

  return optionCodes.every((code) => {
    const selected = String(selectedValues?.[code] ?? "").trim();

    if (!selected) {
      return false;
    }

    return (
      String(map?.[code] ?? "")
        .trim()
        .toLowerCase() === selected.toLowerCase()
    );
  });
};

// ============================================================
// PRODUCT DETAIL
// ============================================================

function ProductDetail() {
  const navigate = useNavigate();

  const {
    product,

    gallery,

    specifications,

    options,

    variants,

    defaultVariant,

    hasVariants,

    rating,

    reviews,

    relatedProducts,

    loading,

    error,

    refresh,
  } = useClientProductDetail();

  const { addToCart } = useCart();

  const { isAuthenticated } = useAuth();

  // ==========================================================
  // ACTION
  // ==========================================================

  const [actionLoading, setActionLoading] = useState(false);

  const [actionMessage, setActionMessage] = useState("");

  // ==========================================================
  // VARIANT SELECTION
  // ==========================================================

  const [selectedValues, setSelectedValues] = useState({});

  const [selectedVariantId, setSelectedVariantId] = useState(null);

  // ==========================================================
  // OPTION CODES
  // ==========================================================

  const optionCodes = useMemo(() => {
    return (Array.isArray(options) ? options : [])
      .map((option) => normalizeCode(option?.code))
      .filter(Boolean);
  }, [options]);

  // ==========================================================
  // ACTIVE VARIANTS
  // ==========================================================

  const activeVariants = useMemo(() => {
    return (Array.isArray(variants) ? variants : []).filter(
      (variant) => Number(variant?.status) === 1,
    );
  }, [variants]);

  // ==========================================================
  // INIT DEFAULT VARIANT
  // ==========================================================

  useEffect(() => {
    if (!product) {
      setSelectedValues({});

      setSelectedVariantId(null);

      return;
    }

    const initialVariant =
      defaultVariant ||
      activeVariants.find((item) => Number(item?.is_default) === 1) ||
      activeVariants[0] ||
      null;

    if (!initialVariant) {
      setSelectedValues({});

      setSelectedVariantId(null);

      return;
    }

    const initialValues = getVariantValueMap(initialVariant);

    setSelectedValues(initialValues);

    setSelectedVariantId(Number(initialVariant.id));
  }, [product?.id, defaultVariant?.id, activeVariants]);

  // ==========================================================
  // SELECTED VARIANT
  // ==========================================================

  const selectedVariant = useMemo(() => {
    if (selectedVariantId) {
      const byId = activeVariants.find(
        (variant) => Number(variant.id) === Number(selectedVariantId),
      );

      if (byId) {
        return byId;
      }
    }

    if (optionCodes.length > 0) {
      const matched = activeVariants.find((variant) =>
        isVariantMatch(variant, selectedValues, optionCodes),
      );

      if (matched) {
        return matched;
      }
    }

    /*
     * Product đơn:
     * vẫn sử dụng default variant kỹ thuật.
     */
    if (!hasVariants) {
      return defaultVariant || activeVariants[0] || null;
    }

    return null;
  }, [
    activeVariants,
    selectedVariantId,
    selectedValues,
    optionCodes,
    defaultVariant,
    hasVariants,
  ]);

  // ==========================================================
  // EFFECTIVE PRODUCT
  //
  // Toàn bộ giá / SKU / stock trên UI
  // dùng selectedVariant.
  // ==========================================================

  const displayProduct = useMemo(() => {
    if (!product) {
      return null;
    }

    if (!selectedVariant) {
      return product;
    }

    return {
      ...product,

      sku: selectedVariant.sku || product.sku,

      price: Number(selectedVariant.price ?? product.price ?? 0),

      sale_price:
        selectedVariant.sale_price !== null &&
        selectedVariant.sale_price !== undefined
          ? Number(selectedVariant.sale_price)
          : null,

      final_price: Number(
        selectedVariant.final_price ??
          selectedVariant.sale_price ??
          selectedVariant.price ??
          product.final_price ??
          0,
      ),

      discount_percent: Number(selectedVariant.discount_percent ?? 0),

      quantity: Number(selectedVariant.quantity ?? 0),

      in_stock: Boolean(
        selectedVariant.in_stock ?? Number(selectedVariant.quantity ?? 0) > 0,
      ),

      stock_status: selectedVariant.stock_status || product.stock_status,

      variant_id: Number(selectedVariant.id),

      variant_name: selectedVariant.variant_name || null,
    };
  }, [product, selectedVariant]);

  // ==========================================================
  // DISPLAY GALLERY
  //
  // Nếu Variant có hình:
  // ưu tiên ảnh Variant.
  //
  // Vẫn giữ gallery chung phía sau.
  // ==========================================================

  const displayGallery = useMemo(() => {
    const output = [];

    const seen = new Set();

    const addImage = (image) => {
      const imageUrl = typeof image === "string" ? image : image?.image_url;

      if (!imageUrl || seen.has(imageUrl)) {
        return;
      }

      seen.add(imageUrl);

      output.push(
        typeof image === "string"
          ? {
              id: null,

              image_url: imageUrl,
            }
          : image,
      );
    };

    /*
     * Variant thumbnail.
     */
    if (selectedVariant?.thumbnail) {
      addImage({
        id: null,

        image_url: selectedVariant.thumbnail,

        sort_order: -2,

        is_variant_thumbnail: true,
      });
    }

    /*
     * Variant images.
     */
    if (Array.isArray(selectedVariant?.images)) {
      [...selectedVariant.images]
        .sort((a, b) => {
          if (Number(b?.is_primary) !== Number(a?.is_primary)) {
            return Number(b?.is_primary) - Number(a?.is_primary);
          }

          return Number(a?.sort_order || 0) - Number(b?.sort_order || 0);
        })
        .forEach(addImage);
    }

    /*
     * Gallery Product.
     */
    (Array.isArray(gallery) ? gallery : []).forEach(addImage);

    return output;
  }, [gallery, selectedVariant]);

  // ==========================================================
  // CHECK OPTION VALUE AVAILABLE
  //
  // Ví dụ:
  //
  // selected capacity = 32GB
  //
  // bus 5200MHz sẽ disabled
  // nếu không tồn tại Variant:
  //
  // 32GB + 5200MHz
  // ==========================================================

  const isOptionValueAvailable = (optionCode, candidateValue) => {
    const normalizedOptionCode = normalizeCode(optionCode);

    if (!normalizedOptionCode) {
      return false;
    }

    return activeVariants.some((variant) => {
      const valueMap = getVariantValueMap(variant);

      /*
       * Candidate của option
       * đang kiểm tra.
       */
      if (
        String(valueMap[normalizedOptionCode] ?? "")
          .trim()
          .toLowerCase() !==
        String(candidateValue ?? "")
          .trim()
          .toLowerCase()
      ) {
        return false;
      }

      /*
       * Các option khác đã chọn
       * phải tương thích.
       */
      for (const code of optionCodes) {
        if (code === normalizedOptionCode) {
          continue;
        }

        const selected = String(selectedValues[code] ?? "").trim();

        if (!selected) {
          continue;
        }

        if (
          String(valueMap?.[code] ?? "")
            .trim()
            .toLowerCase() !== selected.toLowerCase()
        ) {
          return false;
        }
      }

      return true;
    });
  };

  // ==========================================================
  // SELECT OPTION
  // ==========================================================

  const handleSelectOption = (optionCode, value) => {
    const normalizedOptionCode = normalizeCode(optionCode);

    if (!normalizedOptionCode) {
      return;
    }

    const nextValues = {
      ...selectedValues,

      [normalizedOptionCode]: value,
    };

    /*
     * Nếu lựa chọn mới làm option khác
     * không còn hợp lệ,
     * tìm Variant đầu tiên phù hợp với lựa chọn mới.
     */
    const compatibleVariant = activeVariants.find((variant) => {
      const map = getVariantValueMap(variant);

      return (
        String(map[normalizedOptionCode] ?? "")
          .trim()
          .toLowerCase() ===
        String(value ?? "")
          .trim()
          .toLowerCase()
      );
    });

    /*
     * Ưu tiên exact match trước.
     */
    const exactMatch = activeVariants.find((variant) =>
      isVariantMatch(variant, nextValues, optionCodes),
    );

    if (exactMatch) {
      setSelectedValues(getVariantValueMap(exactMatch));

      setSelectedVariantId(Number(exactMatch.id));

      setActionMessage("");

      return;
    }

    /*
     * Không có exact combination.
     *
     * Tự chuyển các option còn lại
     * sang Variant hợp lệ gần nhất.
     */
    if (compatibleVariant) {
      setSelectedValues(getVariantValueMap(compatibleVariant));

      setSelectedVariantId(Number(compatibleVariant.id));

      setActionMessage("");

      return;
    }

    setSelectedValues(nextValues);

    setSelectedVariantId(null);
  };

  // ==========================================================
  // ADD TO CART
  // ==========================================================

  const handleAddToCart = async (
    quantity = 1,

    { goCheckout = false } = {},
  ) => {
    if (!product) {
      return false;
    }

    if (!isAuthenticated) {
      setActionMessage(
        "Vui lòng đăng nhập trước khi thêm sản phẩm vào giỏ hàng.",
      );

      return false;
    }

    /*
     * Product thực sự có nhiều biến thể
     * nhưng chưa tìm được Variant hợp lệ.
     */
    if (hasVariants && !selectedVariant) {
      setActionMessage("Vui lòng chọn đầy đủ phiên bản sản phẩm.");

      return false;
    }

    const stock = Number(displayProduct?.quantity ?? 0);

    if (!displayProduct?.in_stock || stock <= 0) {
      setActionMessage("Phiên bản sản phẩm này hiện đã hết hàng.");

      return false;
    }

    const safeQuantity = Math.max(
      Math.min(
        Number(quantity) || 1,

        stock,
      ),
      1,
    );

    try {
      setActionLoading(true);

      setActionMessage("");

      await addToCart({
        product_id: product.id,

        /*
         * Product đơn vẫn gửi
         * default variant kỹ thuật nếu có.
         */
        variant_id: selectedVariant?.id || defaultVariant?.id || null,

        quantity: safeQuantity,
      });

      if (goCheckout) {
        navigate("/checkout");

        return true;
      }

      setActionMessage(
        selectedVariant
          ? `Đã thêm phiên bản "${selectedVariant.variant_name}" vào giỏ hàng.`
          : "Đã thêm sản phẩm vào giỏ hàng.",
      );

      return true;
    } catch (error) {
      setActionMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể thêm sản phẩm vào giỏ hàng.",
      );

      return false;
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="pd-page">
        <Header />

        <Skeleton />

        <Footer />
      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error || !product) {
    return (
      <div className="pd-page">
        <Header />

        <main className="pd-error">
          <i className="bi bi-exclamation-circle"></i>

          <h2>Không thể tải sản phẩm</h2>

          <p>{error || "Sản phẩm không tồn tại hoặc đã ngừng hiển thị."}</p>

          <div className="pd-error-actions">
            <button type="button" onClick={refresh}>
              Thử lại
            </button>

            <Link to="/products">Quay lại sản phẩm</Link>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="pd-page">
      <Header />

      <div className="pd-breadcrumb">
        <Link to="/">Trang chủ</Link>

        <i className="bi bi-chevron-right"></i>

        <Link to="/products">Sản phẩm</Link>

        <i className="bi bi-chevron-right"></i>

        {product.category_slug ? (
          <Link
            to={`/products?category=${encodeURIComponent(
              product.category_slug,
            )}`}
          >
            {product.category_name}
          </Link>
        ) : (
          <span>{product.category_name}</span>
        )}

        <i className="bi bi-chevron-right"></i>

        <span>{product.name}</span>
      </div>

      <section className="pd-layout">
        <div className="pd-left">
          <div className="pd-hero">
            <div className="pd-wrapper">
              <ProductGallery
                product={displayProduct}
                gallery={displayGallery}
              />

              <ProductInfo
                product={displayProduct}
                baseProduct={product}
                options={options}
                selectedValues={selectedValues}
                selectedVariant={selectedVariant}
                hasVariants={hasVariants}
                rating={rating}
                actionLoading={actionLoading}
                actionMessage={actionMessage}
                onSelectOption={handleSelectOption}
                isOptionValueAvailable={isOptionValueAvailable}
                onAddToCart={handleAddToCart}
              />
            </div>
          </div>

          <div className="pd-section">
            <div className="pd-wrapper-tabs">
              <ProductTabs
                product={product}
                specifications={specifications}
                rating={rating}
                reviews={reviews}
                isAuthenticated={isAuthenticated}
                onReviewSubmitted={refresh}
              />
            </div>
          </div>

          {relatedProducts.length > 0 && (
            <div className="pd-section">
              <div className="pd-wrapper-tabs">
                <ProductRelated
                  products={relatedProducts}
                  onAddToCart={async (item) => {
                    if (!isAuthenticated) {
                      setActionMessage(
                        "Vui lòng đăng nhập trước khi thêm sản phẩm vào giỏ hàng.",
                      );

                      return;
                    }

                    /*
                     * Product Related hiện chưa trả
                     * toàn bộ variants.
                     *
                     * Nếu Backend phát hiện đây là
                     * product nhiều variant,
                     * nó sẽ yêu cầu khách vào Detail
                     * để chọn phiên bản.
                     */
                    try {
                      await addToCart(item.id, 1);

                      setActionMessage(`Đã thêm "${item.name}" vào giỏ hàng.`);
                    } catch (error) {
                      const message =
                        error?.response?.data?.message ||
                        error?.message ||
                        "Không thể thêm vào giỏ.";

                      setActionMessage(message);

                      /*
                       * Product có variant:
                       * đưa khách vào Detail.
                       */
                      if (String(message).toLowerCase().includes("biến thể")) {
                        navigate(`/products/${item.slug}`);
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="pd-right">
          <ProductStickyBox
            product={displayProduct}
            selectedVariant={selectedVariant}
            hasVariants={hasVariants}
            actionLoading={actionLoading}
            onAddToCart={() => handleAddToCart(1)}
            onBuyNow={() =>
              handleAddToCart(1, {
                goCheckout: true,
              })
            }
          />
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default ProductDetail;
