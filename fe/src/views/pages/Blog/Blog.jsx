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

import categoryService from "../../../services/categoryService";

import "./Blog.css";

function Blog() {
  const [blogs, setBlogs] = useState([]);

  const [popularBlogs, setPopularBlogs] = useState([]);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [categoryId, setCategoryId] = useState("all");

  const [sort, setSort] = useState("latest");

  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);

  const [categoryList, setCategoryList] = useState([]);

  const perPage = 6;

  /* =========================================================
     CATEGORIES + POPULAR
  ========================================================= */

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryService.getCategories({
          status: 1,
        });

        setCategoryList([
          {
            id: "all",
            name: "Tất cả",
          },
          ...(res.data || []),
        ]);
      } catch (error) {
        console.error("Lỗi tải danh mục:", error);

        setCategoryList([
          {
            id: "all",
            name: "Tất cả",
          },
        ]);
      }
    };

    fetchCategories();
    loadPopularPosts();
  }, []);

  /* =========================================================
     POPULAR POSTS
  ========================================================= */

  const loadPopularPosts = async () => {
    try {
      const res = await getBlogs({
        sort: "views",
        page: 1,
        limit: 5,
      });

      const rows = res?.data?.data?.posts || [];

      rows.sort((a, b) => Number(b.views || 0) - Number(a.views || 0));

      const newPopular = rows.slice(0, 5).map((item) => ({
        id: item.id,

        title: item.title,

        slug: item.slug,

        image: item.thumbnail
          ? `http://localhost:5000${item.thumbnail}`
          : "/images/no-image.png",

        category: item.category_name || "Chưa phân loại",

        date: new Date(item.created_at).toLocaleDateString("vi-VN"),

        views: Number(item.views || 0),

        featured: Number(item.is_featured) === 1,

        desc: item.excerpt,

        content: item.content,

        author: item.author_name || "Ẩn danh",
      }));

      setPopularBlogs(newPopular);
    } catch (error) {
      console.error("Lỗi load bài xem nhiều:", error);
    }
  };

  /* =========================================================
     BLOG LIST
  ========================================================= */

  const loadBlogs = async () => {
    try {
      setLoading(true);

      const res = await getBlogs({
        search,
        category_id: categoryId,
        sort,
        page,
        limit: perPage,
      });

      const rows = res?.data?.data?.posts || [];

      const newBlogs = rows.map((item) => ({
        id: item.id,

        title: item.title,

        slug: item.slug,

        image: item.thumbnail
          ? `http://localhost:5000${item.thumbnail}`
          : "/images/no-image.png",

        category: item.category_name || "Chưa phân loại",

        date: new Date(item.created_at).toLocaleDateString("vi-VN"),

        views: Number(item.views || 0),

        featured: Number(item.is_featured) === 1,

        desc: item.excerpt,

        content: item.content,

        author: item.author_name || "Ẩn danh",
      }));

      setBlogs(newBlogs);

      setTotal(Number(res?.data?.data?.pagination?.total || 0));
    } catch (error) {
      console.error("Load blogs error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, [search, categoryId, sort, page]);

  /* =========================================================
     SCROLL REVEAL
     Intersection Observer API
  ========================================================= */

  useEffect(() => {
    const targets = document.querySelectorAll(
      [
        ".blog-page .bp-featured",
        ".blog-page .blog-search",
        ".blog-page .blog-sort",
        ".blog-page .blog-widget",
        ".blog-page .bp-popular",
        ".blog-page .bp-blog-card",
      ].join(","),
    );

    targets.forEach((element) => {
      element.classList.add("blog-motion-reveal");
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("blog-motion-visible");

            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,

        rootMargin: "0px 0px -35px 0px",
      },
    );

    targets.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [blogs, popularBlogs]);

  /* =========================================================
     CARD 3D TILT
     Pointer Event thuần.
  ========================================================= */

  useEffect(() => {
    const cards = document.querySelectorAll(".blog-page .bp-blog-card");

    const cleanups = [];

    cards.forEach((card) => {
      const handleMove = (event) => {
        if (window.innerWidth <= 992) {
          return;
        }

        const rect = card.getBoundingClientRect();

        const x = event.clientX - rect.left;

        const y = event.clientY - rect.top;

        const centerX = rect.width / 2;

        const centerY = rect.height / 2;

        const rotateY = ((x - centerX) / centerX) * 1.7;

        const rotateX = -((y - centerY) / centerY) * 1.7;

        card.style.setProperty("--blog-tilt-x", `${rotateX}deg`);

        card.style.setProperty("--blog-tilt-y", `${rotateY}deg`);

        card.style.setProperty(
          "--blog-pointer-x",
          `${(x / rect.width) * 100}%`,
        );

        card.style.setProperty(
          "--blog-pointer-y",
          `${(y / rect.height) * 100}%`,
        );
      };

      const handleLeave = () => {
        card.style.setProperty("--blog-tilt-x", "0deg");

        card.style.setProperty("--blog-tilt-y", "0deg");

        card.style.setProperty("--blog-pointer-x", "50%");

        card.style.setProperty("--blog-pointer-y", "50%");
      };

      card.addEventListener("pointermove", handleMove);

      card.addEventListener("pointerleave", handleLeave);

      cleanups.push(() => {
        card.removeEventListener("pointermove", handleMove);

        card.removeEventListener("pointerleave", handleLeave);
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [blogs]);

  /* =========================================================
     DATA
  ========================================================= */

  const sidebarCategories = categoryList.map((category) => category.name);

  const counts = {};

  blogs.forEach((item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
  });

  const featuredBlogs = blogs.slice(0, 3);

  const currentCategory =
    categoryList.find((category) => String(category.id) === String(categoryId))
      ?.name || "Tất cả";

  /* =========================================================
     CHANGE CATEGORY
  ========================================================= */

  const handleCategoryChange = (name) => {
    const found = categoryList.find((category) => category.name === name);

    setCategoryId(found ? found.id : "all");

    setPage(1);
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="blog-page">
      <Header />

      {/* =====================================================
          BREADCRUMB
      ===================================================== */}

      <div className="blogs-breadcrumb">
        <div className="blogs-breadcrumb__shell">
          <Link to="/">Trang chủ</Link>

          <i className="bi bi-chevron-right" />

          <span>Bài viết</span>
        </div>
      </div>

      {/* =====================================================
          HERO
      ===================================================== */}

      <BlogHero />

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="blog-wrapper">
        <aside className="blog-sidebar">
          <CategorySidebar
            categories={sidebarCategories}
            category={currentCategory}
            setCategory={handleCategoryChange}
            counts={counts}
          />

          <PopularPosts blogs={popularBlogs} />
        </aside>

        <main className="blog-main">
          {/* ===============================================
              SORT
          =============================================== */}

          <div className="blog-sort">
            <div className="blog-sort__label">
              <i className="bi bi-sort-down" />

              <span>Sắp xếp</span>
            </div>

            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);

                setPage(1);
              }}
            >
              <option value="latest">Mới nhất</option>

              <option value="oldest">Cũ nhất</option>

              <option value="views">Xem nhiều</option>
            </select>
          </div>

          {/* ===============================================
              FEATURED
          =============================================== */}

          <FeaturedPosts blogs={featuredBlogs} />

          {/* ===============================================
              SEARCH
          =============================================== */}

          <BlogSearch
            search={search}
            setSearch={(value) => {
              setSearch(value);

              setPage(1);
            }}
            category={currentCategory}
            setCategory={handleCategoryChange}
            categories={sidebarCategories}
          />

          {/* ===============================================
              BLOG GRID
          =============================================== */}

          <div className="blog-grid">
            {loading ? (
              Array.from({
                length: 6,
              }).map((_, index) => (
                <div className="blog-loading-card" key={index}>
                  <div className="blog-loading-card__image" />

                  <div className="blog-loading-card__body">
                    <div className="blog-loading-card__line blog-loading-card__line--short" />

                    <div className="blog-loading-card__line blog-loading-card__line--title" />

                    <div className="blog-loading-card__line" />

                    <div className="blog-loading-card__line blog-loading-card__line--medium" />

                    <div className="blog-loading-card__button" />
                  </div>
                </div>
              ))
            ) : blogs.length > 0 ? (
              blogs.map((blog) => <BlogCard key={blog.id} blog={blog} />)
            ) : (
              <div className="blog-empty">
                <span className="blog-empty__icon">
                  <i className="bi bi-search" />
                </span>

                <h3>Không tìm thấy bài viết</h3>

                <p>Hãy thử thay đổi từ khóa hoặc lựa chọn danh mục khác.</p>
              </div>
            )}
          </div>

          {/* ===============================================
              PAGINATION
          =============================================== */}

          <Pagination
            total={total}
            current={page}
            perPage={perPage}
            setCurrent={setPage}
          />
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default Blog;
