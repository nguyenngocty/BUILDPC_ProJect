import { useState } from "react";

import toast from "react-hot-toast";

import { createProductComment } from "../../../services/commentService";

import { sanitizeRichTextHtml, isRichTextEmpty } from "../../../utils/richText";

import "../RichText/RichTextEditor.css";

function ProductTabs({
  product,
  specifications = [],
  rating,
  reviews = [],
  isAuthenticated,  
  onReviewSubmitted,
}) {
  const [activeTab, setActiveTab] = useState("description");

  // ============================================================
  // REVIEW STATE
  // ============================================================

  const [reviewRating, setReviewRating] = useState(0);

  const [reviewContent, setReviewContent] = useState("");

  const [submitLoading, setSubmitLoading] = useState(false);

  // ============================================================
  // SUBMIT REVIEW
  // ============================================================

  const handleSubmitReview = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để đánh giá sản phẩm.");

      return;
    }

    if (reviewRating === 0) {
      toast.error("Vui lòng chọn số sao đánh giá.");

      return;
    }

    if (reviewContent.trim() === "") {
      toast.error("Vui lòng nhập nội dung đánh giá.");

      return;
    }

    try {
      setSubmitLoading(true);

      await createProductComment({
        product_id: product.id,

        rating: reviewRating,

        content: reviewContent,
      });

      toast.success("Gửi đánh giá thành công! Chờ admin duyệt nhé.");

      setReviewRating(0);

      setReviewContent("");

      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (error) {
      console.error(error);

      toast.error(
        error?.response?.data?.message || "Có lỗi xảy ra khi gửi đánh giá.",
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  // ============================================================
  // DESCRIPTION
  // ============================================================

  const descriptionHtml = !isRichTextEmpty(product?.description)
    ? sanitizeRichTextHtml(product.description)
    : "";

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <section className="product-tabs">
      {/* =======================================================
          TAB NAVIGATION
          ======================================================= */}

      <div className="product-tabs-nav">
        <button
          type="button"
          className={`product-tab-button ${
            activeTab === "description" ? "is-active" : ""
          }`}
          onClick={() => setActiveTab("description")}
        >
          <i className="bi bi-file-text" />

          <span>Mô tả</span>
        </button>

        <button
          type="button"
          className={`product-tab-button ${
            activeTab === "specifications" ? "is-active" : ""
          }`}
          onClick={() => setActiveTab("specifications")}
        >
          <i className="bi bi-cpu" />

          <span>Thông số</span>
        </button>

        <button
          type="button"
          className={`product-tab-button ${
            activeTab === "reviews" ? "is-active" : ""
          }`}
          onClick={() => setActiveTab("reviews")}
        >
          <i className="bi bi-chat-dots" />

          <span>Đánh giá ({Number(rating?.total || reviews.length || 0)})</span>
        </button>
      </div>

      {/* =======================================================
          TAB BODY
          ======================================================= */}

      <div className="product-tabs-body">
        {/* =====================================================
            DESCRIPTION
            ===================================================== */}

        {activeTab === "description" && (
          <div className="description-content">
            {descriptionHtml ? (
              <div
                className="product-rich-description"
                dangerouslySetInnerHTML={{
                  __html: descriptionHtml,
                }}
              />
            ) : (
              <div className="pd-empty-content">
                Chưa có mô tả cho sản phẩm này.
              </div>
            )}
          </div>
        )}

        {/* =====================================================
            SPECIFICATIONS
            ===================================================== */}

        {activeTab === "specifications" && (
          <>
            {specifications.length > 0 ? (
              <div className="specification-list">
                {specifications.map((item, index) => (
                  <div
                    className="specification-row"
                    key={item.id ?? `${item.spec_key}-${index}`}
                  >
                    <span>{item.spec_key}</span>

                    <span>{item.spec_value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pd-empty-content">
                Sản phẩm chưa có thông số kỹ thuật.
              </div>
            )}
          </>
        )}

        {/* =====================================================
            REVIEWS
            ===================================================== */}

        {activeTab === "reviews" && (
          <div className="review-section">
            {/* =================================================
                REVIEW FORM
                ================================================= */}

            {isAuthenticated ? (
              <div
                className="review-form-container"
                style={{
                  marginBottom: "24px",

                  padding: "16px",

                  border: "1px solid #e5e7eb",

                  borderRadius: "12px",

                  background: "#fafafa",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 12px 0",

                    fontSize: "15px",

                    fontWeight: "700",

                    color: "#1f2937",
                  }}
                >
                  Viết đánh giá của bạn
                </h4>

                <form onSubmit={handleSubmitReview}>
                  <div
                    className="rating-input"
                    style={{
                      display: "flex",

                      alignItems: "center",

                      gap: "12px",

                      marginBottom: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: "600",

                        fontSize: "14px",
                      }}
                    >
                      Chất lượng:
                    </span>

                    <div
                      className="stars-selector"
                      style={{
                        display: "flex",

                        gap: "4px",
                      }}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <i
                          key={star}
                          className={`bi ${
                            star <= reviewRating ? "bi-star-fill" : "bi-star"
                          }`}
                          style={{
                            cursor: "pointer",

                            fontSize: "22px",

                            color: star <= reviewRating ? "#fbbf24" : "#d1d5db",

                            transition: "color 0.2s",
                          }}
                          onClick={() => setReviewRating(star)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="review-content-input">
                    <textarea
                      rows="3"
                      placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
                      value={reviewContent}
                      onChange={(event) => setReviewContent(event.target.value)}
                      style={{
                        width: "100%",

                        padding: "10px",

                        border: "1px solid #d1d5db",

                        borderRadius: "8px",

                        outline: "none",

                        fontSize: "14px",

                        resize: "vertical",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitLoading}
                    style={{
                      marginTop: "12px",

                      padding: "10px 24px",

                      border: "none",

                      borderRadius: "8px",

                      background: "#ef233c",

                      color: "#fff",

                      fontWeight: "600",

                      fontSize: "14px",

                      cursor: submitLoading ? "not-allowed" : "pointer",

                      opacity: submitLoading ? 0.7 : 1,

                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(event) => {
                      if (!submitLoading) {
                        event.currentTarget.style.background = "#c9182b";
                      }
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = "#ef233c";
                    }}
                  >
                    {submitLoading ? "Đang gửi..." : "Gửi đánh giá"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="review-login-box">
                <div className="review-login-icon">
                  <i className="bi bi-person-lock" />
                </div>

                <h3>Đăng nhập để đánh giá sản phẩm</h3>

                <p>
                  Chỉ khách hàng đã mua và hoàn thành đơn hàng mới có thể gửi
                  đánh giá.
                </p>
              </div>
            )}

            {/* =================================================
                REVIEW SUMMARY
                ================================================= */}

            <div className="review-summary">
              <div className="review-summary-score">
                <strong>{Number(rating?.average || 0).toFixed(1)}</strong>

                <span>/ 5</span>
              </div>

              <div>
                <div className="review-stars">
                  {Array.from({
                    length: 5,
                  }).map((_, index) => (
                    <i
                      key={index}
                      className={`bi ${
                        index < Math.round(Number(rating?.average || 0))
                          ? "bi-star-fill"
                          : "bi-star"
                      }`}
                    />
                  ))}
                </div>

                <p>
                  Dựa trên {Number(rating?.total || reviews.length || 0)} đánh
                  giá.
                </p>
              </div>
            </div>

            {/* =================================================
                REVIEW LIST
                ================================================= */}

            <div className="review-list">
              {reviews.length > 0 ? (
                reviews.map((review, index) => {
                  const name =
                    review.user_name ||
                    review.full_name ||
                    review.name ||
                    "Khách hàng";

                  const score = Number(review.rating || review.score || 0);

                  const comment =
                    review.comment || review.content || review.review || "";

                  return (
                    <article className="review-card" key={review.id ?? index}>
                      <div className="review-avatar">
                        {name.charAt(0).toUpperCase()}
                      </div>

                      <div className="review-content">
                        <div className="review-header">
                          <div>
                            <h4>{name}</h4>

                            {review.verified_purchase && (
                              <span className="review-verified">
                                <i className="bi bi-patch-check-fill" /> Đã mua
                                hàng
                              </span>
                            )}
                          </div>

                          <div className="review-stars">
                            {Array.from({
                              length: 5,
                            }).map((_, star) => (
                              <i
                                key={star}
                                className={`bi ${
                                  star < score ? "bi-star-fill" : "bi-star"
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <p>{comment}</p>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="review-empty">
                  <i className="bi bi-chat-square-text" />

                  <h4>Chưa có đánh giá nào</h4>

                  <p>
                    Hãy là khách hàng đầu tiên chia sẻ trải nghiệm sau khi mua
                    sản phẩm.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default ProductTabs;
