import { Link } from "react-router-dom";

function FeaturedPosts({ blogs }) {
  if (!blogs || blogs.length === 0) return null;

  const mainPost = blogs[0];
  const sidePosts = blogs.slice(1, 3);

  return (
    <section className="bp-featured">
      <div className="bp-featured__header">
        <div>
          <span className="bp-featured__label">
            <i className="bi bi-stars"></i>
            Featured
          </span>

          <h2>Bài viết nổi bật</h2>

          <p>
            Những bài viết mới nhất từ BuildPC.
          </p>
        </div>
      </div>

      <div className="bp-featured__layout">

        {/* Bài chính */}

        <Link
          to={`/blog/${mainPost.id}`}
          className="bp-featured__main"
        >
          <div className="bp-featured__image">
            <img
              src={mainPost.image}
              alt={mainPost.title}
              onError={(e) => {
                e.target.src =
                  "https://placehold.co/800x500?text=No+Image";
              }}
            />
          </div>

          <div className="bp-featured__overlay">
            <span className="bp-featured__category">
              {mainPost.category}
            </span>

            <h3>{mainPost.title}</h3>

            <p>
              {mainPost.desc?.length > 150
                ? mainPost.desc.substring(0, 150) + "..."
                : mainPost.desc}
            </p>
          </div>
        </Link>

        {/* Hai bài bên phải */}

        <div className="bp-featured__sidebar">
          {sidePosts.map((item) => (
            <Link
              key={item.id}
              to={`/blog/${item.id}`}
              className="bp-featured__card"
            >
              <div className="bp-featured__image">
                <img
                  src={item.image}
                  alt={item.title}
                  onError={(e) => {
                    e.target.src =
                      "https://placehold.co/500x300?text=No+Image";
                  }}
                />
              </div>

              <div className="bp-featured__overlay">
                <span className="bp-featured__category">
                  {item.category}
                </span>

                <h4>{item.title}</h4>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}

export default FeaturedPosts;