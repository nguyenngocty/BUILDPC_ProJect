function AboutProcess() {
  return (
    <section className="about-process">
      <div className="about-process-container">
        <div className="about-section-title">
          <span className="about-section-tag">QUY TRÌNH</span>

          <h2>Quy trình xây dựng cấu hình tại BuildPC</h2>

          <p>
            Chúng tôi tối ưu toàn bộ quy trình từ tư vấn đến giao hàng, giúp
            khách hàng tiết kiệm thời gian và lựa chọn đúng cấu hình.
          </p>
        </div>

        <div className="about-process-grid">
          <div className="about-process-item">
            <div className="about-process-number">01</div>

            <i className="bi bi-chat-dots"></i>

            <h3>Tư vấn</h3>

            <p>Tiếp nhận nhu cầu sử dụng và ngân sách của khách hàng.</p>
          </div>

          <div className="about-process-item">
            <div className="about-process-number">02</div>

            <i className="bi bi-cpu"></i>

            <h3>Chọn linh kiện</h3>

            <p>Đề xuất cấu hình tối ưu và đảm bảo khả năng tương thích.</p>
          </div>

          <div className="about-process-item">
            <div className="about-process-number">03</div>

            <i className="bi bi-tools"></i>

            <h3>Lắp ráp</h3>

            <p>Kiểm tra, lắp ráp và chạy thử toàn bộ hệ thống.</p>
          </div>

          <div className="about-process-item">
            <div className="about-process-number">04</div>

            <i className="bi bi-truck"></i>

            <h3>Giao hàng</h3>

            <p>Đóng gói cẩn thận và hỗ trợ khách hàng sau bán hàng.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutProcess;
