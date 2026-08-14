import { Link } from "react-router-dom";

function PopularPosts({ blogs }) {
  if (!blogs || blogs.length === 0) return null;

  return (
    <section className="bp-popular">
      <div className="bp-popular__header">
        <h3 className="bp-popular__title">
          <i className="bi bi-fire"></i>
          Được xem nhiều
        </h3>
      </div>

      <div className="bp-popular__list">
        {blogs.map((item, index) => (
          <Link
            key={item.id}
            to={`/blog/${item.id}`}
            className="bp-popular__item"
          >
            <div className="bp-popular__thumbnail">
              <img
                src={item.image}
                alt={item.title}
                onError={(e) => {
                  e.target.src =
                    "https://placehold.co/120x90?text=No+Image";
                }}
              />

              <span className="bp-popular__rank">
                {index + 1}
              </span>
            </div>

            <div className="bp-popular__content">
              <h4>{item.title}</h4>

              <div className="bp-popular__meta">
                <span>
                  <i className="bi bi-eye"></i>
                  {item.views || 0}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default PopularPosts;