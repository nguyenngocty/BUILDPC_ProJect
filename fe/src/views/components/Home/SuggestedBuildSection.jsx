import SectionTitle from "./SectionTitle";

function SuggestedBuildSection({ builds }) {
  return (
    <section className="build-showcase">
      <SectionTitle title="Cấu hình PC gợi ý" />

      <div className="build-showcase__grid">
        {builds.map((item, index) => (
          <article className="build-card" key={index}>
            <div className="build-card__image">
              <img src={item.img} alt={item.title} />

              <span className="build-card__badge">Best Build</span>
            </div>

            <div className="build-card__content">
              <h3 className="build-card__title">{item.title}</h3>

              <p className="build-card__description">{item.desc}</p>

              <div className="build-card__footer">
                <div className="build-card__price">{item.price}</div>

                <div className="build-card__buttons">
                  <button className="build-card__button build-card__button--outline">
                    <i className="bi bi-eye"></i>
                    Chi tiết
                  </button>

                  <button className="build-card__button build-card__button--primary">
                    <i className="bi bi-sliders"></i>
                    Tùy chỉnh
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default SuggestedBuildSection;
