import { useEffect, useMemo, useState } from "react";

import { Link, useParams } from "react-router-dom";

import Header from "../../components/Header";
import Footer from "../../components/Footer";

import { getBlogById, getBlogs } from "../../../services/postService";

import "./BlogDetail.css";

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
   TEXT
============================================================ */

const stripHtml = (value = "") => {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
};

/* ============================================================
   COMPONENT
============================================================ */

function BlogDetail() {
  const { id } = useParams();

  const [blog, setBlog] = useState(null);

  const [relatedBlogs, setRelatedBlogs] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [copied, setCopied] = useState(false);

  /* ============================================================
     LOAD
  ============================================================ */

  useEffect(() => {
    let active = true;

    const loadPost = async () => {
      try {
        setLoading(true);

        setError("");

        const response = await getBlogById(id);

        const item = response?.data?.data;

        if (!item) {
          throw new Error("Không tìm thấy bài viết.");
        }

        if (!active) {
          return;
        }

        const normalizedBlog = {
          ...item,

          image: getPostImageUrl(item.thumbnail),
        };

        setBlog(normalizedBlog);

        /* ======================================================
           RELATED
        ====================================================== */

        const categoryId = item.post_category_id || item.category_id;

        if (!categoryId) {
          setRelatedBlogs([]);

          return;
        }

        const relatedResponse = await getBlogs({
          post_category_id: categoryId,

          sort: "latest",

          page: 1,

          limit: 5,
        });

        if (!active) {
          return;
        }

        const rows = relatedResponse?.data?.data?.posts || [];

        const related = rows
          .filter((post) => Number(post.id) !== Number(item.id))
          .slice(0, 4)
          .map((post) => ({
            ...post,

            image: getPostImageUrl(post.thumbnail),
          }));

        setRelatedBlogs(related);
      } catch (err) {
        if (!active) {
          return;
        }

        console.error("Load blog detail error:", err);

        setBlog(null);

        setRelatedBlogs([]);

        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Không thể tải bài viết.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPost();

    return () => {
      active = false;
    };
  }, [id]);

  /* ============================================================
     READING TIME
  ============================================================ */

  const readingTime = useMemo(() => {
    if (!blog?.content) {
      return 1;
    }

    const plainText = stripHtml(blog.content);

    const words = plainText.split(/\s+/).filter(Boolean);

    return Math.max(1, Math.ceil(words.length / 200));
  }, [blog?.content]);

  /* ============================================================
     TAGS
  ============================================================ */

  const tags = useMemo(() => {
    if (!blog?.tags) {
      return [];
    }

    return String(blog.tags)
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }, [blog?.tags]);

  /* ============================================================
     COPY LINK
  ============================================================ */

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (err) {
      console.error("Copy link error:", err);
    }
  };

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return (
      <>
        <Header />

        <div className="blog-detail-loading">
          <i className="bi bi-arrow-repeat" />

          <span>Đang tải bài viết...</span>
        </div>

        <Footer />
      </>
    );
  }

  /* ============================================================
     NOT FOUND
  ============================================================ */

  if (!blog) {
    return (
      <>
        <Header />

        <div className="blog-detail-loading">
          <i className="bi bi-file-earmark-x" />

          <span>{error || "Không tìm thấy bài viết."}</span>

          <Link to="/blog">Quay lại danh sách bài viết</Link>
        </div>

        <Footer />
      </>
    );
  }

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <>
      <Header />

      {/* =====================================================
          BREADCRUMB
      ===================================================== */}

      <div className="bd-breadcrumb">
        <div className="container">
          <Link to="/">Trang chủ</Link>

          <span>/</span>

          <Link to="/blog">Bài viết</Link>

          <span>/</span>

          <span>{blog.title}</span>
        </div>
      </div>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="bd-hero">
        <div className="container">
          <div className="bd-category">
            {blog.post_category_name || blog.category_name || "Chưa phân loại"}
          </div>

          <h1 className="bd-title">{blog.title}</h1>

          <div className="bd-meta">
            <div>
              <i className="bi bi-person" />

              {blog.author_name || "BuildPC Team"}
            </div>

            <div>
              <i className="bi bi-calendar3" />

              {blog.created_at
                ? new Date(blog.created_at).toLocaleDateString("vi-VN")
                : "—"}
            </div>

            <div>
              <i className="bi bi-clock" />
              {readingTime} phút đọc
            </div>

            <div>
              <i className="bi bi-eye" />

              {Number(blog.views || 0).toLocaleString("vi-VN")}
            </div>

            <div>
              <i className="bi bi-folder2-open" />

              {blog.post_category_name ||
                blog.category_name ||
                "Chưa phân loại"}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <section className="bd-section">
        <div className="container">
          <div className="bd-layout">
            {/* =================================================
                MAIN
            ================================================= */}

            <main className="bd-main">
              <div className="bd-image">
                <img
                  src={blog.image}
                  alt={blog.title}
                  onError={(event) => {
                    event.currentTarget.src = "/images/no-image.png";
                  }}
                />
              </div>

              <div className="bd-content">
                {/* =============================================
                    EXCERPT
                ============================================= */}

                {blog.excerpt && (
                  <p className="bd-excerpt">{stripHtml(blog.excerpt)}</p>
                )}

                {/* =============================================
                    HTML CONTENT
                ============================================= */}

                <div
                  className="bd-content-html"
                  dangerouslySetInnerHTML={{
                    __html: blog.content || "",
                  }}
                />

                {/* =============================================
                    TAGS
                ============================================= */}

                <div className="bd-tags">
                  {tags.length > 0 ? (
                    tags.map((tag, index) => (
                      <span key={`${tag}-${index}`}>#{tag}</span>
                    ))
                  ) : (
                    <span>Chưa có thẻ</span>
                  )}
                </div>

                {/* =============================================
                    SHARE
                ============================================= */}

                <div className="bd-share">
                  <button type="button" onClick={copyLink}>
                    <i
                      className={
                        copied ? "bi bi-check2-circle" : "bi bi-link-45deg"
                      }
                    />

                    {copied ? "Đã sao chép" : "Sao chép liên kết"}
                  </button>
                </div>

                {/* =============================================
                    AUTHOR
                ============================================= */}

                <div className="bd-author">
                  <div>
                    <h3>{blog.author_name || "BuildPC Team"}</h3>

                    <p>
                      {blog.author_bio ||
                        "Đội ngũ nội dung BuildPC chia sẻ kiến thức, kinh nghiệm và thông tin hữu ích về phần cứng máy tính."}
                    </p>
                  </div>
                </div>

                <Link to="/blog" className="bd-back">
                  <i className="bi bi-arrow-left" />
                  Quay lại danh sách bài viết
                </Link>
              </div>
            </main>

            {/* =================================================
                SIDEBAR
            ================================================= */}

            <aside className="bd-sidebar">
              <div className="bd-card">
                <h3>Bài viết liên quan</h3>

                {relatedBlogs.length > 0 ? (
                  relatedBlogs.map((item) => (
                    <Link
                      key={item.id}
                      to={`/blog/${item.id}`}
                      className="bd-related"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.src = "/images/no-image.png";
                        }}
                      />

                      <div>
                        <h4>{item.title}</h4>

                        <span>
                          {item.post_category_name ||
                            item.category_name ||
                            "Chưa phân loại"}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p>Chưa có bài viết liên quan.</p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

export default BlogDetail;
