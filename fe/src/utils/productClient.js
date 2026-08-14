export const API_ORIGIN =
  process.env.REACT_APP_API_ORIGIN || "http://localhost:5000";

export const formatPrice = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export const getProductImageUrl = (path) => {
  if (!path) {
    return "/images/no-image.png";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${API_ORIGIN}${path}`;
};

export const getStockLabel = (stockStatus) => {
  switch (stockStatus) {
    case "out_of_stock":
      return "Hết hàng";

    case "low_stock":
      return "Sắp hết hàng";

    default:
      return "Còn hàng";
  }
};

export const getStockClass = (stockStatus) => {
  switch (stockStatus) {
    case "out_of_stock":
      return "is-out-of-stock";

    case "low_stock":
      return "is-low-stock";

    default:
      return "is-in-stock";
  }
};
