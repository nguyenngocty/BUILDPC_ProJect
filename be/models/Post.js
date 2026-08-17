const { pool } = require("../config/database");

class Post {
  static async getClientList({ search = "", category_id = null, sort = "latest", page = 1, limit = 6 }) {
    let sql = `
      SELECT
        p.id, p.title, p.slug, p.content, p.excerpt, p.tags, p.thumbnail,
        p.created_at, p.views, p.is_featured,
        c.id AS category_id, c.name AS category_name,
        u.id AS author_id, u.full_name AS author_name,
         u.avatar AS author_avatar
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.deleted_at IS NULL AND p.status = 1
    `;
    const params = [];

    if (search) {
      sql += " AND p.title LIKE ?";
      params.push(`%${search}%`);
    }
    if (category_id && category_id !== "all") {
      sql += " AND p.category_id = ?";
      params.push(category_id);
    }
    switch (sort) {
      case "oldest": sql += " ORDER BY p.created_at ASC"; break;
      case "views": sql += " ORDER BY p.views DESC"; break;
      default: sql += " ORDER BY p.created_at DESC"; break;
    }
    const offset = (page - 1) * limit;
    sql += " LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async countClientList({ search = "", category_id = null }) {
    let sql = `SELECT COUNT(*) as total FROM posts p WHERE p.deleted_at IS NULL AND p.status = 1`;
    const params = [];
    if (search) { sql += " AND p.title LIKE ?"; params.push(`%${search}%`); }
    if (category_id && category_id !== "all") { sql += " AND p.category_id = ?"; params.push(category_id); }
    const [rows] = await pool.query(sql, params);
    return rows[0].total;
  }

  static async getClientDetail(id) {
    const sql = `
      SELECT
        p.id, p.title, p.slug, p.content, p.excerpt, p.tags, p.thumbnail,
        p.created_at, p.views, p.is_featured,
        c.id AS category_id, c.name AS category_name,
        u.id AS author_id, u.full_name AS author_name,
         u.avatar AS author_avatar
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ? AND p.deleted_at IS NULL AND p.status = 1
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [id]);
    const post = rows[0];

    if (post && post.excerpt) {
      post.excerpt = post.excerpt.replace(/<[^>]+>|&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return post;
  }

  static async incrementView(id) {
    await pool.query("UPDATE posts SET views = views + 1 WHERE id = ?", [id]);
  }
}
module.exports = Post;