import { Link } from "react-router-dom";

import SectionTitle from "./SectionTitle";

// ============================================================
// BUILD INTENTS
//
// Đây KHÔNG phải cấu hình sản phẩm cố định.
// Chỉ là các hướng nhu cầu để đưa người dùng vào Build PC.
// ============================================================

const buildSuggestions = [
  {
    id: "gaming",
    icon: "bi-controller",
    label: "Gaming",
    title: "PC Gaming",
    description:
      "Ưu tiên hiệu năng CPU và GPU để chơi game ổn định ở độ phân giải phù hợp.",
    tags: ["Gaming", "FPS", "AAA"],
  },
  {
    id: "office",
    icon: "bi-briefcase",
    label: "Học tập & công việc",
    title: "PC Văn phòng",
    description:
      "Tập trung vào độ ổn định, khả năng đa nhiệm và chi phí hợp lý cho công việc hằng ngày.",
    tags: ["Office", "Học tập", "Đa nhiệm"],
  },
  {
    id: "creator",
    icon: "bi-bezier2",
    label: "Creator",
    title: "PC Đồ họa",
    description:
      "Phù hợp cho thiết kế, dựng video và các tác vụ sáng tạo cần hiệu năng xử lý cao.",
    tags: ["Design", "Video", "Render"],
  },
  {
    id: "performance",
    icon: "bi-speedometer2",
    label: "Hiệu năng cao",
    title: "PC Workstation",
    description:
      "Hướng đến những tác vụ nặng cần CPU, RAM và khả năng xử lý liên tục trong thời gian dài.",
    tags: ["Workstation", "Render", "Hiệu năng"],
  },
];

// ============================================================
// COMPONENT
// ============================================================

function SuggestedBuildSection() {
  return (
    <section className="client-home-build-suggestions">
      <SectionTitle
        eyebrow="GỢI Ý NHU CẦU"
        title="Bạn đang muốn build PC để làm gì?"
        description="Chọn nhu cầu gần nhất với bạn rồi sử dụng công cụ Build PC để tự lựa chọn linh kiện và kiểm tra cấu hình."
        link="/build-pc"
        linkText="Mở PC Builder"
      />

      <div className="client-home-build-suggestions__grid">
        {buildSuggestions.map((item, index) => (
          <article className="client-home-build-suggestion-card" key={item.id}>
            <div className="client-home-build-suggestion-card__top">
              <span className="client-home-build-suggestion-card__number">
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className="client-home-build-suggestion-card__icon">
                <i className={`bi ${item.icon}`} />
              </span>
            </div>

            <div className="client-home-build-suggestion-card__content">
              <span className="client-home-build-suggestion-card__label">
                {item.label}
              </span>

              <h3>{item.title}</h3>

              <p>{item.description}</p>

              <div className="client-home-build-suggestion-card__tags">
                {item.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>

            <Link
              to="/build-pc"
              className="client-home-build-suggestion-card__action"
              aria-label={`Build ${item.title}`}
            >
              <span>Bắt đầu cấu hình</span>

              <i className="bi bi-arrow-up-right" />
            </Link>
          </article>
        ))}
      </div>

      <div className="client-home-build-suggestions__notice">
        <span className="client-home-build-suggestions__notice-icon">
          <i className="bi bi-info-circle" />
        </span>

        <p>
          Các mục phía trên chỉ là định hướng nhu cầu. Giá và linh kiện thực tế
          chỉ được xác định sau khi bạn lựa chọn trong công cụ Build PC.
        </p>
      </div>
    </section>
  );
}

export default SuggestedBuildSection;
