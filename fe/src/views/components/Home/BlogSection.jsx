import SectionTitle from "./SectionTitle";

function BlogSection() {
  const blogs = [
    "Cách chọn VGA phù hợp năm 2026",
    "Build PC Gaming dưới 15 triệu",
    "So sánh CPU Intel và AMD",
  ];

  return (
    <>
      <SectionTitle title="Tin tức & Hướng dẫn" />

      <section className="news-section">
        <div className="news-grid">
          {blogs.map((title, index) => (
            <article className="news-card" key={index}>
              <div className="news-card__icon">
                <i className="bi bi-journal-text"></i>
              </div>

              <h3 className="news-card__title">{title}</h3>

              <p className="news-card__desc">
                Hướng dẫn lựa chọn linh kiện, build PC và cập nhật xu hướng công
                nghệ mới nhất dành cho game thủ, sinh viên và người làm việc
                chuyên nghiệp.
              </p>

              <a href="/" className="news-card__link">
                Đọc bài viết
                <i className="bi bi-arrow-right"></i>
              </a>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export default BlogSection;
