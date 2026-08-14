import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./PostManagement.css";
import postService from "../../../../services/postService";

const PostManagement = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  const fetchPosts = async () => {
    try {
      setLoading(true);

      const res = await postService.getPosts({
        keyword,
        category_id: category,
        status,
      });

      setPosts(res.data.data || []);
    } catch (err) {
      console.error(err);
      alert("Không tải được danh sách bài viết");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [keyword, category, status]);

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa bài viết?")) return;

    try {
      await postService.deletePost(id);

      alert("Xóa bài viết thành công!");

      fetchPosts();
    } catch (err) {
      console.error(err);
      alert("Xóa thất bại!");
    }
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString("vi-VN");
  };
    return (
    <div className="admin-post-management">
      <div className="page-header">
        <div className="header-title">
          <h2>Quản lý bài viết</h2>
          <p>Quản lý tin tức, hướng dẫn Build PC và khuyến mãi.</p>
        </div>

        <Link
          to="/admin/posts/create"
          className="btn-create-post"
          style={{ textDecoration: "none" }}
        >
          <i className="bi bi-plus-lg"></i>
          Tạo bài viết mới
        </Link>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <i className="bi bi-search"></i>

          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className="filter-actions">
          <select
            className="filter-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Tất cả danh mục</option>
            <option value="1">Hướng dẫn Build PC</option>
            <option value="2">Tin tức</option>
            <option value="3">Khuyến mãi</option>
          </select>

          <select
            className="filter-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="1">Đã xuất bản</option>
            <option value="0">Bản nháp</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 20 }}>Đang tải dữ liệu...</div>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Tác giả</th>
                <th>Danh mục</th>
                <th>Ngày đăng</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {posts.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center" }}>
                    Không có bài viết.
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <div className="post-info">
                        <img
                          src={
                            post.thumbnail
                              ? `http://localhost:5000${post.thumbnail}`
                              : "https://via.placeholder.com/60x60?text=No+Image"
                          }
                          alt={post.title}
                          className="post-thumb"
                          onError={(e) => {
                            e.target.src =
                              "https://via.placeholder.com/60x60?text=No+Image";
                          }}
                        />

                        <div className="post-meta">
                          <h4>{post.title}</h4>
                          <span>
                            <i className="bi bi-link-45deg"></i>
                            {post.slug}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>{post.author}</td>

                    <td>
                      <span className="category-tag">
                        {post.category_name}
                      </span>
                    </td>

                    <td>{formatDate(post.created_at)}</td>

                    <td>
                      <span
                        className={`status-badge ${
                          Number(post.status) === 1
                            ? "published"
                            : "draft"
                        }`}
                      >
                        {Number(post.status) === 1
                          ? "Đã xuất bản"
                          : "Bản nháp"}
                      </span>
                    </td>

                    <td>
                      <div className="action-btns">
                        <Link
                          to={`/admin/posts/edit/${post.id}`}
                          className="btn-icon edit-btn"
                        >
                          <i className="bi bi-pencil"></i>
                        </Link>

                        <button
                          className="btn-icon delete-btn"
                          onClick={() => handleDelete(post.id)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
  };

export default PostManagement;