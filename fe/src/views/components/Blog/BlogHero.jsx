
function BlogHero() {
  return (
    <section className="blog-hero">
      <div className="blog-hero-overlay"></div>

      <div className="container">
        <div className="blog-hero-content">
          <span className="blog-hero-tag">BUILDPC KNOWLEDGE CENTER</span>

          <h1>
            Blog Công Nghệ
            <span> BuildPC</span>
          </h1>

          <p>
            Cập nhật tin tức phần cứng mới nhất, review linh kiện, hướng dẫn
            Build PC, kinh nghiệm chọn cấu hình Gaming, Đồ họa và Workstation.
          </p>

          <div className="hero-info">
            <div className="hero-item">
              <i className="bi bi-cpu"></i>
              <span>CPU</span>
            </div>

            <div className="hero-item">
              <i className="bi bi-gpu-card"></i>
              <span>GPU</span>
            </div>

            <div className="hero-item">
              <i className="bi bi-memory"></i>
              <span>RAM</span>
            </div>

            <div className="hero-item">
              <i className="bi bi-pc-display"></i>
              <span>Build PC</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BlogHero;
