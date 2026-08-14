import { Link } from "react-router-dom";

function AboutHero({ data }) {
  return (
    <section className="about-hero">
      <div className="about-hero-container">
        {/* LEFT */}

        <div className="about-hero-content">
          <span className="about-hero-badge">
            <i className="bi bi-cpu-fill"></i>
            {data.badge}
          </span>

          <h1 className="about-hero-title">
            {data.title}
            <span>{data.highlight}</span>
          </h1>

          <p className="about-hero-description">{data.description}</p>

          <div className="about-hero-buttons">
            <Link to="/products" className="about-btn about-btn-primary">
              Khám phá sản phẩm
            </Link>

            <Link to="/buildpc" className="about-btn about-btn-outline">
              Build PC
            </Link>
          </div>
        </div>

        {/* RIGHT */}

        <div className="about-hero-image">
          <div className="about-image-card">
            <img src={data.image} alt={data.title} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutHero;
