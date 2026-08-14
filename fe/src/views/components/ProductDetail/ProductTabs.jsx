import { useState } from "react";

function ProductTabs({
  product,
  specifications = [],
  rating,
  reviews = [],
  isAuthenticated,
}) {
  const [activeTab, setActiveTab] = useState("description");

  return (
    <section className="product-tabs">
      <div className="product-tabs-nav">
        <button
          type="button"
          className={`product-tab-button ${
            activeTab === "description" ? "is-active" : ""
          }`}
          onClick={() => setActiveTab("description")}
        >
          <i className="bi bi-file-text"></i>

          <span>Mô tả</span>
        </button>

        <button
          type="button"
          className={`product-tab-button ${
            activeTab === "specifications" ? "is-active" : ""
          }`}
          onClick={() => setActiveTab("specifications")}
        >
          <i className="bi bi-cpu"></i>

          <span>Thông số</span>
        </button>

        <button
          type="button"
          className={`product-tab-button ${
            activeTab === "reviews" ? "is-active" : ""
          }`}
          onClick={() => setActiveTab("reviews")}
        >
          <i className="bi bi-chat-dots"></i>

          <span>Đánh giá ({Number(rating?.total || reviews.length || 0)})</span>
        </button>
      </div>

      <div className="product-tabs-body">
        {activeTab === "description" && (
          <div className="description-content">
            {product.description ? (
              <p>{product.description}</p>
            ) : (
              <div className="pd-empty-content">
                Chưa có mô tả cho sản phẩm này.
              </div>
            )}
          </div>
        )}

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

        {activeTab === "reviews" && (
          <div className="review-section">
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
                    ></i>
                  ))}
                </div>

                <p>
                  Dựa trên {Number(rating?.total || reviews.length || 0)} đánh
                  giá.
                </p>
              </div>
            </div>

            {!isAuthenticated && (
              <div className="review-login-box">
                <div className="review-login-icon">
                  <i className="bi bi-person-lock"></i>
                </div>

                <h3>Đăng nhập để đánh giá sản phẩm</h3>

                <p>
                  Chỉ khách hàng đã mua và hoàn thành đơn hàng mới có thể gửi
                  đánh giá.
                </p>
              </div>
            )}

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
                                <i className="bi bi-patch-check-fill"></i> Đã
                                mua hàng
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
                              ></i>
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
                  <i className="bi bi-chat-square-text"></i>

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
