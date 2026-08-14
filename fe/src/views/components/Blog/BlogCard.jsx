import { Link } from "react-router-dom";

function BlogCard({ blog }) {
  return (
    <article className="bp-blog-card">
      <Link
        to={`/blog/${blog.id}`}
        className="bp-blog-card__image"
      >
        <img
          src={blog.image}
          alt={blog.title}
          onError={(e) => {
            e.target.src =
              "https://placehold.co/600x400?text=No+Image";
          }}
        />

        <span className="bp-blog-card__category">
          {blog.category}
        </span>
      </Link>

      <div className="bp-blog-card__body">
        <div className="bp-blog-card__meta">
          <span>
            <i className="bi bi-calendar3"></i>
            {blog.date}
          </span>

          <span>
            <i className="bi bi-eye"></i>
            {blog.views}
          </span>
        </div>

        <h3 className="bp-blog-card__title">
          {blog.title}
        </h3>

        <p className="bp-blog-card__desc">
          {blog.desc?.length > 120
            ? blog.desc.substring(0, 120) + "..."
            : blog.desc}
        </p>

        <Link
          to={`/blog/${blog.id}`}
          className="bp-blog-card__button"
        >
          Đọc tiếp
          <i className="bi bi-arrow-right"></i>
        </Link>
      </div>
    </article>
  );
}

export default BlogCard;