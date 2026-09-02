import { useCallback, useEffect, useState } from "react";

import toast from "react-hot-toast";

import {
  createProductComment,
  deleteProductComment,
  getMyProductReview,
  updateProductComment,
} from "../../../services/commentService";

import { sanitizeRichTextHtml, isRichTextEmpty } from "../../../utils/richText";

import "../RichText/RichTextEditor.css";

// ============================================================
// API ORIGIN
// ============================================================

const API_ORIGIN = String(
  process.env.REACT_APP_API_URL || "http://localhost:5000/api",
).replace(/\/api\/?$/, "");

// ============================================================
// AVATAR URL
// ============================================================

const getAvatarUrl = (value) => {
  const avatar = String(value || "").trim();

  if (!avatar) {
    return "";
  }

  if (
    avatar.startsWith("http://") ||
    avatar.startsWith("https://") ||
    avatar.startsWith("data:")
  ) {
    return avatar;
  }

  if (avatar.startsWith("/")) {
    return `${API_ORIGIN}${avatar}`;
  }

  if (avatar.startsWith("uploads/")) {
    return `${API_ORIGIN}/${avatar}`;
  }

  if (avatar.startsWith("avatars/")) {
    return `${API_ORIGIN}/uploads/${avatar}`;
  }

  return `${API_ORIGIN}/uploads/avatars/${avatar}`;
};

// ============================================================
// REVIEW AVATAR
// ============================================================

function ReviewAvatar({ name, avatar }) {
  const [imageError, setImageError] = useState(false);

  const avatarUrl = getAvatarUrl(avatar);

  useEffect(() => {
    setImageError(false);
  }, [avatar]);

  const initial =
    String(name || "K")
      .trim()
      .charAt(0)
      .toUpperCase() || "K";

  return (
    <div
      className="review-avatar"
      style={{
        overflow: "hidden",

        display: "flex",

        alignItems: "center",

        justifyContent: "center",
      }}
    >
      {avatarUrl && !imageError ? (
        <img
          src={avatarUrl}
          alt={name || "Avatar"}
          style={{
            width: "100%",

            height: "100%",

            objectFit: "cover",

            display: "block",
          }}
          onError={() => {
            setImageError(true);
          }}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}

// ============================================================
// STARS
// ============================================================

function ReviewStars({ score = 0 }) {
  const safeScore = Number(score || 0);

  return (
    <div className="review-stars">
      {Array.from({
        length: 5,
      }).map((_, index) => (
        <i
          key={index}
          className={`bi ${index < safeScore ? "bi-star-fill" : "bi-star"}`}
        />
      ))}
    </div>
  );
}

// ============================================================
// PRODUCT TABS
// ============================================================

function ProductTabs({
  product,
  specifications = [],
  rating,
  reviews = [],
  isAuthenticated,
  onReviewSubmitted,
  initialTab = "description",
}) {
  const [activeTab, setActiveTab] = useState("description");

  useEffect(() => {
    if (["description", "specifications", "reviews"].includes(initialTab)) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // ==========================================================
  // REVIEW FORM
  // ==========================================================

  const [reviewRating, setReviewRating] = useState(0);

  const [reviewContent, setReviewContent] = useState("");

  const [submitLoading, setSubmitLoading] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(false);

  const [editing, setEditing] = useState(false);

  // ==========================================================
  // REVIEW ACCESS
  // ==========================================================

  const [accessLoading, setAccessLoading] = useState(false);

  const [reviewAccess, setReviewAccess] = useState({
    purchased: false,

    has_review: false,

    can_review: false,

    review: null,
  });

  // ==========================================================
  // LOAD MY REVIEW
  // ==========================================================

  const loadReviewAccess = useCallback(async () => {
    if (!isAuthenticated || !product?.id) {
      setReviewAccess({
        purchased: false,

        has_review: false,

        can_review: false,

        review: null,
      });

      setAccessLoading(false);

      return;
    }

    try {
      setAccessLoading(true);

      const response = await getMyProductReview(product.id);

      const data = response?.data?.data || {};

      setReviewAccess({
        purchased: Boolean(data.purchased),

        has_review: Boolean(data.has_review),

        can_review: Boolean(data.can_review),

        review: data.review || null,
      });
    } catch (error) {
      console.error("Load review access:", error);

      setReviewAccess({
        purchased: false,

        has_review: false,

        can_review: false,

        review: null,
      });
    } finally {
      setAccessLoading(false);
    }
  }, [isAuthenticated, product?.id]);

  useEffect(() => {
    loadReviewAccess();
  }, [loadReviewAccess]);

  // ==========================================================
  // RESET FORM
  // ==========================================================

  const resetReviewForm = () => {
    setReviewRating(0);

    setReviewContent("");

    setEditing(false);
  };

  // ==========================================================
  // START EDIT
  // ==========================================================

  const handleStartEdit = () => {
    const currentReview = reviewAccess.review;

    if (!currentReview) {
      return;
    }

    setReviewRating(Number(currentReview.rating || 0));

    setReviewContent(String(currentReview.content || ""));

    setEditing(true);
  };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmitReview = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để đánh giá sản phẩm.");

      return;
    }

    if (!reviewAccess.purchased) {
      toast.error(
        "Bạn chỉ có thể đánh giá sau khi đã mua và hoàn tất đơn hàng.",
      );

      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      toast.error("Vui lòng chọn số sao đánh giá.");

      return;
    }

    const content = reviewContent.trim();

    if (!content) {
      toast.error("Vui lòng nhập nội dung đánh giá.");

      return;
    }

    if (content.length < 3) {
      toast.error("Nội dung đánh giá quá ngắn.");

      return;
    }

    try {
      setSubmitLoading(true);

      // ====================================================
      // UPDATE
      // ====================================================

      if (editing && reviewAccess.review?.id) {
        await updateProductComment(reviewAccess.review.id, {
          rating: reviewRating,

          content,
        });

        toast.success("Đã cập nhật đánh giá.");
      } else {
        // ==================================================
        // CREATE
        // ==================================================

        await createProductComment(product.id, {
          rating: reviewRating,

          content,
        });

        toast.success("Đánh giá sản phẩm thành công.");
      }

      resetReviewForm();

      await loadReviewAccess();

      if (onReviewSubmitted) {
        await onReviewSubmitted();
      }
    } catch (error) {
      console.error("Submit review:", error);

      toast.error(
        error?.response?.data?.message || "Có lỗi xảy ra khi lưu đánh giá.",
      );

      /*
       * Nếu backend báo đã có review
       * thì refresh access ngay.
       */
      if (Number(error?.response?.status) === 409) {
        await loadReviewAccess();
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  // ==========================================================
  // DELETE
  // ==========================================================

  // ==========================================================
  // DELETE REVIEW
  // Không hiển thị window.confirm / alert.
  // Bấm Xóa sẽ xóa ngay.
  // ==========================================================

  const handleDeleteReview = async () => {
    const currentReview = reviewAccess.review;

    if (!currentReview?.id) {
      return;
    }

    try {
      setDeleteLoading(true);

      await deleteProductComment(currentReview.id);

      toast.success("Đã xóa đánh giá.");

      resetReviewForm();

      await loadReviewAccess();

      if (onReviewSubmitted) {
        await onReviewSubmitted();
      }
    } catch (error) {
      console.error("Delete review:", error);

      toast.error(error?.response?.data?.message || "Không thể xóa đánh giá.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ==========================================================
  // DESCRIPTION
  // ==========================================================

  const descriptionHtml = !isRichTextEmpty(product?.description)
    ? sanitizeRichTextHtml(product.description)
    : "";

  // ==========================================================
  // REVIEW FORM RENDER
  // ==========================================================

  const renderReviewForm = (mode = "create") => {
    const isEdit = mode === "edit";

    return (
      <div
        className="review-form-container"
        style={{
          marginBottom: "24px",

          padding: "18px",

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
          {isEdit ? "Chỉnh sửa đánh giá" : "Viết đánh giá của bạn"}
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
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  style={{
                    border: "none",

                    padding: "0",

                    margin: "0",

                    background: "transparent",

                    cursor: "pointer",
                  }}
                  aria-label={`${star} sao`}
                >
                  <i
                    className={`bi ${
                      star <= reviewRating ? "bi-star-fill" : "bi-star"
                    }`}
                    style={{
                      fontSize: "22px",

                      color: star <= reviewRating ? "#fbbf24" : "#d1d5db",
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="review-content-input">
            <textarea
              rows="4"
              maxLength={2000}
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

            <small
              style={{
                display: "block",

                marginTop: "5px",

                color: "#64748b",

                textAlign: "right",
              }}
            >
              {reviewContent.length}
              /2000
            </small>
          </div>

          <div
            style={{
              display: "flex",

              gap: "10px",

              marginTop: "12px",
            }}
          >
            <button
              type="submit"
              disabled={submitLoading}
              style={{
                padding: "10px 24px",

                border: "none",

                borderRadius: "8px",

                background: "#ef233c",

                color: "#fff",

                fontWeight: "600",

                fontSize: "14px",

                cursor: submitLoading ? "not-allowed" : "pointer",

                opacity: submitLoading ? 0.7 : 1,
              }}
            >
              {submitLoading
                ? "Đang lưu..."
                : isEdit
                  ? "Lưu thay đổi"
                  : "Gửi đánh giá"}
            </button>

            {isEdit && (
              <button
                type="button"
                disabled={submitLoading}
                onClick={() => {
                  resetReviewForm();
                }}
                style={{
                  padding: "10px 20px",

                  border: "1px solid #d1d5db",

                  borderRadius: "8px",

                  background: "#fff",

                  color: "#374151",

                  fontWeight: "600",

                  cursor: "pointer",
                }}
              >
                Hủy
              </button>
            )}
          </div>
        </form>
      </div>
    );
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <section className="product-tabs">
      {/* =====================================================
          TAB NAVIGATION
      ===================================================== */}

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

      {/* =====================================================
          BODY
      ===================================================== */}

      <div className="product-tabs-body">
        {/* ===================================================
            DESCRIPTION
        =================================================== */}

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

        {/* ===================================================
            SPECIFICATIONS
        =================================================== */}

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

        {/* ===================================================
            REVIEWS
        =================================================== */}

        {activeTab === "reviews" && (
          <div className="review-section">
            {/* =================================================
                ACCESS LOADING
            ================================================= */}

            {isAuthenticated && accessLoading && (
              <div
                className="review-login-box"
                style={{
                  marginBottom: "24px",
                }}
              >
                <div className="review-login-icon">
                  <i className="bi bi-arrow-repeat" />
                </div>

                <h3>Đang kiểm tra quyền đánh giá...</h3>
              </div>
            )}

            {/* =================================================
                NOT AUTHENTICATED
            ================================================= */}

            {!isAuthenticated && (
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
                MY REVIEW EXISTS
            ================================================= */}

            {isAuthenticated &&
              !accessLoading &&
              reviewAccess.has_review &&
              reviewAccess.review && (
                <>
                  {!editing && (
                    <div
                      className="review-form-container"
                      style={{
                        marginBottom: "24px",

                        padding: "18px",

                        border: "1px solid #e5e7eb",

                        borderRadius: "12px",

                        background: "#fff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",

                          justifyContent: "space-between",

                          alignItems: "flex-start",

                          gap: "16px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",

                            gap: "12px",

                            flex: 1,
                          }}
                        >
                          <ReviewAvatar
                            name={reviewAccess.review.user_name}
                            avatar={reviewAccess.review.user_avatar}
                          />

                          <div>
                            <h4
                              style={{
                                margin: "0 0 5px",

                                color: "#111827",
                              }}
                            >
                              Đánh giá của bạn
                            </h4>

                            <ReviewStars score={reviewAccess.review.rating} />

                            <p
                              style={{
                                margin: "10px 0 0",

                                color: "#374151",

                                lineHeight: 1.6,
                              }}
                            >
                              {reviewAccess.review.content}
                            </p>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",

                            gap: "8px",
                          }}
                        >
                          {reviewAccess.purchased && (
                            <button
                              type="button"
                              onClick={handleStartEdit}
                              style={{
                                border: "1px solid #d1d5db",

                                background: "#fff",

                                borderRadius: "8px",

                                padding: "8px 12px",

                                cursor: "pointer",

                                fontWeight: "600",
                              }}
                            >
                              <i className="bi bi-pencil-square" /> Sửa
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={deleteLoading}
                            onClick={handleDeleteReview}
                            style={{
                              border: "1px solid #fecaca",

                              background: "#fff",

                              color: "#dc2626",

                              borderRadius: "8px",

                              padding: "8px 12px",

                              cursor: deleteLoading ? "not-allowed" : "pointer",

                              fontWeight: "600",
                            }}
                          >
                            <i className="bi bi-trash3" />{" "}
                            {deleteLoading ? "Đang xóa..." : "Xóa"}
                          </button>
                        </div>
                      </div>

                      {!reviewAccess.purchased && (
                        <div
                          style={{
                            marginTop: "12px",

                            padding: "10px 12px",

                            borderRadius: "8px",

                            background: "#fff7ed",

                            color: "#9a3412",
                          }}
                        >
                          <i className="bi bi-exclamation-triangle" /> Đây là
                          đánh giá cũ không có đơn hàng hoàn tất tương ứng. Đánh
                          giá này sẽ không được tính vào điểm sản phẩm.
                        </div>
                      )}
                    </div>
                  )}

                  {editing && renderReviewForm("edit")}
                </>
              )}

            {/* =================================================
                PURCHASED + NO REVIEW
            ================================================= */}

            {isAuthenticated &&
              !accessLoading &&
              reviewAccess.purchased &&
              !reviewAccess.has_review &&
              renderReviewForm("create")}

            {/* =================================================
                NOT PURCHASED
            ================================================= */}

            {isAuthenticated &&
              !accessLoading &&
              !reviewAccess.purchased &&
              !reviewAccess.has_review && (
                <div
                  className="review-login-box"
                  style={{
                    marginBottom: "24px",
                  }}
                >
                  <div className="review-login-icon">
                    <i className="bi bi-bag-check" />
                  </div>

                  <h3>Bạn chưa thể đánh giá sản phẩm này</h3>

                  <p>
                    Chỉ khách hàng đã mua sản phẩm và có đơn hàng ở trạng thái
                    hoàn tất mới được đánh giá.
                  </p>
                </div>
              )}

            {/* =================================================
                SUMMARY
            ================================================= */}

            <div className="review-summary">
              <div className="review-summary-score">
                <strong>{Number(rating?.average || 0).toFixed(1)}</strong>

                <span>/ 5</span>
              </div>

              <div>
                <ReviewStars score={Math.round(Number(rating?.average || 0))} />

                <p>
                  Dựa trên {Number(rating?.total || reviews.length || 0)} đánh
                  giá đã xác minh.
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
                      <ReviewAvatar
                        name={name}
                        avatar={review.user_avatar || review.avatar}
                      />

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

                          <ReviewStars score={score} />
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

                  <p>Chưa có khách hàng đã mua sản phẩm nào gửi đánh giá.</p>
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
