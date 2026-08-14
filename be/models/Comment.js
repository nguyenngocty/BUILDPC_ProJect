const { pool } = require("../config/database");

class Comment {
  // =====================================================
  // PRODUCT
  // =====================================================

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

          WHERE id = ?
            AND deleted_at IS NULL

          LIMIT 1
        `,
      [productId],
    );

    return rows[0] || null;
  }

  // =====================================================
  // KIỂM TRA USER ĐÃ MUA SẢN PHẨM HAY CHƯA
  //
  // Chỉ tính đơn COMPLETED.
  // =====================================================

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

  // =====================================================
  // REVIEW ĐANG HOẠT ĐỘNG CỦA USER
  // =====================================================

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
            cm.updated_at

          FROM comments cm

          WHERE
            cm.user_id = ?
            AND cm.product_id = ?
            AND cm.deleted_at IS NULL

          ORDER BY cm.id DESC

          LIMIT 1
        `,
      [userId, productId],
    );

    return rows[0] || null;
  }

  // =====================================================
  // REVIEW ĐÃ XÓA CỦA USER
  //
  // Dùng để restore thay vì tạo vô hạn record mới.
  // =====================================================

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

          ORDER BY id DESC

          LIMIT 1
        `,
      [userId, productId],
    );

    return rows[0] || null;
  }

  // =====================================================
  // CREATE
  // =====================================================

  static async create({ userId, productId, rating, content }) {
    /*
     * Nếu trước đây user từng xóa review,
     * chúng ta phục hồi record đó.
     */

    const deletedReview = await Comment.getDeletedUserReview(userId, productId);

    if (deletedReview) {
      await pool.execute(
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
        [content, rating, deletedReview.id],
      );

      return Comment.getById(deletedReview.id);
    }

    const [result] = await pool.execute(
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

    return Comment.getById(result.insertId);
  }

  // =====================================================
  // GET BY ID
  // =====================================================

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
            u.avatar AS user_avatar

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

  // =====================================================
  // DANH SÁCH REVIEW THEO PRODUCT
  // =====================================================

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
    ];

    const params = [productId];

    // =========================
    // Filter sao
    // =========================

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

    // =========================
    // Sort
    // =========================

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
    }

    // =========================
    // Count
    // =========================

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

    const total = Number(countRow.total || 0);

    // =========================
    // Reviews
    // =========================

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

            u.full_name
              AS user_name,

            u.avatar
              AS user_avatar

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

    // =========================
    // Rating statistics
    // =========================

    const [statsRows] = await pool.execute(
      `
          SELECT
            rating,
            COUNT(*) AS total

          FROM comments

          WHERE
            product_id = ?

            AND deleted_at IS NULL
            AND is_approved = 1

            AND rating BETWEEN 1 AND 5

          GROUP BY rating
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

  // =====================================================
  // UPDATE
  // =====================================================

  static async update(id, { rating, content }) {
    const [result] = await pool.execute(
      `
          UPDATE comments

          SET
            rating = ?,
            content = ?,

            /*
             * User sửa xong vẫn hiển thị ngay.
             */
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

  // =====================================================
  // SOFT DELETE
  // =====================================================

  static async softDelete(id) {
    const [result] = await pool.execute(
      `
          UPDATE comments

          SET
            deleted_at = NOW(),
            updated_at = NOW()

          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
      [id],
    );

    return result.affectedRows > 0;
  }

  // =====================================================
  // NORMALIZE
  // =====================================================

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

      verified_purchase: true,
    };
  }
}

module.exports = Comment;
