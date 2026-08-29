import { Link } from "react-router-dom";

import SectionTitle from "./SectionTitle";

import { API_ORIGIN } from "../../../utils/productClient";

// ============================================================
// CATEGORY ICON
// ============================================================

const getCategoryIcon = (category) => {
  const value = `${category?.name || ""} ${category?.slug || ""}`.toLowerCase();

  if (value.includes("cpu")) {
    return "bi-cpu";
  }

  if (value.includes("mainboard") || value.includes("motherboard")) {
    return "bi-motherboard";
  }

  if (value.includes("ram")) {
    return "bi-memory";
  }

  if (
    value.includes("gpu") ||
    value.includes("vga") ||
    value.includes("card-do-hoa") ||
    value.includes("card đồ họa")
  ) {
    return "bi-gpu-card";
  }

  if (
    value.includes("ssd") ||
    value.includes("hdd") ||
    value.includes("storage") ||
    value.includes("o-cung") ||
    value.includes("ổ cứng")
  ) {
    return "bi-device-ssd";
  }

  if (
    value.includes("nguon") ||
    value.includes("nguồn") ||
    value.includes("power") ||
    value.includes("psu")
  ) {
    return "bi-lightning-charge";
  }

  if (
    value.includes("tan-nhiet") ||
    value.includes("tản nhiệt") ||
    value.includes("cooler") ||
    value.includes("cooling")
  ) {
    return "bi-fan";
  }

  if (
    value.includes("case") ||
    value.includes("vo-may") ||
    value.includes("vỏ máy")
  ) {
    return "bi-pc-display";
  }

  if (value.includes("keyboard")) {
    return "bi-keyboard";
  }

  if (value.includes("headphone") || value.includes("headset")) {
    return "bi-headset";
  }

  return "bi-grid";
};

// ============================================================
// IMAGE
// ============================================================

const getCategoryImageUrl = (image) => {
  if (!image) {
    return "";
  }

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  return `${API_ORIGIN}${image.startsWith("/") ? "" : "/"}${image}`;
};

// ============================================================
// SKELETON
// ============================================================

const CategorySkeleton = ({ index }) => {
  return (
    <div
      className="client-home-category-card client-home-category-card--skeleton"
      aria-hidden="true"
      key={`category-skeleton-${index}`}
    >
      <div className="client-home-skeleton client-home-category-card__skeleton-icon" />

      <div className="client-home-category-card__body">
        <div className="client-home-skeleton client-home-category-card__skeleton-title" />

        <div className="client-home-skeleton client-home-category-card__skeleton-count" />
      </div>
    </div>
  );
};

// ============================================================
// COMPONENT
// ============================================================

function CategorySection({ categories = [], loading = false, error = "" }) {
  return (
    <section className="client-home-category-section">
      <SectionTitle
        eyebrow="DANH MỤC"
        title="Danh mục linh kiện nổi bật"
        description="Khám phá nhanh các nhóm linh kiện đang được kinh doanh trên hệ thống."
        link="/products"
        linkText="Xem tất cả sản phẩm"
      />

      {loading && (
        <div className="client-home-category-grid">
          {Array.from({ length: 8 }).map((_, index) => (
            <CategorySkeleton key={index} index={index} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="client-home-section-state client-home-section-state--error">
          <span className="client-home-section-state__icon">
            <i className="bi bi-exclamation-triangle" />
          </span>

          <div>
            <strong>Không thể tải danh mục</strong>

            <p>{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && categories.length === 0 && (
        <div className="client-home-section-state">
          <span className="client-home-section-state__icon">
            <i className="bi bi-grid" />
          </span>

          <div>
            <strong>Chưa có danh mục sản phẩm</strong>

            <p>
              Danh mục sẽ xuất hiện khi Admin bật hiển thị và có sản phẩm đang
              hoạt động.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && categories.length > 0 && (
        <div className="client-home-category-grid">
          {categories.map((category) => {
            const categoryId = Number(category.id);

            const slug = String(category.slug || "").trim();

            const imageUrl = getCategoryImageUrl(category.image);

            const productCount = Math.max(
              Number(category.product_count || 0),
              0,
            );

            const categoryUrl = slug
              ? `/products?category=${encodeURIComponent(slug)}`
              : "/products";

            return (
              <Link
                key={categoryId || slug || category.name}
                to={categoryUrl}
                className="client-home-category-card"
              >
                <div className="client-home-category-card__visual">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={category.name || "Danh mục sản phẩm"}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";

                        const fallback = event.currentTarget.nextElementSibling;

                        if (fallback) {
                          fallback.style.display = "grid";
                        }
                      }}
                    />
                  ) : null}

                  <span
                    className="client-home-category-card__icon"
                    style={{
                      display: imageUrl ? "none" : "grid",
                    }}
                  >
                    <i className={`bi ${getCategoryIcon(category)}`} />
                  </span>
                </div>

                <div className="client-home-category-card__body">
                  <h3>{category.name}</h3>

                  <p>{productCount.toLocaleString("vi-VN")} sản phẩm</p>
                </div>

                <span className="client-home-category-card__arrow">
                  <i className="bi bi-arrow-up-right" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default CategorySection;
