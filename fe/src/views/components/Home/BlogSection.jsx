import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SectionTitle from "./SectionTitle";
import { getBlogs } from "../../../services/postService";
//file moiws
function BlogSection() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        // Gọi API lấy 3 bài viết mới nhất (có thể chỉnh limit)
        const res = await getBlogs({
          sort: "latest",
          limit: 3,
          page: 1
        });
        // Cấu trúc API trả về: res.data.data.posts
        setPosts(res.data.data.posts || []);
      } catch (err) {
        console.error("Lỗi tải bài viết trang chủ:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  if (loading) {
    return (
      <>
        <SectionTitle title="Tin tức & Hướng dẫn" />
        <section className="news-section">
          <div className="news-grid">
            <div style={{ textAlign: 'center', padding: '40px', width: '100%', color: '#666' }}>
              Đang tải tin tức...
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <SectionTitle title="Tin tức & Hướng dẫn" />

      <section className="news-section">
        <div className="news-grid">
          {posts.length > 0 ? (
            posts.map((post) => (
              <article className="news-card" key={post.id}>
                <div className="news-card__icon">
                  <i className="bi bi-journal-text"></i>
                </div>

                <h3 className="news-card__title">{post.title}</h3>

                {/* Cắt bớt nội dung cho gọn (hiện tối đa 100 ký tự) */}
                <p className="news-card__desc">
                  {post.excerpt 
                    ? post.excerpt.replace(/<[^>]+>|&nbsp;/g, ' ').substring(0, 120) + '...' 
                    : 'Đọc bài viết để biết thêm chi tiết.'}
                </p>

                <Link to={`/blog/${post.id}`} className="news-card__link">
                  Đọc bài viết
                  <i className="bi bi-arrow-right"></i>
                </Link>
              </article>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', width: '100%', color: '#666' }}>
              Chưa có bài viết nào.
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default BlogSection;