import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import bannerService from "../../../services/bannerService";

import { API_ORIGIN } from "../../../utils/productClient";

// ============================================================
// DEFAULT BANNER
// ============================================================

const defaultBanner = {
  id: "default-home-banner",

  title: "Build PC theo cách của bạn",

  subtitle: "Hiệu năng đúng nhu cầu",

  description:
    "Khám phá linh kiện chính hãng, tự xây dựng cấu hình PC và kiểm tra khả năng tương thích trước khi mua.",

  badge_text: "PC Builder chuyên nghiệp",

  link_url: "/build-pc",

  image_url: "",

  primary_button_text: "Bắt đầu Build PC",

  secondary_button_text: "Xem sản phẩm",

  text_color: "#ffffff",

  highlight_color: "#38bdf8",

  overlay_opacity: 0.68,
};

// ============================================================
// IMAGE
// ============================================================

const getBannerImageUrl = (imageUrl) => {
  if (!imageUrl) {
    return "";
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return `${API_ORIGIN}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
};

// ============================================================
// COMPONENT
// ============================================================

function HeroBanner() {
  const [banners, setBanners] = useState([]);

  const [currentIndex, setCurrentIndex] = useState(0);

  const [loading, setLoading] = useState(true);

  // ==========================================================
  // CURRENT BANNER
  // ==========================================================

  const currentBanner = useMemo(() => {
    return banners[currentIndex] || defaultBanner;
  }, [banners, currentIndex]);

  const bannerImage = getBannerImageUrl(currentBanner.image_url);

  const primaryLink =
    String(currentBanner.link_url || "").trim() || "/build-pc";

  const overlayOpacity = Math.min(
    Math.max(Number(currentBanner.overlay_opacity || 0.68), 0.2),
    0.9,
  );

  const overlayMiddle = Math.max(overlayOpacity - 0.18, 0.15);

  // ==========================================================
  // LOAD BANNERS
  // ==========================================================

  useEffect(() => {
    let active = true;

    const fetchBanners = async () => {
      try {
        setLoading(true);

        const response = await bannerService.getActive({
          position: "HOME",
        });

        if (!active) {
          return;
        }

        const payload = response?.data?.data ?? response?.data ?? [];

        const items = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
            ? payload.items
            : [];

        setBanners(items);

        setCurrentIndex(0);
      } catch (error) {
        console.error("Lỗi lấy banner trang chủ:", error);

        if (active) {
          setBanners([]);
          setCurrentIndex(0);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchBanners();

    return () => {
      active = false;
    };
  }, []);

  // ==========================================================
  // AUTO SLIDE
  // ==========================================================

  useEffect(() => {
    if (banners.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCurrentIndex((previousIndex) => {
        return previousIndex >= banners.length - 1 ? 0 : previousIndex + 1;
      });
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [banners]);

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const handlePrevious = () => {
    if (banners.length <= 1) {
      return;
    }

    setCurrentIndex((previousIndex) => {
      return previousIndex <= 0 ? banners.length - 1 : previousIndex - 1;
    });
  };

  const handleNext = () => {
    if (banners.length <= 1) {
      return;
    }

    setCurrentIndex((previousIndex) => {
      return previousIndex >= banners.length - 1 ? 0 : previousIndex + 1;
    });
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <section
      className={`client-home-hero ${
        loading ? "client-home-hero--loading" : ""
      }`}
    >
      <div className="client-home-hero__background">
        {bannerImage ? (
          <img
            key={bannerImage}
            src={bannerImage}
            alt={currentBanner.title || "Banner trang chủ"}
            className="client-home-hero__background-image"
          />
        ) : (
          <div className="client-home-hero__background-fallback">
            <span className="client-home-hero__background-orb client-home-hero__background-orb--one" />

            <span className="client-home-hero__background-orb client-home-hero__background-orb--two" />

            <i className="bi bi-pc-display-horizontal" />
          </div>
        )}
      </div>

      <div
        className="client-home-hero__overlay"
        style={{
          background: `linear-gradient(
            90deg,
            rgba(8, 13, 25, ${overlayOpacity}) 0%,
            rgba(8, 13, 25, ${overlayMiddle}) 48%,
            rgba(8, 13, 25, 0.18) 100%
          )`,
        }}
      />

      <div className="client-home-hero__inner">
        <div className="client-home-hero__content">
          <div className="client-home-hero__badge">
            <i className="bi bi-lightning-charge-fill" />

            <span>{currentBanner.badge_text || defaultBanner.badge_text}</span>
          </div>

          <h1
            className="client-home-hero__title"
            style={{
              color: currentBanner.text_color || "#ffffff",
            }}
          >
            <span>{currentBanner.title || defaultBanner.title}</span>

            <strong
              style={{
                color:
                  currentBanner.highlight_color ||
                  defaultBanner.highlight_color,
              }}
            >
              {currentBanner.subtitle || defaultBanner.subtitle}
            </strong>
          </h1>

          <p className="client-home-hero__description">
            {currentBanner.description || defaultBanner.description}
          </p>

          <div className="client-home-hero__actions">
            <Link to={primaryLink} className="client-home-hero__primary-action">
              <i className="bi bi-pc-display-horizontal" />

              <span>
                {currentBanner.primary_button_text ||
                  defaultBanner.primary_button_text}
              </span>

              <i className="bi bi-arrow-right" />
            </Link>

            <Link to="/products" className="client-home-hero__secondary-action">
              <i className="bi bi-grid" />

              <span>
                {currentBanner.secondary_button_text ||
                  defaultBanner.secondary_button_text}
              </span>
            </Link>
          </div>

          <div className="client-home-hero__benefits">
            <div>
              <i className="bi bi-shield-check" />

              <span>Chính hãng</span>
            </div>

            <div>
              <i className="bi bi-tools" />

              <span>Build PC linh hoạt</span>
            </div>

            <div>
              <i className="bi bi-truck" />

              <span>Hỗ trợ giao hàng</span>
            </div>
          </div>
        </div>

        <aside className="client-home-hero__builder-card">
          <div className="client-home-hero__builder-card-header">
            <div>
              <span>PC BUILDER</span>

              <strong>Chọn đúng linh kiện</strong>
            </div>

            <i className="bi bi-stars" />
          </div>

          <div className="client-home-hero__builder-checks">
            <div>
              <span>
                <i className="bi bi-cpu" />
              </span>

              <div>
                <strong>CPU & Mainboard</strong>

                <small>Kiểm tra socket</small>
              </div>

              <i className="bi bi-check2-circle" />
            </div>

            <div>
              <span>
                <i className="bi bi-memory" />
              </span>

              <div>
                <strong>RAM & Mainboard</strong>

                <small>Kiểm tra chuẩn RAM</small>
              </div>

              <i className="bi bi-check2-circle" />
            </div>

            <div>
              <span>
                <i className="bi bi-lightning-charge" />
              </span>

              <div>
                <strong>GPU & PSU</strong>

                <small>Kiểm tra công suất nguồn</small>
              </div>

              <i className="bi bi-check2-circle" />
            </div>
          </div>

          <Link to="/build-pc" className="client-home-hero__builder-link">
            <span>Mở công cụ Build PC</span>

            <i className="bi bi-arrow-up-right" />
          </Link>
        </aside>
      </div>

      {banners.length > 1 && (
        <div className="client-home-hero__slider-controls">
          <button
            type="button"
            onClick={handlePrevious}
            aria-label="Banner trước"
          >
            <i className="bi bi-chevron-left" />
          </button>

          <div className="client-home-hero__dots">
            {banners.map((banner, index) => (
              <button
                key={banner.id || index}
                type="button"
                className={
                  index === currentIndex
                    ? "client-home-hero__dot client-home-hero__dot--active"
                    : "client-home-hero__dot"
                }
                onClick={() => setCurrentIndex(index)}
                aria-label={`Xem banner ${index + 1}`}
                aria-current={index === currentIndex ? "true" : undefined}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Banner tiếp theo"
          >
            <i className="bi bi-chevron-right" />
          </button>
        </div>
      )}
    </section>
  );
}

export default HeroBanner;
