function SectionTitle({ title, link }) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {link && (
        <a href="/">
          {link} <i className="bi bi-arrow-right"></i>
        </a>
      )}
    </div>
  );
}

export default SectionTitle;
