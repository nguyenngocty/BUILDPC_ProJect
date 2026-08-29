import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import SectionTitle from "./SectionTitle";

import { getBlogs } from "../../../services/postService";

import { API_ORIGIN } from "../../../utils/productClient";

// ============================================================
// HELPERS
// ============================================================

const stripHtml = (value = "") => {
  return String(value)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
};

const getPostImageUrl = (post) => {
  const image =
    post?.thumbnail ||
    post?.image ||
    post?.featured_image ||
    post?.image_url ||
    "";

  if (!image) {
    return "";
  }

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  return `${API_ORIGIN}${image.startsWith("/") ? "" : "/"}${image}`;
};

const formatPostDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const getPostExcerpt = (post) => {
  const source =
    post?.excerpt ||
    post?.short_description ||
    post?.description ||
    post?.content ||
    "";

  const plainText = stripHtml(source);

  if (!plainText) {
    return "Khám phá thêm kiến thức, kinh nghiệm và hướng dẫn hữu ích về linh kiện máy tính.";
  }

  if (plainText.length <= 145) {
    return plainText;
  }

  return `${plainText.slice(0, 142).trim()}...`;
};

// ============================================================
// SKELETON
// ============================================================

const BlogSkeleton = ({ index }) => {
  return (
    <article
      className="client-home-blog-card client-home-blog-card--skeleton"
      aria-hidden="true"
      key={`blog-skeleton-${index}`}
    >
      <div className="client-home-skeleton client-home-blog-card__skeleton-image" />

      <div className="client-home-blog-card__content">
        <div className="client-home-skeleton client-home-blog-card__skeleton-meta" />

        <div className="client-home-skeleton client-home-blog-card__skeleton-title" />

        <div className="client-home-skeleton client-home-blog-card__skeleton-text" />

        <div className="client-home-skeleton client-home-blog-card__skeleton-text client-home-blog-card__skeleton-text--short" />
      </div>
    </article>
  );
};

// ============================================================
// COMPONENT
// ============================================================

function BlogSection() {
  const [posts, setPosts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // ==========================================================
  // LOAD POSTS
  // ==========================================================

  useEffect(() => {
    let active = true;

    const fetchPosts = async () => {
      try {
        setLoading(true);

        setError("");

        const response = await getBlogs({
          sort: "latest",
          limit: 3,
          page: 1,
        });

        if (!active) {
          return;
        }

        const payload = response?.data?.data ?? response?.data ?? {};

        const items = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.posts)
            ? payload.posts
            : Array.isArray(payload?.items)
              ? payload.items
              : [];

        setPosts(items.slice(0, 3));
      } catch (err) {
        console.error("Lỗi tải bài viết trang chủ:", err);

        if (!active) {
          return;
        }

        setPosts([]);

        setError(
          err?.response?.data?.message || "Không thể tải bài viết mới nhất.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchPosts();

    return () => {
      active = false;
    };
  }, []);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <section className="client-home-blog-section">
      <SectionTitle
        eyebrow="KIẾN THỨC"
        title="Tin tức & hướng dẫn"
        description="Cập nhật kiến thức về phần cứng, lựa chọn linh kiện và kinh nghiệm sử dụng PC."
        link="/blog"
        linkText="Xem tất cả bài viết"
      />

      {loading && (
        <div className="client-home-blog-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <BlogSkeleton key={index} index={index} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="client-home-section-state client-home-section-state--error">
          <span className="client-home-section-state__icon">
            <i className="bi bi-exclamation-triangle" />
          </span>

          <div>
            <strong>Không thể tải bài viết</strong>

            <p>{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="client-home-section-state">
          <span className="client-home-section-state__icon">
            <i className="bi bi-journal-text" />
          </span>

          <div>
            <strong>Chưa có bài viết mới</strong>

            <p>Nội dung hướng dẫn và tin tức sẽ được cập nhật tại đây.</p>
          </div>
        </div>
      )}

      {!loading && !error && posts.length > 0 && (
        <div className="client-home-blog-grid">
          {posts.map((post) => {
            const postId = Number(post.id || 0);

            const imageUrl = getPostImageUrl(post);

            const postDate = formatPostDate(
              post.published_at || post.created_at || post.updated_at,
            );

            return (
              <article
                className="client-home-blog-card"
                key={postId || post.slug || post.title}
              >
                <Link
                  to={`/blog/${postId}`}
                  className="client-home-blog-card__visual"
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={post.title || "Bài viết"}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";

                        const fallback = event.currentTarget.nextElementSibling;

                        if (fallback) {
                          fallback.style.display = "grid";
                        }
                      }}
                    />
                  ) : null}

                  <span
                    className="client-home-blog-card__fallback"
                    style={{
                      display: imageUrl ? "none" : "grid",
                    }}
                  >
                    <i className="bi bi-journal-richtext" />
                  </span>

                  <span className="client-home-blog-card__type">
                    <i className="bi bi-lightbulb" />
                    Kiến thức
                  </span>
                </Link>

                <div className="client-home-blog-card__content">
                  <div className="client-home-blog-card__meta">
                    {postDate && (
                      <span>
                        <i className="bi bi-calendar3" />

                        {postDate}
                      </span>
                    )}

                    <span>
                      <i className="bi bi-clock" />
                      Bài viết
                    </span>
                  </div>

                  <h3>
                    <Link to={`/blog/${postId}`}>{post.title}</Link>
                  </h3>

                  <p>{getPostExcerpt(post)}</p>

                  <Link
                    to={`/blog/${postId}`}
                    className="client-home-blog-card__link"
                  >
                    <span>Đọc bài viết</span>

                    <i className="bi bi-arrow-right" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default BlogSection;
