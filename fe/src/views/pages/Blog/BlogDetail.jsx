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

      // Chi tiết bài viết
      const res = await getBlogById(id);

      const item = res.data.data;

      const image =
        item.thumbnail && item.thumbnail.startsWith("http")
          ? item.thumbnail
          : `http://localhost:5000${item.thumbnail}`;

      setBlog({
        ...item,
        image,
      });

      // Bài viết liên quan
      const list = await getBlogs();

      const rows = list.data.data || [];

      const related = rows
        .filter((p) => p.id !== item.id)
        .slice(0, 4)
        .map((p) => ({
          ...p,
          image:
            p.thumbnail && p.thumbnail.startsWith("http")
              ? p.thumbnail
              : `http://localhost:5000${p.thumbnail}`,
        }));

      setRelatedBlogs(related);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="blog-detail-loading">Đang tải bài viết...</div>
        <Footer />
      </>
    );
  }

  if (!blog) {
    return (
      <>
        <Header />
        <div className="blog-detail-loading">Không tìm thấy bài viết.</div>
        <Footer />
      </>
    );
  }

  const readingTime = Math.max(
    1,
    Math.ceil(blog.content.split(" ").length / 200),
  );

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Đã sao chép liên kết.");
  };

  return (
    <>
      <Header />

      {/* Breadcrumb */}

      <div className="bd-breadcrumb">
        <div className="container">
          <Link to="/">Trang chủ</Link>

          <span>/</span>

          <Link to="/blog">Tin tức</Link>

          <span>/</span>

          <span>{blog.title}</span>
        </div>
      </div>

      {/* Hero */}

      <section className="bd-hero">
        <div className="container">
          <div className="bd-category">{blog.category || "Tin tức"}</div>

          <h1 className="bd-title">{blog.title}</h1>

          <div className="bd-meta">
            <div>
              <i className="bi bi-calendar3"></i>

              {new Date(blog.created_at).toLocaleDateString("vi-VN")}
            </div>

            <div>
              <i className="bi bi-clock"></i>
              {readingTime} phút đọc
            </div>

            <div>
              <i className="bi bi-eye"></i>

              {blog.views || 0}
            </div>

            <div>
              <i className="bi bi-folder2-open"></i>

              {blog.category}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}

      <section className="bd-section">
        <div className="container">
          <div className="bd-layout">
            {/* LEFT */}

            <div className="bd-main">
              <div className="bd-image">
                <img src={blog.image} alt={blog.title} />
              </div>

              <div className="bd-content">
                <p>{blog.content}</p>

                {/* TAG */}

                <div className="bd-tags">
                  <span>#BuildPC</span>

                  <span>#Gaming</span>

                  <span>#Hardware</span>

                  <span>#{blog.category}</span>
                </div>

                {/* SHARE */}

                <div className="bd-share">
                  <button>
                    <i className="bi bi-facebook"></i>
                    Facebook
                  </button>

                  <button>
                    <i className="bi bi-chat-dots"></i>
                    Zalo
                  </button>

                  <button onClick={copyLink}>
                    <i className="bi bi-link-45deg"></i>
                    Copy Link
                  </button>
                </div>

                {/* AUTHOR */}

                <div className="bd-author">
                  <img
                    src="https://i.pravatar.cc/150?img=12"
                    alt="BuildPC Team"
                  />

                  <div>
                    <h3>BuildPC Team</h3>

                    <p>
                      Chuyên chia sẻ kiến thức về PC Gaming, Workstation, linh
                      kiện máy tính, review phần cứng và hướng dẫn Build PC dành
                      cho game thủ và dân công nghệ.
                    </p>
                  </div>
                </div>

                <Link to="/blog" className="bd-back">
                  ← Quay lại danh sách bài viết
                </Link>
              </div>
            </div>

            {/* SIDEBAR */}

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

                      <span>{item.category}</span>
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
