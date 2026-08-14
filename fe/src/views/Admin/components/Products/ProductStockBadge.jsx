function ProductStockBadge({ remaining }) {
  let className = "normal";
  let text = "Còn hàng";

  if (remaining <= 0) {
    className = "danger";
    text = "Hết hàng";
  } else if (remaining <= 5) {
    className = "warning";
    text = "Sắp hết";
  }

  return (
    <span className={`pm-stock-badge ${className}`}>
      {remaining}
      <small>{text}</small>
    </span>
  );
}

export default ProductStockBadge;
