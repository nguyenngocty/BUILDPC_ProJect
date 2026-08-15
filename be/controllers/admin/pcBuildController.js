const PcBuild = require("../../models/PcBuild");
const Product = require("../../models/Product");
const { pool } = require("../../config/database");

const pcBuildController = {
  getBuildCategories: async (req, res, next) => {
    try {
      const queryStr = `
        SELECT 
          slug AS \`key\`, 
          name AS \`label\` 
        FROM categories 
        WHERE slug IN ('cpu', 'mainboard', 'ram', 'vga', 'cooling', 'psu', 'storage', 'case')
        ORDER BY id ASC
      `;
      
      // Dùng cú pháp async/await đồng bộ với pool của dự án
      const [results] = await pool.query(queryStr);
      return res.status(200).json(results);
    } catch (error) {
      console.error("Lỗi lấy danh mục phần cứng từ DB:", error);
      next(error);
    }
  },
  // 1. GET ALL BUILDS
  getAllBuilds: async (req, res, next) => {
    try {
      const builds = await PcBuild.findAll();
      return res.status(200).json(builds);
    } catch (error) {
      next(error);
    }
  },

  // 2. CREATE NEW BUILD
  createBuild: async (req, res, next) => {
    try {
      // Ép kiểu status: Nếu là 'active', '1', true thì nhận 1, ngược lại là 0
      let rawStatus = req.body.status;
      let statusValue = 1; // Mặc định là hiện
      
      if (rawStatus !== undefined && rawStatus !== null) {
        if (rawStatus === 'active' || rawStatus == 1 || rawStatus === true || rawStatus === '1') {
          statusValue = 1;
        } else {
          statusValue = 0;
        }
      }

      // Tạo một object data mới đã được làm sạch status
      const buildData = {
        ...req.body,
        status: statusValue
      };

      const result = await PcBuild.create(buildData);
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  // 3. UPDATE BUILD
  updateBuild: async (req, res, next) => {
    try {
      const { id } = req.params;
      const success = await PcBuild.update(id, req.body);
      
      if (!success) return res.status(404).json({ message: "Không tìm thấy cấu hình mẫu" });
      return res.status(200).json({ success: true, message: "Cập nhật thành công!" });
    } catch (error) {
      next(error);
    }
  },

  // 4. DELETE BUILD
  deleteBuild: async (req, res, next) => {
    try {
      const { id } = req.params;
      const success = await PcBuild.delete(id);
      
      if (!success) return res.status(404).json({ message: "Không tìm thấy cấu hình để xóa" });
      return res.status(200).json({ success: true, message: "Xóa cấu hình mẫu thành công" });
    } catch (error) {
      next(error);
    }
  },

  // 5. GET PRODUCTS BY CATEGORY
  getAllComponents: async (req, res, next) => {
    try {
      const { category } = req.query; // Lấy category từ query param

      let queryStr = `
      SELECT 
        p.id,
        p.name,
        p.price,
        p.sale_price,
        p.quantity,
        p.thumbnail AS image,
        p.socket,
        p.ram_type,
        pt.type_id,
        pt.is_visible, -- Thêm dòng này để lấy trạng thái
        c.slug AS category_key,
        c.name AS category,
        pt.specifications
      FROM products p
      JOIN pc_parts pt ON p.id = pt.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.deleted_at IS NULL
    `;

      const params = [];

      // Nếu Frontend có truyền param category (VD: CPU, MAINBOARD, RAM...)
      if (category) {
        queryStr += ` AND (UPPER(c.slug) LIKE ? OR UPPER(c.name) LIKE ?)`;
        params.push(`%${category.toUpperCase()}%`, `%${category.toUpperCase()}%`);
      }

      const [rows] = await pool.query(queryStr, params);

      const formattedData = rows.map((row) => {
        let specs = {};
        if (typeof row.specifications === "string") {
          try {
            specs = JSON.parse(row.specifications);
          } catch (e) {
            specs = {};
          }
        } else if (typeof row.specifications === "object" && row.specifications !== null) {
          specs = row.specifications;
        }

        return {
          ...row,
          ...specs,
          price: Number(row.sale_price) > 0 ? Number(row.sale_price) : Number(row.price),
        };
      });

      return res.status(200).json(formattedData);
    } catch (error) {
      console.error("Lỗi lấy kho linh kiện:", error);
      next(error);
    }
  },

  getProductsByCategory: async (req, res, next) => {
    try {
      const { category } = req.query;
      const products = await Product.findByCategory(category);
      return res.status(200).json(products);
    } catch (error) {
      next(error);
    }
  },
// 6. TOGGLE COMPONENT VISIBILITY (Ẩn/Hiện linh kiện)
toggleVisibility: async (req, res, next) => {
  try {
    const { id } = req.params; // Đây là giá trị product.product_id hoặc product.id truyền lên
    const { is_visible } = req.body;

    // Kiểm tra xem bảng pc_parts của bạn dùng khóa chính là 'id' hay 'product_id' để update:
    // Thường thì bảng pc_parts liên kết với products thông qua cột product_id. 
    // Ta sẽ update dựa vào product_id trước:
    const query = `UPDATE pc_parts SET is_visible = ? WHERE product_id = ? OR id = ?`;
    const [result] = await pool.query(query, [is_visible, id, id]);

    return res.status(200).json({ 
      success: true, 
      message: "Đã cập nhật trạng thái linh kiện!",
      affectedRows: result.affectedRows 
    });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái ẩn/hiện:", error);
    next(error);
  }
},
  updateBuildStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const query = `UPDATE pc_builds SET status = ? WHERE id = ?`;
      await pool.query(query, [status, id]);

      return res.status(200).json({ success: true, message: "Đã cập nhật trạng thái bộ PC!" });
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái bộ PC:", error);
      next(error);
    }
  }
};
module.exports = pcBuildController;
