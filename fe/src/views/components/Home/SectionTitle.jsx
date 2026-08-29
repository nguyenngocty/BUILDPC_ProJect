import { Link } from "react-router-dom";

function SectionTitle({
  eyebrow = "",
  title,
  description = "",
  link = "",
  linkText = "Xem tất cả",
}) {
  if (!title) {
    return null;
  }

  return (
    <div className="client-home-section-heading">
      <div className="client-home-section-heading__content">
        {eyebrow && (
          <span className="client-home-section-heading__eyebrow">
            {eyebrow}
          </span>
        )}

        <h2 className="client-home-section-heading__title">{title}</h2>

        {description && (
          <p className="client-home-section-heading__description">
            {description}
          </p>
        )}
      </div>

      {link && (
        <Link to={link} className="client-home-section-heading__link">
          <span>{linkText}</span>

          <i className="bi bi-arrow-right" />
        </Link>
      )}
    </div>
  );
}

export default SectionTitle;
