import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Home.css";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

// Vẫn giữ lại categories và builds tĩnh nếu chưa có API riêng, hoặc bạn có thể gọi API sau
import { categories } from "../../../models/CategoryModel";
import { builds } from "../../../models/BuildModel";

import HeroBanner from "../../components/Home/HeroBanner";
import BuildPCSection from "../../components/Home/BuildPCSection";
import CategorySection from "../../components/Home/CategorySection";
import ProductSection from "../../components/Home/ProductSection";
import SuggestedBuildSection from "../../components/Home/SuggestedBuildSection";
import TrustSection from "../../components/Home/TrustSection";
import BlogSection from "../../components/Home/BlogSection";

function Home() {
  // 1. Tạo state để lưu danh sách sản phẩm bán chạy lấy từ API
  const [topProducts, setTopProducts] = useState([]);

  // 2. Gọi API /top-sellers khi trang vừa load
  useEffect(() => {
    axios.get("http://localhost:5000/api/client/products/top-sellers") // Đổi cổng 5000 thành cổng Backend của bạn nếu khác
      .then((res) => {
        if (res.data && res.data.success) {
          setTopProducts(res.data.data); // Gán dữ liệu thật vào state
        }
      })
      .catch((err) => {
        console.error("Lỗi khi tải sản phẩm bán chạy:", err);
      });
  }, []);

  return (
    <div className="app">
      <Header />
      <HeroBanner />

      <main className="container main-content">
        <BuildPCSection />
        <CategorySection categories={categories} />
        
        {/* 3. Truyền mảng topProducts lấy từ API vào ProductSection */}
        <ProductSection products={topProducts} />

        <SuggestedBuildSection builds={builds} />
        <TrustSection />
        <BlogSection />
      </main>

      <Footer />
    </div>
  );
}

export default Home;