import { Link } from "react-router-dom";

function BlogCard({ blog }) {
  const description =
    blog.desc ||
    "Khám phá nội dung, kiến thức và kinh nghiệm hữu ích từ BuildPC.";

  return (
    <article className="bp-blog-card">
      <Link to={`/blog/${blog.id}`} className="bp-blog-card__image">
        <img
          src={blog.image}
          alt={blog.title}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = "/images/no-image.png";
          }}
        />

        <span className="bp-blog-card__category">{blog.category}</span>
      </Link>

      <div className="bp-blog-card__body">
        <div className="bp-blog-card__meta">
          <span>
            <i className="bi bi-calendar3" />

            {blog.date}
          </span>

          <span>
            <i className="bi bi-eye" />

            {Number(blog.views || 0).toLocaleString("vi-VN")}
          </span>
        </div>

        <h3 className="bp-blog-card__title">
          <Link to={`/blog/${blog.id}`}>{blog.title}</Link>
        </h3>

        <p className="bp-blog-card__desc">
          {description.length > 120
            ? `${description.substring(0, 120)}...`
            : description}
        </p>

        <Link to={`/blog/${blog.id}`} className="bp-blog-card__button">
          <span>Đọc bài viết</span>

          <i className="bi bi-arrow-right" />
        </Link>
      </div>
    </article>
  );
}

export default BlogCard;
