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
      const result = await PcBuild.create(req.body);
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
  getProductsByCategory: async (req, res, next) => {
    try {
      const { category } = req.query;
      const products = await Product.findByCategory(category);
      return res.status(200).json(products);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = pcBuildController;