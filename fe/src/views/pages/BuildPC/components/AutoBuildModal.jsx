import React, { useEffect, useMemo, useState } from "react";

const DEFAULT_USAGES = [
  {
    value: "office",
    label: "Văn phòng",
    description: "Học tập, làm việc và tác vụ văn phòng.",
    icon: "bi-briefcase",
  },
  {
    value: "gaming",
    label: "Gaming",
    description: "Ưu tiên hiệu năng chơi game và card đồ họa.",
    icon: "bi-controller",
  },
  {
    value: "design",
    label: "Đồ họa",
    description: "Thiết kế, dựng video và công việc sáng tạo.",
    icon: "bi-palette",
  },
];

const formatPrice = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0đ";
  }

  return `${Math.round(number).toLocaleString("vi-VN")}đ`;
};

const normalizeUsageOptions = (options) => {
  if (!Array.isArray(options) || options.length === 0) {
    return DEFAULT_USAGES;
  }

  return options.map((option) => {
    if (typeof option === "string") {
      const fallback = DEFAULT_USAGES.find(
        (item) => item.value === option.toLowerCase(),
      );

      return (
        fallback || {
          value: option.toLowerCase(),
          label: option,
          description: "Cấu hình phù hợp với nhu cầu sử dụng.",
          icon: "bi-pc-display",
        }
      );
    }

    const value = String(
      option.value || option.code || option.usage || "",
    ).toLowerCase();

    const fallback = DEFAULT_USAGES.find((item) => item.value === value);

    return {
      value,
      label: option.label || option.name || fallback?.label || value,
      description:
        option.description ||
        fallback?.description ||
        "Cấu hình phù hợp với nhu cầu sử dụng.",
      icon: option.icon || fallback?.icon || "bi-pc-display",
    };
  });
};

const AutoBuildModal = ({
  open,
  options = [],
  loadingOptions = false,
  generating = false,
  onClose,
  onGenerate,
}) => {
  const usages = useMemo(() => normalizeUsageOptions(options), [options]);

  const [usage, setUsage] = useState("gaming");
  const [budget, setBudget] = useState(30000000);
  const [budgetInput, setBudgetInput] = useState("30.000.000");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setUsage(usages[0]?.value || "gaming");

    const gamingExists = usages.some((item) => item.value === "gaming");

    if (gamingExists) {
      setUsage("gaming");
    }

    setBudget(30000000);
    setBudgetInput("30.000.000");
    setError("");
  }, [open, usages]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !generating) {
        onClose?.();
      }
    };

    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;

      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, generating, onClose]);

  const handleBudgetChange = (event) => {
    const raw = String(event.target.value || "");

    const numeric = Number(raw.replace(/\D/g, ""));

    if (!Number.isFinite(numeric)) {
      setBudget(0);
      setBudgetInput("");
      return;
    }

    setBudget(numeric);

    setBudgetInput(numeric > 0 ? numeric.toLocaleString("vi-VN") : "");

    setError("");
  };

  const setQuickBudget = (value) => {
    setBudget(value);
    setBudgetInput(value.toLocaleString("vi-VN"));
    setError("");
  };

  const handleSubmit = async () => {
    if (!usage) {
      setError("Vui lòng chọn nhu cầu sử dụng.");
      return;
    }

    if (!Number.isFinite(budget) || budget < 3000000) {
      setError("Ngân sách tối thiểu là 3.000.000đ.");
      return;
    }

    setError("");

    await onGenerate?.({
      usage,
      budget,
    });
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="client-build-action-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !generating) {
          onClose?.();
        }
      }}
    >
      <section
        className="client-build-auto-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Build PC tự động"
      >
        <header className="client-build-action-modal-header">
          <div>
            <span className="client-build-action-kicker">
              <i className="bi bi-stars" />
              SMART AUTO BUILD
            </span>

            <h2>Để hệ thống gợi ý cấu hình</h2>

            <p>
              Chọn nhu cầu và ngân sách. Hệ thống sẽ tìm cấu hình phù hợp, sau
              đó Backend kiểm tra tương thích lại trước khi trả kết quả.
            </p>
          </div>

          <button
            type="button"
            className="client-build-action-close"
            onClick={onClose}
            disabled={generating}
            aria-label="Đóng"
          >
            <i className="bi bi-x-lg" />
          </button>
        </header>

        <div className="client-build-auto-content">
          <section className="client-build-auto-section">
            <div className="client-build-auto-section-title">
              <span>01</span>

              <div>
                <strong>Nhu cầu sử dụng</strong>
                <small>
                  Mỗi nhu cầu sẽ ưu tiên ngân sách cho các linh kiện khác nhau.
                </small>
              </div>
            </div>

            {loadingOptions ? (
              <div className="client-build-auto-options-loading">
                <div className="client-build-mini-spinner" />
                Đang tải tùy chọn...
              </div>
            ) : (
              <div className="client-build-auto-usage-grid">
                {usages.map((item) => {
                  const active = usage === item.value;

                  return (
                    <button
                      type="button"
                      key={item.value}
                      className={`client-build-auto-usage ${
                        active ? "client-build-auto-usage--active" : ""
                      }`}
                      onClick={() => {
                        setUsage(item.value);
                        setError("");
                      }}
                      disabled={generating}
                    >
                      <span className="client-build-auto-usage-icon">
                        <i className={`bi ${item.icon}`} />
                      </span>

                      <strong>{item.label}</strong>

                      <p>{item.description}</p>

                      <span className="client-build-auto-radio">
                        {active && <i className="bi bi-check-lg" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="client-build-auto-section">
            <div className="client-build-auto-section-title">
              <span>02</span>

              <div>
                <strong>Ngân sách dự kiến</strong>
                <small>
                  Hệ thống sẽ cố gắng tận dụng ngân sách nhưng không vượt quá
                  mức bạn nhập.
                </small>
              </div>
            </div>

            <div className="client-build-budget-box">
              <label className="client-build-budget-input">
                <i className="bi bi-wallet2" />

                <input
                  type="text"
                  inputMode="numeric"
                  value={budgetInput}
                  onChange={handleBudgetChange}
                  disabled={generating}
                  placeholder="30.000.000"
                />

                <span>VNĐ</span>
              </label>

              <div className="client-build-budget-presets">
                {[15000000, 20000000, 30000000, 40000000].map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={
                      budget === value
                        ? "client-build-budget-preset--active"
                        : ""
                    }
                    disabled={generating}
                    onClick={() => setQuickBudget(value)}
                  >
                    {value / 1000000} triệu
                  </button>
                ))}
              </div>

              <div className="client-build-budget-preview">
                <span>Ngân sách hiện tại</span>

                <strong>{formatPrice(budget)}</strong>
              </div>
            </div>
          </section>

          <div className="client-build-auto-info">
            <i className="bi bi-info-circle" />

            <p>
              Đây là thuật toán gợi ý theo ngân sách và khả năng tương thích,
              không phải AI. Giá và tồn kho đều lấy từ dữ liệu hiện tại của hệ
              thống.
            </p>
          </div>

          {error && (
            <div className="client-build-action-error">
              <i className="bi bi-exclamation-circle" />
              {error}
            </div>
          )}
        </div>

        <footer className="client-build-action-footer">
          <button
            type="button"
            className="client-build-action-cancel"
            onClick={onClose}
            disabled={generating}
          >
            Hủy
          </button>

          <button
            type="button"
            className="client-build-action-submit"
            onClick={handleSubmit}
            disabled={generating || loadingOptions}
          >
            {generating ? (
              <>
                <span className="client-build-button-spinner" />
                Đang tìm cấu hình...
              </>
            ) : (
              <>
                <i className="bi bi-stars" />
                Tạo cấu hình tự động
              </>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
};

export default AutoBuildModal;
