function BlogHero() {
  return (
    <section className="blog-hero">
      <div className="blog-hero-overlay" />

      <div className="blog-hero-shell">
        <div className="blog-hero-content">
          <span className="blog-hero-tag">
            <i className="bi bi-stars" />
            BUILDPC KNOWLEDGE CENTER
          </span>

          <h1>
            Kiến thức công nghệ
          </h1>

          <p>
            Cập nhật tin tức phần cứng, review linh kiện, hướng dẫn Build PC và
            kinh nghiệm lựa chọn cấu hình Gaming, Đồ họa, Văn phòng và
            Workstation.
          </p>

          <div className="hero-info">
            <div className="hero-item">
              <span className="hero-item__icon">
                <i className="bi bi-cpu" />
              </span>

              <span>CPU</span>
            </div>

            <div className="hero-item">
              <span className="hero-item__icon">
                <i className="bi bi-gpu-card" />
              </span>

              <span>GPU</span>
            </div>

            <div className="hero-item">
              <span className="hero-item__icon">
                <i className="bi bi-memory" />
              </span>

              <span>RAM</span>
            </div>

            <div className="hero-item">
              <span className="hero-item__icon">
                <i className="bi bi-pc-display" />
              </span>

              <span>Build PC</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BlogHero;
