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
      (variant) => Number(variant?.status) === 1 && !variant?.deleted_at,
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

    setSelectedValues(getVariantValueMap(initialVariant));

    setSelectedVariantId(Number(initialVariant.id));

    setActionMessage("");
  }, [product?.id, defaultVariant?.id, activeVariants]);

  // ==========================================================
  // SELECTED VARIANT
  // ==========================================================

  const selectedVariant = useMemo(() => {
    /*
     * Ưu tiên variant được chọn trực tiếp.
     */
    if (selectedVariantId) {
      const byId = activeVariants.find(
        (variant) => Number(variant.id) === Number(selectedVariantId),
      );

      if (byId) {
        return byId;
      }
    }

    /*
     * Product sử dụng options.
     */
    if (optionCodes.length > 0) {
      const matched = activeVariants.find((variant) =>
        isVariantMatch(variant, selectedValues, optionCodes),
      );

      if (matched) {
        return matched;
      }
    }

    /*
     * Product đơn.
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
  // ==========================================================

  const displayProduct = useMemo(() => {
    if (!product) {
      return null;
    }

    if (!selectedVariant) {
      return product;
    }

    const variantPrice = Number(selectedVariant.price ?? product.price ?? 0);

    const variantSalePrice =
      selectedVariant.sale_price !== null &&
      selectedVariant.sale_price !== undefined
        ? Number(selectedVariant.sale_price)
        : null;

    const validSale =
      variantSalePrice !== null &&
      variantSalePrice > 0 &&
      variantSalePrice < variantPrice;

    const finalPrice = validSale ? variantSalePrice : variantPrice;

    const quantity = Math.max(Number(selectedVariant.quantity ?? 0), 0);

    return {
      ...product,

      sku: selectedVariant.sku || product.sku,

      price: variantPrice,

      sale_price: variantSalePrice,

      final_price: Number(selectedVariant.final_price ?? finalPrice),

      is_sale:
        selectedVariant.is_sale !== undefined
          ? Boolean(selectedVariant.is_sale)
          : validSale,

      discount_percent:
        selectedVariant.discount_percent !== undefined
          ? Number(selectedVariant.discount_percent || 0)
          : validSale && variantPrice > 0
            ? Math.round(
                ((variantPrice - variantSalePrice) / variantPrice) * 100,
              )
            : 0,

      quantity,

      in_stock:
        selectedVariant.in_stock !== undefined
          ? Boolean(selectedVariant.in_stock)
          : quantity > 0,

      stock_status:
        selectedVariant.stock_status ||
        (quantity <= 0
          ? "out_of_stock"
          : quantity <= 5
            ? "low_stock"
            : "in_stock"),

      thumbnail: selectedVariant.thumbnail || product.thumbnail,

      variant_id: Number(selectedVariant.id),

      variant_name: selectedVariant.variant_name || null,
    };
  }, [product, selectedVariant]);

  // ==========================================================
  // DISPLAY GALLERY
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

    // ========================================================
    // VARIANT THUMBNAIL
    // ========================================================

    if (selectedVariant?.thumbnail) {
      addImage({
        id: null,

        image_url: selectedVariant.thumbnail,

        sort_order: -2,

        is_variant_thumbnail: true,
      });
    }

    // ========================================================
    // VARIANT IMAGES
    // ========================================================

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

    // ========================================================
    // PRODUCT GALLERY
    // ========================================================

    (Array.isArray(gallery) ? gallery : []).forEach(addImage);

    /*
     * Fallback thumbnail Product.
     */
    if (output.length === 0 && product?.thumbnail) {
      addImage({
        id: null,

        image_url: product.thumbnail,

        sort_order: 0,

        is_thumbnail: true,
      });
    }

    return output;
  }, [gallery, selectedVariant, product?.thumbnail]);

  // ==========================================================
  // CHECK OPTION VALUE AVAILABLE
  // ==========================================================

  const isOptionValueAvailable = (optionCode, candidateValue) => {
    const normalizedOptionCode = normalizeCode(optionCode);

    if (!normalizedOptionCode) {
      return false;
    }

    return activeVariants.some((variant) => {
      const valueMap = getVariantValueMap(variant);

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

    // ========================================================
    // EXACT MATCH
    // ========================================================

    const exactMatch = activeVariants.find((variant) =>
      isVariantMatch(variant, nextValues, optionCodes),
    );

    if (exactMatch) {
      setSelectedValues(getVariantValueMap(exactMatch));

      setSelectedVariantId(Number(exactMatch.id));

      setActionMessage("");

      return;
    }

    // ========================================================
    // COMPATIBLE VARIANT
    // ========================================================

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

    if (compatibleVariant) {
      setSelectedValues(getVariantValueMap(compatibleVariant));

      setSelectedVariantId(Number(compatibleVariant.id));

      setActionMessage("");

      return;
    }

    // ========================================================
    // NO MATCH
    // ========================================================

    setSelectedValues(nextValues);

    setSelectedVariantId(null);

    setActionMessage("Tổ hợp phiên bản này hiện không tồn tại.");
  };

  // ==========================================================
  // SELECT VARIANT DIRECTLY
  //
  // Trường hợp Product có nhiều variant nhưng không có options.
  // ==========================================================

  const handleSelectVariant = (variant) => {
    if (!variant?.id) {
      return;
    }

    const exists = activeVariants.some(
      (item) => Number(item.id) === Number(variant.id),
    );

    if (!exists) {
      return;
    }

    setSelectedVariantId(Number(variant.id));

    setSelectedValues(getVariantValueMap(variant));

    setActionMessage("");
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

    if (hasVariants && !selectedVariant) {
      setActionMessage("Vui lòng chọn phiên bản sản phẩm.");

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

        variant_id: selectedVariant?.id || defaultVariant?.id || null,

        quantity: safeQuantity,
      });

      if (goCheckout) {
        navigate("/checkout");

        return true;
      }

      setActionMessage(
        selectedVariant
          ? `Đã thêm phiên bản "${
              selectedVariant.variant_name || selectedVariant.sku
            }" vào giỏ hàng.`
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

      {/* ======================================================
          BREADCRUMB
      ====================================================== */}

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

      {/* ======================================================
          LAYOUT
      ====================================================== */}

      <section className="pd-layout">
        <div className="pd-left">
          {/* ==================================================
              HERO
          ================================================== */}

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
                variants={activeVariants}
                selectedValues={selectedValues}
                selectedVariant={selectedVariant}
                hasVariants={hasVariants}
                rating={rating}
                actionLoading={actionLoading}
                actionMessage={actionMessage}
                onSelectOption={handleSelectOption}
                onSelectVariant={handleSelectVariant}
                isOptionValueAvailable={isOptionValueAvailable}
                onAddToCart={handleAddToCart}
              />
            </div>
          </div>

          {/* ==================================================
              TABS
          ================================================== */}

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

          {/* ==================================================
              RELATED PRODUCTS
          ================================================== */}

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

                    try {
                      await addToCart({
                        product_id: item.id,

                        quantity: 1,
                      });

                      setActionMessage(`Đã thêm "${item.name}" vào giỏ hàng.`);
                    } catch (error) {
                      const message =
                        error?.response?.data?.message ||
                        error?.message ||
                        "Không thể thêm vào giỏ.";

                      setActionMessage(message);

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

        {/* ====================================================
            STICKY
        ==================================================== */}

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
