import { Link, useNavigate } from "react-router-dom";

import { useState } from "react";

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

function ProductDetail() {
  const navigate = useNavigate();

  const {
    product,
    gallery,
    specifications,
    rating,
    reviews,
    relatedProducts,
    loading,
    error,
    refresh,
  } = useClientProductDetail();

  const { addToCart } = useCart();

  const { isAuthenticated } = useAuth();

  const [actionLoading, setActionLoading] = useState(false);

  const [actionMessage, setActionMessage] = useState("");

  const handleAddToCart = async (quantity = 1, { goCheckout = false } = {}) => {
    if (!product) {
      return false;
    }

    if (!isAuthenticated) {
      setActionMessage(
        "Vui lòng đăng nhập trước khi thêm sản phẩm vào giỏ hàng.",
      );

      return false;
    }

    if (!product.in_stock) {
      setActionMessage("Sản phẩm hiện đã hết hàng.");

      return false;
    }

    const safeQuantity = Math.max(
      Math.min(Number(quantity) || 1, Number(product.quantity || 1)),
      1,
    );

    try {
      setActionLoading(true);
      setActionMessage("");

      await addToCart(product.id, safeQuantity);

      if (goCheckout) {
        navigate("/checkout");

        return true;
      }

      setActionMessage("Đã thêm sản phẩm vào giỏ hàng.");

      return true;
    } catch (err) {
      setActionMessage(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể thêm sản phẩm vào giỏ hàng.",
      );

      return false;
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pd-page">
        <Header />

        <Skeleton />

        <Footer />
      </div>
    );
  }

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
              <ProductGallery product={product} gallery={gallery} />

              <ProductInfo
                product={product}
                rating={rating}
                actionLoading={actionLoading}
                actionMessage={actionMessage}
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

                    try {
                      await addToCart(item.id, 1);

                      setActionMessage(`Đã thêm "${item.name}" vào giỏ hàng.`);
                    } catch (err) {
                      setActionMessage(
                        err?.response?.data?.message ||
                          err?.message ||
                          "Không thể thêm vào giỏ.",
                      );
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="pd-right">
          <ProductStickyBox
            product={product}
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
