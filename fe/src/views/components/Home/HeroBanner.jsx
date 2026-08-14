import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import bannerService from "../../../services/bannerService";

const IMAGE_BASE_URL = "http://localhost:5000";

const getImageUrl = (imageUrl) => {
  if (!imageUrl) return "";

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  return `${IMAGE_BASE_URL}${imageUrl}`;
};

const defaultBanner = {
  title: "Build PC",
  subtitle: "Hiệu năng cho mọi nhu cầu",
  description:
    "Hơn 2.000 linh kiện chính hãng, hỗ trợ Build PC theo yêu cầu, kiểm tra tương thích miễn phí và giao hàng trên toàn quốc.",
  badge_text: "Flash Sale giảm đến 35%",
  link_url: "/products",
  image_url: "",
  primary_button_text: "Khám phá ngay",
  secondary_button_text: "Deal Hot",
  text_color: "#ffffff",
  highlight_color: "#38bdf8",
  overlay_opacity: 0.65,
};

function HeroBanner() {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentBanner = banners[currentIndex] || defaultBanner;
  const bannerImage = getImageUrl(currentBanner.image_url);
  const bannerLink = currentBanner.link_url || "/products";

  const overlayOpacity = Number(currentBanner.overlay_opacity || 0.65);
  const overlayMiddle = Math.max(overlayOpacity - 0.15, 0.1);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await bannerService.getActive({
          position: "HOME",
        });

        setBanners(res.data.data || []);
        setCurrentIndex(0);
      } catch (error) {
        console.error("Lỗi lấy banner trang chủ:", error);
      }
    };

    fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev === banners.length - 1) return 0;
        return prev + 1;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [banners]);

  const handlePrev = () => {
    if (banners.length <= 1) return;

    setCurrentIndex((prev) => {
      if (prev === 0) return banners.length - 1;
      return prev - 1;
    });
  };

  const handleNext = () => {
    if (banners.length <= 1) return;

    setCurrentIndex((prev) => {
      if (prev === banners.length - 1) return 0;
      return prev + 1;
    });
  };

  return (
    <section className="hero">
      {bannerImage && (
        <div className="hero__background">
          <img src={bannerImage} alt={currentBanner.title || "Banner"} />
        </div>
      )}

      <div
        className="hero__overlay"
        style={{
          background: `linear-gradient(
            90deg,
            rgba(8, 13, 25, ${overlayOpacity}) 0%,
            rgba(8, 13, 25, ${overlayMiddle}) 45%,
            rgba(8, 13, 25, 0.12) 100%
          )`,
        }}
      ></div>

      <div className="hero__content">
        <div className="hero__badge">
          <i className="bi bi-lightning-charge-fill"></i>
          {currentBanner.badge_text || defaultBanner.badge_text}
        </div>

        <h1
          className="hero__title"
          style={{
            color: currentBanner.text_color || "#ffffff",
          }}
        >
          {currentBanner.title || defaultBanner.title}

          <span
            style={{
              color: currentBanner.highlight_color || "#38bdf8",
            }}
          >
            {currentBanner.subtitle || defaultBanner.subtitle}
          </span>
        </h1>

        <p className="hero__description">
          {currentBanner.description || defaultBanner.description}
        </p>

        <div className="hero__buttons">
          <Link to={bannerLink} className="hero__primary">
            <i className="bi bi-pc-display-horizontal"></i>
            <span>
              {currentBanner.primary_button_text ||
                defaultBanner.primary_button_text}
            </span>
          </Link>

          <Link to={bannerLink} className="hero__secondary">
            <i className="bi bi-fire"></i>
            <span>
              {currentBanner.secondary_button_text ||
                defaultBanner.secondary_button_text}
            </span>
          </Link>
        </div>

        <div className="hero__info">
          <div>
            <i className="bi bi-shield-check"></i>
            <span>100% Chính hãng</span>
          </div>

          <div>
            <i className="bi bi-truck"></i>
            <span>Giao hàng toàn quốc</span>
          </div>

          <div>
            <i className="bi bi-patch-check"></i>
            <span>Bảo hành đến 36 tháng</span>
          </div>
        </div>

        {banners.length > 1 && (
          <div className="hero__slider">
            <button type="button" onClick={handlePrev}>
              <i className="bi bi-chevron-left"></i>
            </button>

            <div className="hero__dots">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  className={index === currentIndex ? "active" : ""}
                  onClick={() => setCurrentIndex(index)}
                ></button>
              ))}
            </div>

            <button type="button" onClick={handleNext}>
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default HeroBanner;