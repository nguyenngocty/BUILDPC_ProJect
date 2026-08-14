import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import BlogHero from "../../components/Blog/BlogHero";
import BlogSearch from "../../components/Blog/BlogSearch";
import FeaturedPosts from "../../components/Blog/FeaturedPosts";
import CategorySidebar from "../../components/Blog/CategorySidebar";
import PopularPosts from "../../components/Blog/PopularPosts";
import BlogCard from "../../components/Blog/BlogCard";
import Pagination from "../../components/Blog/Pagination";

import { getBlogs } from "../../../services/postService";

import "./Blog.css";

function Blog() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [sort, setSort] = useState("latest");
  const [page, setPage] = useState(1);

  const perPage = 6;

  useEffect(() => {
    loadBlogs();
  }, [search, category, sort]);

  const loadBlogs = async () => {
    try {
      setLoading(true);

      const res = await getBlogs({
        search,
        category,
        sort,
      });

      const rows = res.data.data || [];

      const newBlogs = rows.map((item) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,

        image:
          item.thumbnail && item.thumbnail.startsWith("/uploads")
            ? `http://localhost:5000${item.thumbnail}`
            : `http://localhost:5000/uploads/posts/${item.thumbnail}`,

        category: item.category || "Chưa phân loại",

        date: new Date(item.created_at).toLocaleDateString("vi-VN"),

        views: 0,

        featured: false,

        desc: item.content,

        content: item.content,
      }));

      setBlogs(newBlogs);
    } catch (err) {
      console.error("Load blogs error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ===========================
  // Danh mục
  // ===========================

  const categories = [
    "Tất cả",
    ...new Set(blogs.map((item) => item.category)),
  ];

  const counts = {};

  blogs.forEach((item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
  });

  // ===========================
  // Bài nổi bật
  // ===========================

  const featuredBlogs = blogs.slice(0, 3);

  // ===========================
  // Bài xem nhiều
  // ===========================

  const popularBlogs = blogs.slice(0, 5);

  // ===========================
  // Phân trang
  // ===========================

  const total = blogs.length;

  const start = (page - 1) * perPage;

  const data = blogs.slice(start, start + perPage);

  return (
    <>
      <Header />

      <div className="blogs-breadcrumb">
        <div className="container">
          <Link to="/">Trang chủ</Link>

          <span>/</span>

          <span>Bài viết</span>
        </div>
      </div>

      <BlogHero />

      <div className="blog-wrapper">
        <aside>
          <CategorySidebar
            categories={categories}
            category={category}
            setCategory={(value) => {
              setCategory(value);
              setPage(1);
            }}
            counts={counts}
          />

          <PopularPosts blogs={popularBlogs} />
        </aside>

        <main>
          <div className="blog-sort">
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="latest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="views">Xem nhiều</option>
            </select>
          </div>

          <FeaturedPosts blogs={featuredBlogs} />

          <BlogSearch
            search={search}
            setSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
            category={category}
            setCategory={(value) => {
              setCategory(value);
              setPage(1);
            }}
            categories={categories}
          />

          <div className="blog-grid">
            {loading ? (
              <div className="blog-empty">
                <h3>Đang tải dữ liệu...</h3>
              </div>
            ) : data.length > 0 ? (
              data.map((blog) => (
                <BlogCard
                  key={blog.id}
                  blog={blog}
                />
              ))
            ) : (
              <div className="blog-empty">
                <h3>Không tìm thấy bài viết</h3>

                <p>Hãy thử từ khóa hoặc danh mục khác.</p>
              </div>
            )}
          </div>

          <Pagination
            total={total}
            current={page}
            perPage={perPage}
            setCurrent={setPage}
          />
        </main>
      </div>

      <Footer />
    </>
  );
}

export default Blog;