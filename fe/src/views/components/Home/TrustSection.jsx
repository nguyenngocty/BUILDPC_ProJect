function TrustSection() {
  const benefits = [
    {
      icon: "bi-shield-check",
      title: "100% Chính hãng",
      desc: "Cam kết sản phẩm chính hãng từ các thương hiệu lớn.",
    },
    {
      icon: "bi-award",
      title: "Bảo hành dài hạn",
      desc: "Bảo hành lên đến 36 tháng theo từng sản phẩm.",
    },
    {
      icon: "bi-truck",
      title: "Giao hàng toàn quốc",
      desc: "Đóng gói cẩn thận và giao nhanh trên toàn quốc.",
    },
    {
      icon: "bi-headset",
      title: "Tư vấn miễn phí",
      desc: "Đội ngũ hỗ trợ Build PC theo đúng nhu cầu sử dụng.",
    },
    {
      icon: "bi-people",
      title: "10.000+ Khách hàng",
      desc: "Được cộng đồng game thủ và designer tin tưởng.",
    },
  ];

  return (
    <section className="service-benefits">
      <div className="service-benefits__header">
        <span className="service-benefits__label">Tại sao chọn chúng tôi</span>

        <h2 className="service-benefits__title">
          Mua linh kiện an tâm - Dịch vụ chuyên nghiệp
        </h2>

        <p className="service-benefits__subtitle">
          Chúng tôi mang đến trải nghiệm mua sắm hiện đại với sản phẩm chính
          hãng, bảo hành minh bạch và đội ngũ hỗ trợ tận tâm.
        </p>
      </div>

      <div className="service-benefits__grid">
        {benefits.map((item, index) => (
          <article className="benefit-card" key={index}>
            <div className="benefit-card__icon">
              <i className={`bi ${item.icon}`}></i>
            </div>

            <h3 className="benefit-card__title">{item.title}</h3>

            <p className="benefit-card__description">{item.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default TrustSection;
