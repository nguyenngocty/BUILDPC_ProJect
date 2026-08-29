import React, { useEffect, useState } from "react";

import "./Home.css";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import homeService from "../../../services/homeService";

import HeroBanner from "../../components/Home/HeroBanner";
import BuildPCSection from "../../components/Home/BuildPCSection";
import CategorySection from "../../components/Home/CategorySection";
import ProductSection from "../../components/Home/ProductSection";
import SuggestedBuildSection from "../../components/Home/SuggestedBuildSection";
import TrustSection from "../../components/Home/TrustSection";
import BlogSection from "../../components/Home/BlogSection";

// ============================================================
// RESPONSE HELPERS
// ============================================================

const getResponseList = (response) => {
  const payload = response?.data?.data ?? response?.data ?? [];

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.products)) {
    return payload.products;
  }

  if (Array.isArray(payload?.categories)) {
    return payload.categories;
  }

  return [];
};

// ============================================================
// COMPONENT
// ============================================================

function Home() {
  // ==========================================================
  // CATEGORIES
  // ==========================================================

  const [categories, setCategories] = useState([]);

  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [categoriesError, setCategoriesError] = useState("");

  // ==========================================================
  // TOP SELLERS
  // ==========================================================

  const [topProducts, setTopProducts] = useState([]);

  const [productsLoading, setProductsLoading] = useState(true);

  const [productsError, setProductsError] = useState("");

  // ==========================================================
  // LOAD CATEGORIES
  // ==========================================================

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);

        setCategoriesError("");

        const response = await homeService.getCategories();

        if (!active) {
          return;
        }

        setCategories(getResponseList(response));
      } catch (error) {
        console.error("Lỗi tải danh mục trang chủ:", error);

        if (!active) {
          return;
        }

        setCategories([]);

        setCategoriesError(
          error?.response?.data?.message || "Không thể tải danh mục sản phẩm.",
        );
      } finally {
        if (active) {
          setCategoriesLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      active = false;
    };
  }, []);

  // ==========================================================
  // LOAD TOP SELLERS
  // ==========================================================

  useEffect(() => {
    let active = true;

    const loadTopProducts = async () => {
      try {
        setProductsLoading(true);

        setProductsError("");

        const response = await homeService.getTopSellingProducts(8);

        if (!active) {
          return;
        }

        setTopProducts(getResponseList(response));
      } catch (error) {
        console.error("Lỗi tải sản phẩm bán chạy:", error);

        if (!active) {
          return;
        }

        setTopProducts([]);

        setProductsError(
          error?.response?.data?.message || "Không thể tải sản phẩm bán chạy.",
        );
      } finally {
        if (active) {
          setProductsLoading(false);
        }
      }
    };

    loadTopProducts();

    return () => {
      active = false;
    };
  }, []);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="client-home-page">
      <Header />

      <HeroBanner />

      <main className="client-home-main">
        <div className="client-home-shell">
          <BuildPCSection />

          <CategorySection
            categories={categories}
            loading={categoriesLoading}
            error={categoriesError}
          />

          <ProductSection
            products={topProducts}
            loading={productsLoading}
            error={productsError}
          />

          <SuggestedBuildSection />

          <TrustSection />

          <BlogSection />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Home;
