import { useEffect, useMemo, useState } from "react";

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

import { getBlogs, getBlogCategories } from "../../../services/postService";

import "./Blog.css";

/* ============================================================
   IMAGE
============================================================ */

const API_BASE_URL =
  process.env.REACT_APP_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000";

const getPostImageUrl = (thumbnail) => {
  if (!thumbnail) {
    return "/images/no-image.png";
  }

  if (
    thumbnail.startsWith("http://") ||
    thumbnail.startsWith("https://") ||
    thumbnail.startsWith("data:") ||
    thumbnail.startsWith("blob:")
  ) {
    return thumbnail;
  }

  return `${API_BASE_URL}${thumbnail.startsWith("/") ? "" : "/"}${thumbnail}`;
};

/* ============================================================
   CLEAN TEXT
============================================================ */

const stripHtml = (value = "") => {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
};

/* ============================================================
   NORMALIZE POST
============================================================ */

const normalizePost = (item = {}) => ({
  id: item.id,

  title: item.title || "Bài viết",

  slug: item.slug || "",

  image: getPostImageUrl(item.thumbnail),

  thumbnail: item.thumbnail,

  category: item.post_category_name || item.category_name || "Chưa phân loại",

  categoryId: item.post_category_id || item.category_id || null,

  date: item.created_at
    ? new Date(item.created_at).toLocaleDateString("vi-VN")
    : "",

  createdAt: item.created_at,

  views: Number(item.views || 0),

  featured: Number(item.is_featured) === 1,

  desc: stripHtml(item.excerpt || ""),

  content: item.content || "",

  author: item.author_name || "BuildPC Team",
});

function Blog() {
  /* ============================================================
     STATE
  ============================================================ */

  const [blogs, setBlogs] = useState([]);

  const [featuredBlogs, setFeaturedBlogs] = useState([]);

  const [popularBlogs, setPopularBlogs] = useState([]);

  const [categoryList, setCategoryList] = useState([
    {
      id: "all",
      name: "Tất cả",
      post_count: 0,
    },
  ]);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [categoryId, setCategoryId] = useState("all");

  const [sort, setSort] = useState("latest");

  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);

  const perPage = 6;

  /* ============================================================
     LOAD CATEGORIES
  ============================================================ */

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await getBlogCategories();

        const rows = response?.data?.data || [];

        const categories = Array.isArray(rows)
          ? rows.map((item) => ({
              id: item.id,

              name: item.name,

              slug: item.slug,

              description: item.description,

              post_count: Number(item.post_count || 0),
            }))
          : [];

        const totalPosts = categories.reduce(
          (sum, item) => sum + Number(item.post_count || 0),
          0,
        );

        setCategoryList([
          {
            id: "all",
            name: "Tất cả",
            post_count: totalPosts,
          },

          ...categories,
        ]);
      } catch (error) {
        console.error("Lỗi tải danh mục bài viết:", error);

        setCategoryList([
          {
            id: "all",
            name: "Tất cả",
            post_count: 0,
          },
        ]);
      }
    };

    loadCategories();
  }, []);

  /* ============================================================
     LOAD POPULAR POSTS
  ============================================================ */

  useEffect(() => {
    const loadPopularPosts = async () => {
      try {
        const response = await getBlogs({
          sort: "views",
          page: 1,
          limit: 5,
        });

        const rows = response?.data?.data?.posts || [];

        setPopularBlogs(rows.map(normalizePost));
      } catch (error) {
        console.error("Lỗi tải bài viết xem nhiều:", error);

        setPopularBlogs([]);
      }
    };

    loadPopularPosts();
  }, []);

  /* ============================================================
     LOAD FEATURED POSTS

     BE sort="featured":
     is_featured DESC, created_at DESC
  ============================================================ */

  useEffect(() => {
    const loadFeaturedPosts = async () => {
      try {
        const response = await getBlogs({
          sort: "featured",
          page: 1,
          limit: 10,
        });

        const rows = response?.data?.data?.posts || [];

        /*
         * Chỉ lấy bài thực sự được đánh dấu nổi bật.
         */
        const featured = rows
          .filter((item) => Number(item.is_featured) === 1)
          .slice(0, 3)
          .map(normalizePost);

        setFeaturedBlogs(featured);
      } catch (error) {
        console.error("Lỗi tải bài viết nổi bật:", error);

        setFeaturedBlogs([]);
      }
    };

    loadFeaturedPosts();
  }, []);

  /* ============================================================
     LOAD BLOG LIST
  ============================================================ */

  useEffect(() => {
    let active = true;

    const loadBlogs = async () => {
      try {
        setLoading(true);

        const params = {
          search: search.trim(),
          sort,
          page,
          limit: perPage,
        };

        /*
         * Chỉ gửi category khi user chọn category cụ thể.
         */
        if (categoryId && categoryId !== "all") {
          params.post_category_id = categoryId;
        }

        const response = await getBlogs(params);

        if (!active) {
          return;
        }

        const rows = response?.data?.data?.posts || [];

        const pagination = response?.data?.data?.pagination;

        setBlogs(rows.map(normalizePost));

        setTotal(Number(pagination?.total || 0));
      } catch (error) {
        if (!active) {
          return;
        }

        console.error("Lỗi tải danh sách bài viết:", error);

        setBlogs([]);
        setTotal(0);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadBlogs();

    return () => {
      active = false;
    };
  }, [search, categoryId, sort, page]);

  /* ============================================================
     CATEGORY DATA
  ============================================================ */

  const sidebarCategories = useMemo(() => {
    return categoryList.map((category) => category.name);
  }, [categoryList]);

  const categoryCounts = useMemo(() => {
    const result = {};

    categoryList.forEach((category) => {
      result[category.name] = Number(category.post_count || 0);
    });

    return result;
  }, [categoryList]);

  const currentCategory = useMemo(() => {
    return (
      categoryList.find(
        (category) => String(category.id) === String(categoryId),
      )?.name || "Tất cả"
    );
  }, [categoryList, categoryId]);

  /* ============================================================
     CHANGE CATEGORY
  ============================================================ */

  const handleCategoryChange = (name) => {
    const found = categoryList.find((category) => category.name === name);

    setCategoryId(found ? found.id : "all");

    setPage(1);
  };

  /* ============================================================
     SCROLL REVEAL
  ============================================================ */

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
  }, [blogs, featuredBlogs, popularBlogs]);

  /* ============================================================
     CARD TILT
  ============================================================ */

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

  /* ============================================================
     RENDER
  ============================================================ */

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
        {/* ===================================================
            SIDEBAR
        =================================================== */}

        <aside className="blog-sidebar">
          <CategorySidebar
            categories={sidebarCategories}
            category={currentCategory}
            setCategory={handleCategoryChange}
            counts={categoryCounts}
          />

          <PopularPosts blogs={popularBlogs} />
        </aside>

        {/* ===================================================
            MAIN
        =================================================== */}

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
                length: perPage,
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

          {!loading && (
            <Pagination
              total={total}
              current={page}
              perPage={perPage}
              setCurrent={(value) => {
                setPage(value);

                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
            />
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default Blog;
