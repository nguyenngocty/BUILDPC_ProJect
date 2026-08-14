function AboutCompany() {
  return (
    <section className="about-company">
      <div className="about-company-container">
        {/* Image */}

        <div className="about-company-image">
          <img
            src="https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=1200&auto=format&fit=crop"
            alt="BuildPC Company"
          />
        </div>

        {/* Content */}

        <div className="about-company-content">
          <span className="about-section-tag">GIỚI THIỆU</span>

          <h2>BuildPC - Giải pháp xây dựng cấu hình máy tính toàn diện</h2>

          <p>
            BuildPC được xây dựng với mục tiêu mang đến trải nghiệm lựa chọn và
            lắp ráp máy tính chuyên nghiệp, minh bạch và thuận tiện. Chúng tôi
            cung cấp hệ sinh thái linh kiện chính hãng cùng công cụ Build PC
            giúp người dùng dễ dàng tạo nên cấu hình phù hợp với nhu cầu và ngân
            sách.
          </p>

          <p>
            Không chỉ là một website bán linh kiện, BuildPC còn là nơi cung cấp
            kiến thức, tư vấn cấu hình và đồng hành cùng khách hàng trong suốt
            quá trình sử dụng sản phẩm.
          </p>

          <div className="about-company-list">
            <div className="about-company-item">
              <i className="bi bi-check-circle-fill"></i>
              <span>Linh kiện chính hãng 100%</span>
            </div>

            <div className="about-company-item">
              <i className="bi bi-check-circle-fill"></i>
              <span>Tư vấn cấu hình theo nhu cầu</span>
            </div>

            <div className="about-company-item">
              <i className="bi bi-check-circle-fill"></i>
              <span>Giá bán minh bạch - cạnh tranh</span>
            </div>

            <div className="about-company-item">
              <i className="bi bi-check-circle-fill"></i>
              <span>Hỗ trợ kỹ thuật tận tâm</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutCompany;
