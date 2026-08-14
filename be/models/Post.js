const { pool } = require("../config/database");

class Post {

  static async getAll() {
    const [rows] = await pool.query("SELECT * FROM posts WHERE deleted_at IS NULL");
    return rows;
  }

  static async getById(id) {
    const [rows] = await pool.query(
      "SELECT * FROM posts WHERE id=? LIMIT 1",
      [id]
    );

    return rows[0];
  }

}

module.exports = Post;