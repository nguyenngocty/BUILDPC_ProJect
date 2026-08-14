function AboutMission() {
  return (
    <section className="about-mission">
      <div className="about-mission-container">
        <div className="about-section-title">
          <span className="about-section-tag">GIÁ TRỊ DOANH NGHIỆP</span>

          <h2>Sứ mệnh, Tầm nhìn và Giá trị cốt lõi</h2>

          <p>
            Những giá trị định hướng giúp BuildPC phát triển bền vững và mang
            lại trải nghiệm tốt nhất cho khách hàng.
          </p>
        </div>

        <div className="about-mission-grid">
          {/* Mission */}

          <div className="about-mission-card">
            <div className="about-mission-icon">
              <i className="bi bi-bullseye"></i>
            </div>

            <h3>Sứ mệnh</h3>

            <p>
              Mang đến giải pháp lựa chọn và xây dựng cấu hình máy tính tối ưu,
              giúp khách hàng dễ dàng tiếp cận các sản phẩm công nghệ chính hãng
              với chi phí hợp lý.
            </p>
          </div>

          {/* Vision */}

          <div className="about-mission-card">
            <div className="about-mission-icon">
              <i className="bi bi-eye-fill"></i>
            </div>

            <h3>Tầm nhìn</h3>

            <p>
              Trở thành nền tảng Build PC và phân phối linh kiện máy tính đáng
              tin cậy hàng đầu Việt Nam, hướng đến trải nghiệm mua sắm thông
              minh và hiện đại.
            </p>
          </div>

          {/* Core Value */}

          <div className="about-mission-card">
            <div className="about-mission-icon">
              <i className="bi bi-gem"></i>
            </div>

            <h3>Giá trị cốt lõi</h3>

            <p>
              Chính hãng, minh bạch, tận tâm và không ngừng đổi mới để mang đến
              giá trị thực cho khách hàng và cộng đồng yêu công nghệ.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutMission;
