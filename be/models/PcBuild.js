const { pool } = require("../config/database");

class PcBuild {
  // 1. Lấy tất cả cấu hình kèm theo các item linh kiện của nó (ĐÃ SỬA: JOIN CHUẨN QUA PC_PARTS)
  static async findAll() {
    try {
      const [builds] = await pool.query("SELECT * FROM pc_builds ORDER BY id DESC");
      
      for (let build of builds) {
        const [items] = await pool.query(
          `SELECT 
            pbi.part_id AS id, 
            pbi.quantity, 
            p.price AS price,          
            (p.price * pbi.quantity) AS total_price, 
            p.name,
            p.thumbnail AS image,
            pt.type_code AS category
           FROM pc_build_items pbi
           JOIN pc_parts pp ON pbi.part_id = pp.id
           JOIN products p ON pp.product_id = p.id
           LEFT JOIN pc_part_types pt ON pp.type_id = pt.id
           WHERE pbi.build_id = ?`,
          [build.id]
        );
        build.items = items;
      }
      return builds;
    } catch (error) {
      throw error;
    }
  }

  // 2. Tạo mới cấu hình máy (Giữ nguyên)
  static async create(data) {
    const connection = await pool.getConnection(); 
    try {
      await connection.beginTransaction();
      const { name, description, total_price, status, items } = data;

      const [buildResult] = await connection.query(
        "INSERT INTO pc_builds (name, description, total_price, status) VALUES (?, ?, ?, ?)",
        [name, description, total_price, status || "active"]
      );
      const buildId = buildResult.insertId;

      if (items && items.length > 0) {
        const insertItemsQuery = "INSERT INTO pc_build_items (build_id, part_id, quantity, price, total_price) VALUES ?";
        
        const values = items.map(item => [
          buildId, 
          item.id, // Lưu chính xác id linh kiện đại diện từ bảng pc_parts
          item.quantity || 1, 
          item.price || 0, 
          (item.price || 0) * (item.quantity || 1)
        ]);
        
        await connection.query(insertItemsQuery, [values]);
      }

      await connection.commit();
      return { id: buildId, ...data };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // 3. Cập nhật cấu hình máy (Giữ nguyên)
  static async update(id, data) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const { name, description, total_price, status, items } = data;

      await connection.query(
        "UPDATE pc_builds SET name = ?, description = ?, total_price = ?, status = ? WHERE id = ?",
        [name, description, total_price, status, id]
      );

      await connection.query("DELETE FROM pc_build_items WHERE build_id = ?", [id]);

      if (items && items.length > 0) {
        const insertItemsQuery = "INSERT INTO pc_build_items (build_id, part_id, quantity, price, total_price) VALUES ?";
        const values = items.map(item => [
          id, 
          item.id, // Lưu chính xác id linh kiện đại diện từ bảng pc_parts
          item.quantity || 1, 
          item.price || 0, 
          (item.price || 0) * (item.quantity || 1)
        ]);
        await connection.query(insertItemsQuery, [values]);
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // 4. Xóa cấu hình máy (Giữ nguyên)
  static async delete(id) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query("DELETE FROM pc_build_items WHERE build_id = ?", [id]);
      const [result] = await connection.query("DELETE FROM pc_builds WHERE id = ?", [id]);

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = PcBuild;