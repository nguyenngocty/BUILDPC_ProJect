import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Link, useNavigate, useParams } from "react-router-dom";

import toast from "react-hot-toast";

import buildPcService from "../../../services/buildPcService";

import { useCart } from "../../../context/CartContext";

import api from "../../../services/api";

import "./AccountBuilds.css";

// ============================================================
// CONSTANTS
// ============================================================

const TYPE_ICONS = {
  cpu: "bi-cpu",
  mainboard: "bi-motherboard",
  ram: "bi-memory",
  vga: "bi-gpu-card",
  cooling: "bi-fan",
  psu: "bi-lightning-charge",
  storage: "bi-device-ssd",
  case: "bi-pc-display",
};

const TYPE_LABELS = {
  cpu: "CPU",
  mainboard: "Mainboard",
  ram: "RAM",
  vga: "Card đồ họa",
  cooling: "Tản nhiệt",
  psu: "Nguồn",
  storage: "Lưu trữ",
  case: "Case",
};

// ============================================================
// HELPERS
// ============================================================

const normalizeTypeCode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeNumber = (value, fallback = 0) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
};

const formatPrice = (value) =>
  `${Math.round(normalizeNumber(value)).toLocaleString("vi-VN")}đ`;

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getSingleData = (response) =>
  response?.data?.data ?? response?.data ?? null;

const getImageUrl = (value) => {
  if (!value) {
    return "/images/no-image.png";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  try {
    return new URL(value, api.defaults.baseURL).toString();
  } catch {
    return value;
  }
};

const getCurrentItems = (build) => {
  const items = build?.items || build?.build_items || build?.components || [];

  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter((item) => {
    const deleted = item.deleted_at;

    const replaced = item.replaced_at;

    return !deleted && !replaced;
  });
};

const normalizeItem = (item) => {
  const typeCode = normalizeTypeCode(
    item.type_code ||
      item.part_type_code ||
      item.pc_part_type_code ||
      item.part_type?.type_code,
  );

  const price = normalizeNumber(
    item.price ?? item.unit_price ?? item.current_price ?? item.effective_price,
  );

  const quantity = Math.max(1, normalizeNumber(item.quantity, 1));

  return {
    ...item,

    type_code: typeCode,

    name:
      item.variant_name ||
      item.product_name ||
      item.part_name ||
      item.name ||
      "Linh kiện",

    sku: item.variant_sku || item.product_sku || item.sku || "",

    image: getImageUrl(
      item.variant_image ||
        item.product_thumbnail ||
        item.thumbnail ||
        item.image,
    ),

    price,

    quantity,

    total: normalizeNumber(item.total_price ?? item.total, price * quantity),
  };
};

// ============================================================
// COMPONENT
// ============================================================

function AccountBuildDetail() {
  const { id } = useParams();

  const navigate = useNavigate();

  const { refreshCart } = useCart();

  const [build, setBuild] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [addingToCart, setAddingToCart] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);

  const [deleting, setDeleting] = useState(false);

  // ==========================================================
  // LOAD DETAIL
  // ==========================================================

  const loadBuild = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await buildPcService.getMyBuildById(id);

      const data = getSingleData(response);

      if (!data) {
        throw new Error("Không tìm thấy cấu hình.");
      }

      setBuild(data);
    } catch (requestError) {
      console.error("Lỗi lấy Build detail:", requestError);

      setBuild(null);

      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Không thể tải chi tiết cấu hình.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBuild();
  }, [loadBuild]);

  // ==========================================================
  // ITEMS
  // ==========================================================

  const items = useMemo(
    () => getCurrentItems(build).map(normalizeItem),
    [build],
  );

  const displayTotal = normalizeNumber(
    build?.total_price,
    items.reduce((total, item) => total + item.total, 0),
  );

  // ==========================================================
  // CART
  // ==========================================================

  const handleAddToCart = async () => {
    try {
      setAddingToCart(true);

      await buildPcService.addSavedBuildToCart(id);

      if (typeof refreshCart === "function") {
        await refreshCart({
          silent: true,
        });
      }

      toast.success("Đã thêm cấu hình vào giỏ hàng.");
    } catch (requestError) {
      console.error("Lỗi thêm build vào Cart:", requestError);

      toast.error(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Không thể thêm cấu hình vào giỏ.",
      );
    } finally {
      setAddingToCart(false);
    }
  };

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete = async () => {
    try {
      setDeleting(true);

      await buildPcService.deleteMyBuild(id);

      toast.success("Đã xóa cấu hình.");

      navigate("/account/builds", {
        replace: true,
      });
    } catch (requestError) {
      console.error("Lỗi xóa Build:", requestError);

      toast.error(
        requestError?.response?.data?.message || "Không thể xóa cấu hình.",
      );
    } finally {
      setDeleting(false);
    }
  };

  // ==========================================================
  // STATES
  // ==========================================================

  if (loading) {
    return (
      <div className="account-build-detail-state">
        <div className="account-build-spinner" />

        <strong>Đang tải chi tiết cấu hình</strong>

        <p>Hệ thống đang lấy thông tin linh kiện.</p>
      </div>
    );
  }

  if (error || !build) {
    return (
      <div className="account-build-detail-state">
        <span className="account-build-state-icon">
          <i className="bi bi-exclamation-triangle" />
        </span>

        <strong>Không thể mở cấu hình</strong>

        <p>{error}</p>

        <div className="account-build-detail-state-actions">
          <button type="button" onClick={loadBuild}>
            <i className="bi bi-arrow-clockwise" />
            Thử lại
          </button>

          <Link to="/account/builds">Quay lại</Link>
        </div>
      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <section className="account-build-detail">
        {/* TOP */}

        <div className="account-build-detail-top">
          <div>
            <Link to="/account/builds" className="account-build-back">
              <i className="bi bi-arrow-left" />
              Cấu hình của tôi
            </Link>

            <span className="account-build-kicker">
              <i className="bi bi-pc-display-horizontal" />
              CHI TIẾT BUILD PC
            </span>

            <h1>{build.name || `Cấu hình #${build.id}`}</h1>

            <p>{build.description || "Cấu hình PC cá nhân của bạn."}</p>
          </div>

          <div className="account-build-detail-top-actions">
            <button
              type="button"
              className="account-build-detail-delete"
              onClick={() => setDeleteOpen(true)}
            >
              <i className="bi bi-trash3" />
              Xóa
            </button>

            <button
              type="button"
              className="account-build-detail-cart"
              disabled={addingToCart || items.length === 0}
              onClick={handleAddToCart}
            >
              <i
                className={
                  addingToCart
                    ? "bi bi-arrow-repeat account-build-spin-icon"
                    : "bi bi-cart-plus"
                }
              />

              {addingToCart ? "Đang thêm..." : "Thêm vào giỏ"}
            </button>
          </div>
        </div>

        {/* STATS */}

        <div className="account-build-detail-stats">
          <div>
            <span className="account-build-detail-stat-icon">
              <i className="bi bi-grid-3x3-gap" />
            </span>

            <div>
              <small>Linh kiện</small>

              <strong>{items.length} nhóm</strong>
            </div>
          </div>

          <div>
            <span className="account-build-detail-stat-icon">
              <i className="bi bi-cash-stack" />
            </span>

            <div>
              <small>Tổng giá trị đã lưu</small>

              <strong>{formatPrice(displayTotal)}</strong>
            </div>
          </div>

          <div>
            <span className="account-build-detail-stat-icon">
              <i className="bi bi-calendar3" />
            </span>

            <div>
              <small>Ngày tạo</small>

              <strong>{formatDate(build.created_at)}</strong>
            </div>
          </div>
        </div>

        {/* NOTE */}

        <div className="account-build-snapshot-note">
          <i className="bi bi-info-circle" />

          <div>
            <strong>Đây là cấu hình đã lưu</strong>

            <p>
              Giá hiển thị bên dưới là snapshot của cấu hình. Khi thêm vào giỏ,
              Backend sẽ kiểm tra lại giá, tồn kho và trạng thái Variant hiện
              tại.
            </p>
          </div>
        </div>

        {/* ITEMS */}

        <div className="account-build-detail-board">
          <div className="account-build-detail-board-header">
            <div>
              <span>DANH SÁCH LINH KIỆN</span>

              <h2>Cấu hình phần cứng</h2>
            </div>

            <strong>{items.length} sản phẩm</strong>
          </div>

          {items.length === 0 ? (
            <div className="account-build-detail-empty">
              <i className="bi bi-inbox" />

              <strong>Cấu hình không có linh kiện</strong>
            </div>
          ) : (
            <div className="account-build-detail-items">
              {items.map((item, index) => {
                const typeCode = item.type_code;

                return (
                  <article
                    className="account-build-detail-item"
                    key={
                      item.id ||
                      item.build_item_id ||
                      `${item.part_id}-${index}`
                    }
                  >
                    <div className="account-build-detail-item-number">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div className="account-build-detail-item-type">
                      <span>
                        <i
                          className={`bi ${TYPE_ICONS[typeCode] || "bi-pc"}`}
                        />
                      </span>

                      <div>
                        <small>
                          {TYPE_LABELS[typeCode] ||
                            item.type_name ||
                            "Linh kiện"}
                        </small>
                      </div>
                    </div>

                    <div className="account-build-detail-item-product">
                      <div className="account-build-detail-item-image">
                        <img
                          src={item.image}
                          alt={item.name}
                          onError={(event) => {
                            event.currentTarget.src = "/images/no-image.png";
                          }}
                        />
                      </div>

                      <div className="account-build-detail-item-info">
                        <h3>{item.name}</h3>

                        {item.sku && <p>SKU: {item.sku}</p>}

                        {item.variant_id && (
                          <span className="account-build-detail-variant">
                            Variant
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="account-build-detail-item-quantity">
                      <small>Số lượng</small>

                      <strong>×{item.quantity}</strong>
                    </div>

                    <div className="account-build-detail-item-price">
                      <small>Thành tiền</small>

                      <strong>{formatPrice(item.total)}</strong>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="account-build-detail-total">
            <div>
              <span>Tổng giá trị cấu hình</span>

              <small>Giá tại thời điểm cấu hình được lưu</small>
            </div>

            <strong>{formatPrice(displayTotal)}</strong>
          </div>
        </div>

        {/* FOOT ACTION */}

        <div className="account-build-detail-bottom-actions">
          <Link to="/build-pc" className="account-build-detail-new">
            <i className="bi bi-plus-lg" />
            Tạo cấu hình khác
          </Link>

          <button
            type="button"
            className="account-build-detail-cart account-build-detail-cart--large"
            disabled={addingToCart || items.length === 0}
            onClick={handleAddToCart}
          >
            <i className="bi bi-cart-plus" />
            Thêm toàn bộ vào giỏ
          </button>
        </div>
      </section>

      {/* DELETE MODAL */}

      {deleteOpen && (
        <div
          className="account-build-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setDeleteOpen(false);
            }
          }}
        >
          <section className="account-build-delete-dialog">
            <button
              type="button"
              className="account-build-modal-close"
              disabled={deleting}
              onClick={() => setDeleteOpen(false)}
            >
              <i className="bi bi-x-lg" />
            </button>

            <div className="account-build-delete-icon">
              <i className="bi bi-trash3" />
            </div>

            <span className="account-build-delete-kicker">XÓA CẤU HÌNH</span>

            <h2>Xóa cấu hình này?</h2>

            <p>
              Bạn đang xóa <strong>“{build.name}”</strong>. Cấu hình sẽ không
              còn xuất hiện trong My Builds.
            </p>

            <div className="account-build-delete-actions">
              <button
                type="button"
                className="account-build-delete-cancel"
                disabled={deleting}
                onClick={() => setDeleteOpen(false)}
              >
                Giữ cấu hình
              </button>

              <button
                type="button"
                className="account-build-delete-confirm"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? (
                  <>
                    <span className="account-build-button-spinner" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <i className="bi bi-trash3" />
                    Xóa cấu hình
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default AccountBuildDetail;
