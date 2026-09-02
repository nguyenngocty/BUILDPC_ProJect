const { pool } = require("../config/database");

class Comment {
  // ============================================================
  // PRODUCT
  // ============================================================

  static async getProductById(productId) {
    const [rows] = await pool.execute(
      `
        SELECT
          id,
          name,
          slug,
          status,
          deleted_at
        FROM products
        WHERE
          id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [productId],
    );

    return rows[0] || null;
  }

  // ============================================================
  // PURCHASE CHECK
  //
  // Chỉ đơn COMPLETED mới được xem là đã mua hoàn tất.
  // ============================================================

  static async hasPurchasedProduct(userId, productId) {
    const [rows] = await pool.execute(
      `
        SELECT
          oi.id
        FROM order_items oi

        INNER JOIN orders o
          ON o.id = oi.order_id

        WHERE
          o.user_id = ?
          AND oi.product_id = ?

          AND o.status = 'COMPLETED'

          AND o.deleted_at IS NULL
          AND oi.deleted_at IS NULL

        LIMIT 1
      `,
      [userId, productId],
    );

    return rows.length > 0;
  }

  // ============================================================
  // USER ACTIVE REVIEW
  // ============================================================

  static async getUserReview(userId, productId) {
    const [rows] = await pool.execute(
      `
        SELECT
          cm.id,
          cm.user_id,
          cm.product_id,

          cm.content,
          cm.rating,
          cm.is_approved,

          cm.created_at,
          cm.updated_at,

          u.full_name AS user_name,
          u.avatar AS user_avatar,

          EXISTS (
            SELECT 1

            FROM orders o_verify

            INNER JOIN order_items oi_verify
              ON oi_verify.order_id = o_verify.id

            WHERE
              o_verify.user_id = cm.user_id
              AND oi_verify.product_id = cm.product_id

              AND o_verify.status = 'COMPLETED'

              AND o_verify.deleted_at IS NULL
              AND oi_verify.deleted_at IS NULL
          ) AS verified_purchase

        FROM comments cm

        INNER JOIN users u
          ON u.id = cm.user_id

        WHERE
          cm.user_id = ?
          AND cm.product_id = ?
          AND cm.deleted_at IS NULL

        ORDER BY
          cm.id DESC

        LIMIT 1
      `,
      [userId, productId],
    );

    if (!rows[0]) {
      return null;
    }

    return Comment.normalizeReview(rows[0]);
  }

  // ============================================================
  // DELETED REVIEW
  // ============================================================

  static async getDeletedUserReview(userId, productId) {
    const [rows] = await pool.execute(
      `
        SELECT
          id,
          user_id,
          product_id

        FROM comments

        WHERE
          user_id = ?
          AND product_id = ?
          AND deleted_at IS NOT NULL

        ORDER BY
          id DESC

        LIMIT 1
      `,
      [userId, productId],
    );

    return rows[0] || null;
  }

  // ============================================================
  // REVIEW ACCESS
  // ============================================================

  static async getReviewAccess(userId, productId) {
    const purchased = await Comment.hasPurchasedProduct(userId, productId);

    const review = await Comment.getUserReview(userId, productId);

    return {
      purchased,

      has_review: Boolean(review),

      can_review: purchased && !review,

      review,
    };
  }

  // ============================================================
  // ORDER REVIEW ITEMS
  //
  // Dùng trong AccountOrderDetail.
  // ============================================================

  static async getOrderReviewItems(userId, orderId) {
    const [orderRows] = await pool.execute(
      `
        SELECT
          id,
          user_id,
          order_code,
          status

        FROM orders

        WHERE
          id = ?
          AND user_id = ?
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [orderId, userId],
    );

    const order = orderRows[0] || null;

    if (!order) {
      return null;
    }

    const [items] = await pool.execute(
      `
        SELECT
          oi.id AS order_item_id,

          oi.product_id,
          oi.variant_id,

          oi.product_name,
          oi.variant_name,

          oi.product_image,

          oi.quantity,
          oi.price,
          oi.total_price,

          p.slug AS product_slug,
          p.status AS product_status,

          cm.id AS review_id,
          cm.rating AS review_rating,
          cm.content AS review_content,
          cm.created_at AS review_created_at,
          cm.updated_at AS review_updated_at

        FROM order_items oi

        LEFT JOIN products p
          ON p.id = oi.product_id
          AND p.deleted_at IS NULL

        LEFT JOIN comments cm
          ON cm.id = (
            SELECT
              cm_latest.id

            FROM comments cm_latest

            WHERE
              cm_latest.user_id = ?
              AND cm_latest.product_id = oi.product_id
              AND cm_latest.deleted_at IS NULL

            ORDER BY
              cm_latest.id DESC

            LIMIT 1
          )

        WHERE
          oi.order_id = ?
          AND oi.deleted_at IS NULL

        ORDER BY
          oi.id ASC
      `,
      [userId, orderId],
    );

    const orderCompleted =
      String(order.status || "").toUpperCase() === "COMPLETED";

    return {
      order: {
        id: Number(order.id),

        order_code: order.order_code,

        status: String(order.status || "").toUpperCase(),

        completed: orderCompleted,
      },

      items: items.map((item) => {
        const reviewId = item.review_id ? Number(item.review_id) : null;

        const productAvailable =
          Boolean(item.product_slug) && Number(item.product_status) === 1;

        return {
          order_item_id: Number(item.order_item_id),

          product_id: Number(item.product_id),

          variant_id: item.variant_id ? Number(item.variant_id) : null,

          product_name: item.product_name,

          variant_name: item.variant_name || null,

          product_image: item.product_image || null,

          product_slug: item.product_slug || null,

          quantity: Number(item.quantity || 0),

          price: Number(item.price || 0),

          total_price: Number(item.total_price || 0),

          has_review: Boolean(reviewId),

          review_id: reviewId,

          review_rating:
            item.review_rating !== null && item.review_rating !== undefined
              ? Number(item.review_rating)
              : null,

          review_content: item.review_content || null,

          review_created_at: item.review_created_at || null,

          review_updated_at: item.review_updated_at || null,

          can_review: orderCompleted && productAvailable && !reviewId,

          can_edit_review: orderCompleted && Boolean(reviewId),

          review_url: item.product_slug
            ? `/products/${item.product_slug}?tab=reviews`
            : null,
        };
      }),
    };
  }

  // ============================================================
  // CREATE
  //
  // Lock user để tránh double click sinh 2 review cùng lúc.
  // ============================================================

  static async create({ userId, productId, rating, content }) {
    const connection = await pool.getConnection();

    let reviewId = null;

    try {
      await connection.beginTransaction();

      // Lock user.
      await connection.execute(
        `
          SELECT id
          FROM users
          WHERE id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [userId],
      );

      const [existingRows] = await connection.execute(
        `
            SELECT id

            FROM comments

            WHERE
              user_id = ?
              AND product_id = ?
              AND deleted_at IS NULL

            ORDER BY id DESC

            LIMIT 1
          `,
        [userId, productId],
      );

      if (existingRows[0]) {
        const error = new Error("Bạn đã đánh giá sản phẩm này.");

        error.code = "COMMENT_ALREADY_EXISTS";

        throw error;
      }

      const [deletedRows] = await connection.execute(
        `
            SELECT id

            FROM comments

            WHERE
              user_id = ?
              AND product_id = ?
              AND deleted_at IS NOT NULL

            ORDER BY id DESC

            LIMIT 1
          `,
        [userId, productId],
      );

      if (deletedRows[0]) {
        reviewId = Number(deletedRows[0].id);

        await connection.execute(
          `
            UPDATE comments

            SET
              content = ?,
              rating = ?,

              is_approved = 1,

              deleted_at = NULL,

              updated_at = NOW()

            WHERE id = ?
          `,
          [content, rating, reviewId],
        );
      } else {
        const [result] = await connection.execute(
          `
              INSERT INTO comments
              (
                user_id,
                product_id,

                content,
                rating,

                is_approved,

                created_at,
                updated_at
              )

              VALUES
              (
                ?,
                ?,

                ?,
                ?,

                1,

                NOW(),
                NOW()
              )
            `,
          [userId, productId, content, rating],
        );

        reviewId = Number(result.insertId);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }

    return Comment.getById(reviewId);
  }

  // ============================================================
  // GET BY ID
  // ============================================================

  static async getById(id) {
    const [rows] = await pool.execute(
      `
        SELECT
          cm.id,
          cm.user_id,
          cm.product_id,

          cm.content,
          cm.rating,
          cm.is_approved,

          cm.created_at,
          cm.updated_at,

          u.full_name AS user_name,
          u.avatar AS user_avatar,

          EXISTS (
            SELECT 1

            FROM orders o_verify

            INNER JOIN order_items oi_verify
              ON oi_verify.order_id = o_verify.id

            WHERE
              o_verify.user_id = cm.user_id
              AND oi_verify.product_id = cm.product_id

              AND o_verify.status = 'COMPLETED'

              AND o_verify.deleted_at IS NULL
              AND oi_verify.deleted_at IS NULL
          ) AS verified_purchase

        FROM comments cm

        INNER JOIN users u
          ON u.id = cm.user_id

        WHERE
          cm.id = ?
          AND cm.deleted_at IS NULL

        LIMIT 1
      `,
      [id],
    );

    if (!rows[0]) {
      return null;
    }

    return Comment.normalizeReview(rows[0]);
  }

  // ============================================================
  // PRODUCT REVIEWS
  // ============================================================

  static async getProductReviews({
    productId,

    page = 1,
    limit = 10,

    sort = "newest",

    rating = "",
  }) {
    page = Number.parseInt(page, 10);

    limit = Number.parseInt(limit, 10);

    if (!Number.isInteger(page) || page < 1) {
      page = 1;
    }

    if (!Number.isInteger(limit) || limit < 1) {
      limit = 10;
    }

    limit = Math.min(limit, 50);

    const offset = (page - 1) * limit;

    const where = [
      "cm.product_id = ?",
      "cm.deleted_at IS NULL",
      "cm.is_approved = 1",
      "u.deleted_at IS NULL",
      "u.status = 1",

      `
        EXISTS (
          SELECT 1

          FROM orders o_verify

          INNER JOIN order_items oi_verify
            ON oi_verify.order_id = o_verify.id

          WHERE
            o_verify.user_id = cm.user_id
            AND oi_verify.product_id = cm.product_id

            AND o_verify.status = 'COMPLETED'

            AND o_verify.deleted_at IS NULL
            AND oi_verify.deleted_at IS NULL
        )
      `,

      `
        cm.id = (
          SELECT
            MAX(cm_latest.id)

          FROM comments cm_latest

          WHERE
            cm_latest.user_id = cm.user_id
            AND cm_latest.product_id = cm.product_id

            AND cm_latest.deleted_at IS NULL
            AND cm_latest.is_approved = 1
        )
      `,
    ];

    const params = [productId];

    if (rating !== "") {
      const ratingValue = Number.parseInt(rating, 10);

      if (
        Number.isInteger(ratingValue) &&
        ratingValue >= 1 &&
        ratingValue <= 5
      ) {
        where.push("cm.rating = ?");

        params.push(ratingValue);
      }
    }

    const whereSql = `WHERE ${where.join("\n AND ")}`;

    let orderBy = `
      ORDER BY
        cm.created_at DESC,
        cm.id DESC
    `;

    switch (String(sort || "").toLowerCase()) {
      case "oldest":
        orderBy = `
          ORDER BY
            cm.created_at ASC,
            cm.id ASC
        `;
        break;

      case "highest":
      case "rating_desc":
        orderBy = `
          ORDER BY
            cm.rating DESC,
            cm.created_at DESC
        `;
        break;

      case "lowest":
      case "rating_asc":
        orderBy = `
          ORDER BY
            cm.rating ASC,
            cm.created_at DESC
        `;
        break;

      default:
        break;
    }

    const [[countRow]] = await pool.execute(
      `
          SELECT
            COUNT(*) AS total

          FROM comments cm

          INNER JOIN users u
            ON u.id = cm.user_id

          ${whereSql}
        `,
      params,
    );

    const total = Number(countRow?.total || 0);

    const [rows] = await pool.execute(
      `
          SELECT
            cm.id,
            cm.user_id,
            cm.product_id,

            cm.content,
            cm.rating,

            cm.created_at,
            cm.updated_at,

            u.full_name AS user_name,
            u.avatar AS user_avatar,

            1 AS verified_purchase

          FROM comments cm

          INNER JOIN users u
            ON u.id = cm.user_id

          ${whereSql}

          ${orderBy}

          LIMIT ?
          OFFSET ?
        `,
      [...params, limit, offset],
    );

    const [statsRows] = await pool.execute(
      `
          SELECT
            cm.rating,
            COUNT(*) AS total

          FROM comments cm

          INNER JOIN users u
            ON u.id = cm.user_id

          WHERE
            cm.product_id = ?

            AND cm.deleted_at IS NULL
            AND cm.is_approved = 1

            AND cm.rating BETWEEN 1 AND 5

            AND u.deleted_at IS NULL
            AND u.status = 1

            AND EXISTS (
              SELECT 1

              FROM orders o_verify

              INNER JOIN order_items oi_verify
                ON oi_verify.order_id = o_verify.id

              WHERE
                o_verify.user_id = cm.user_id
                AND oi_verify.product_id = cm.product_id

                AND o_verify.status = 'COMPLETED'

                AND o_verify.deleted_at IS NULL
                AND oi_verify.deleted_at IS NULL
            )

            AND cm.id = (
              SELECT
                MAX(cm_latest.id)

              FROM comments cm_latest

              WHERE
                cm_latest.user_id = cm.user_id
                AND cm_latest.product_id = cm.product_id

                AND cm_latest.deleted_at IS NULL
                AND cm_latest.is_approved = 1
            )

          GROUP BY cm.rating
        `,
      [productId],
    );

    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    let ratingTotal = 0;
    let ratingCount = 0;

    for (const item of statsRows) {
      const star = Number(item.rating);

      const count = Number(item.total || 0);

      if (star >= 1 && star <= 5) {
        distribution[star] = count;

        ratingTotal += star * count;

        ratingCount += count;
      }
    }

    const average =
      ratingCount > 0 ? Number((ratingTotal / ratingCount).toFixed(1)) : 0;

    return {
      reviews: rows.map(Comment.normalizeReview),

      rating: {
        average,

        total: ratingCount,

        distribution,
      },

      pagination: {
        page,
        limit,
        total,

        totalPages: total > 0 ? Math.ceil(total / limit) : 0,

        hasPreviousPage: page > 1,

        hasNextPage: page * limit < total,
      },
    };
  }

  // ============================================================
  // UPDATE
  // ============================================================

  static async update(id, { rating, content }) {
    const [result] = await pool.execute(
      `
          UPDATE comments

          SET
            rating = ?,
            content = ?,

            is_approved = 1,

            updated_at = NOW()

          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
      [rating, content, id],
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return Comment.getById(id);
  }

  // ============================================================
  // DELETE
  //
  // Xóa toàn bộ duplicate legacy active của cùng user/product.
  // ============================================================

  static async softDeleteUserProduct(userId, productId) {
    const [result] = await pool.execute(
      `
          UPDATE comments

          SET
            deleted_at = NOW(),
            updated_at = NOW()

          WHERE
            user_id = ?
            AND product_id = ?
            AND deleted_at IS NULL
        `,
      [userId, productId],
    );

    return result.affectedRows > 0;
  }

  // ============================================================
  // NORMALIZE
  // ============================================================

  static normalizeReview(review) {
    if (!review) {
      return null;
    }

    return {
      ...review,

      id: Number(review.id),

      user_id: Number(review.user_id),

      product_id: Number(review.product_id),

      rating: Number(review.rating || 0),

      verified_purchase: Number(review.verified_purchase || 0) === 1,
    };
  }
}

module.exports = Comment;
