import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getBlogById, getBlogs } from "../../../services/postService";
import "./BlogDetail.css";

function BlogDetail() {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [relatedBlogs, setRelatedBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPost();
  }, [id]);

  const loadPost = async () => {
    try {
      setLoading(true);
      const res = await getBlogById(id);
      const item = res.data.data;
      const image = item.thumbnail
        ? `http://localhost:5000${item.thumbnail}`
        : "https://placehold.co/600x400?text=No+Image";

      setBlog({ ...item, image });

      const list = await getBlogs({ category_id: item.category_id, limit: 4 });
      const rows = list.data.data.posts || [];
      const related = rows
        .filter((p) => p.id !== item.id)
        .slice(0, 4)
        .map((p) => ({
          ...p,
          image: p.thumbnail
            ? `http://localhost:5000${p.thumbnail}`
            : "https://placehold.co/600x400?text=No+Image",
        }));
      setRelatedBlogs(related);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <>
        <Header />
        <div className="blog-detail-loading">Đang tải...</div>
        <Footer />
      </>
    );
  if (!blog)
    return (
      <>
        <Header />
        <div className="blog-detail-loading">Không tìm thấy.</div>
        <Footer />
      </>
    );

  const readingTime = Math.max(
    1,
    Math.ceil(blog.content.split(" ").length / 200),
  );
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Đã sao chép.");
  };

  return (
    <>
      <Header />
      <div className="bd-breadcrumb">
        <div className="container">
          <Link to="/">Trang chủ</Link> <span>/</span>{" "}
          <Link to="/blog">Tin tức</Link> <span>/</span>{" "}
          <span>{blog.title}</span>
        </div>
      </div>

      {/* ============== HERO ============== */}
      <section className="bd-hero">
        <div className="container">
          <div className="bd-category">{blog.category_name || "Tin tức"}</div>
          <h1 className="bd-title">{blog.title}</h1>
          <div className="bd-meta">
            <div>
              <i className="bi bi-person"></i> {blog.author_name || "Ẩn danh"}
            </div>
            <div>
              <i className="bi bi-calendar3"></i>{" "}
              {new Date(blog.created_at).toLocaleDateString("vi-VN")}
            </div>
            <div>
              <i className="bi bi-clock"></i> {readingTime} phút đọc
            </div>
            <div>
              <i className="bi bi-eye"></i> {blog.views || 0}
            </div>
            <div>
              <i className="bi bi-folder2-open"></i> {blog.category_name}
            </div>
          </div>
        </div>
      </section>

      {/* ============== NỘI DUNG CHÍNH ============== */}
      <section className="bd-section">
        <div className="container">
          <div className="bd-layout">
            <div className="bd-main">
              <div className="bd-image">
                <img src={blog.image} alt={blog.title} />
              </div>
              <div className="bd-content">
                <div
                  className="bd-content-html"
                  dangerouslySetInnerHTML={{ __html: blog.content }}
                />

                <div className="bd-tags">
                  {blog.tags?.trim() ? (
                    blog.tags
                      .split(",")
                      .map((tag, index) => (
                        <span key={index}>#{tag.trim()}</span>
                      ))
                  ) : (
                    <span>Chưa có thẻ</span>
                  )}
                </div>
                <div className="bd-share">
                  
                  <button onClick={copyLink}>
                    <i className="bi bi-link-45deg"></i> Copy Link
                  </button>
                </div>

                {/* ============== TÁC GIẢ (ĐÃ XÓA ẢNH AVATAR) ============== */}
                <div className="bd-author">
                  <div>
                    <h3>{blog.author_name || "BuildPC Team"}</h3>
                    <p>{blog.author_bio || "Chưa có thông tin giới thiệu."}</p>
                  </div>
                </div>

                <Link to="/blog" className="bd-back">
                  ← Quay lại danh sách bài viết
                </Link>
              </div>
            </div>

            <aside className="bd-sidebar">
              <div className="bd-card">
                <h3>Bài viết liên quan</h3>
                {relatedBlogs.map((item) => (
                  <Link
                    key={item.id}
                    to={`/blog/${item.id}`}
                    className="bd-related"
                  >
                    <img src={item.image} alt={item.title} />
                    <div>
                      <h4>{item.title}</h4>
                      <span>{item.category_name}</span>
                    </div>
                  </Link>
                ))}
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