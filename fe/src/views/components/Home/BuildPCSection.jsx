function BuildPCSection() {
  const components = [
    {
      icon: "bi-cpu",
      title: "CPU",
      name: "Intel Core Ultra 7 265K",
    },
    {
      icon: "bi-motherboard",
      title: "Mainboard",
      name: "MSI Z890 Gaming Plus WIFI",
    },
    {
      icon: "bi-gpu-card",
      title: "Card đồ họa",
      name: "RTX 5070 12GB GDDR7",
    },
    {
      icon: "bi-memory",
      title: "RAM",
      name: "Corsair DDR5 32GB 6000MHz",
    },
    {
      icon: "bi-device-ssd",
      title: "SSD",
      name: "Samsung 990 PRO 1TB NVMe",
    },
    {
      icon: "bi-plugin",
      title: "Nguồn",
      name: "Corsair RM850e 850W Gold",
    },
  ];

  return (
    <section className="configurator">
      <div className="configurator__header">
        <div>
          <span className="configurator__label">Build PC</span>

          <h2 className="configurator__title">Xây dựng cấu hình PC của bạn</h2>

          <p className="configurator__subtitle">
            Lựa chọn linh kiện theo nhu cầu. Hệ thống sẽ tự kiểm tra khả năng
            tương thích và tính tổng chi phí theo thời gian thực.
          </p>
        </div>

        <button className="configurator__start">
          <i className="bi bi-magic"></i>
          Build tự động
        </button>
      </div>

      <div className="configurator__grid">
        {components.map((item, index) => (
          <article className="configurator-card" key={index}>
            <div className="configurator-card__icon">
              <i className={`bi ${item.icon}`}></i>
            </div>

            <div className="configurator-card__body">
              <span className="configurator-card__type">{item.title}</span>

              <h4 className="configurator-card__name">{item.name}</h4>
            </div>

            <button className="configurator-card__button">
              <i className="bi bi-arrow-repeat"></i>
              Thay đổi
            </button>
          </article>
        ))}
      </div>

      <div className="configurator-summary">
        <div className="configurator-summary__left">
          <div className="summary-item">
            <span>Tổng giá dự kiến</span>

            <strong>34.990.000đ</strong>
          </div>

          <div className="summary-item">
            <span>Công suất đề xuất</span>

            <strong>850W Gold</strong>
          </div>

          <div className="summary-item">
            <span>Khả năng tương thích</span>

            <strong>100%</strong>
          </div>
        </div>

        <div className="configurator-summary__right">
          <button className="summary-btn1 summary-btn1--outline">
            <i className="bi bi-heart"></i>
            Lưu cấu hình
          </button>

          <button className="summary-btn1 summary-btn1--primary">
            <i className="bi bi-cart-check"></i>
            Xem chi tiết
          </button>
        </div>
      </div>
    </section>
  );
}

export default BuildPCSection;
