const { pool } = require("../../config/database");
const Product = require("../../models/Product");

const { deleteFile, deleteUploadedFiles } = require("../../utils/fileHelper");

const {
  validateCreateProduct,
  validateUpdateProduct,
} = require("../../validations/productValidation");

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.getById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết sản phẩm thành công.",
      data: product,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    // FE gửi keyword
    const search = req.query.keyword?.trim() || req.query.search?.trim() || "";

    const category = req.query.category || "";

    // FE gửi active / inactive
    let status = req.query.status || "";

    if (status === "active") {
      status = 1;
    } else if (status === "inactive") {
      status = 0;
    }

    const stock = req.query.stock || "";

    const sort = req.query.sort || "newest";

    const result = await Product.getAll({
      page,
      limit,
      search,
      category,
      status,
      stock,
      sort,
    });

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách sản phẩm thành công.",
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Get Products Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  }
};

const getTrashProducts = async (req, res) => {
  try {
    const result = await Product.getTrash(req.query);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách sản phẩm đã xóa thành công.",
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  }
};

const getStockWarning = async (req, res) => {
  try {
    const lowStock = Number(req.query.low_stock) || 5;

    const result = await Product.getStockWarning(lowStock);

    return res.status(200).json({
      success: true,

      message: "Lấy danh sách cảnh báo tồn kho thành công.",

      data: {
        out_of_stock: result.outOfStock,

        low_stock: result.lowStock,
      },
    });
  } catch (error) {
    console.error("Stock Warning Error:", error);

    return res.status(500).json({
      success: false,

      message: "Lỗi máy chủ.",

      error: error.message,
    });
  }
};

const getProductStatistics = async (req, res) => {
  try {
    const statistics = await Product.getStatistics();

    return res.status(200).json({
      success: true,

      message: "Lấy thống kê sản phẩm thành công.",

      data: statistics,
    });
  } catch (error) {
    console.error("Statistics Error:", error);

    return res.status(500).json({
      success: false,

      message: "Lỗi máy chủ.",

      error: error.message,
    });
  }
};

const getTopSellingProducts = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;

    const products = await Product.getTopSelling(limit);

    return res.status(200).json({
      success: true,

      message: "Lấy danh sách sản phẩm bán chạy thành công.",

      data: products,
    });
  } catch (error) {
    console.error("Top Selling Error:", error);

    return res.status(500).json({
      success: false,

      message: "Lỗi máy chủ.",

      error: error.message,
    });
  }
};

const getNewestProducts = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;

    const products = await Product.getNewestProducts(limit);

    return res.status(200).json({
      success: true,

      message: "Lấy danh sách sản phẩm mới thành công.",

      data: products,
    });
  } catch (error) {
    console.error("Newest Products Error:", error);

    return res.status(500).json({
      success: false,

      message: "Lỗi máy chủ.",

      error: error.message,
    });
  }
};

const createProduct = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    // Validate
    const errors = await validateCreateProduct(req.body);

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({
        success: false,
        message: "Dữ liệu không hợp lệ.",
        errors,
      });
    }

    const exists = await Product.isSkuExists(req.body.sku);

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "SKU đã tồn tại.",
      });
    }

    // Thumbnail
    const thumbnail = req.files?.thumbnail?.[0]
      ? `/uploads/products/${req.files.thumbnail[0].filename}`
      : null;

    // Gallery
    const gallery = req.files?.gallery || [];

    // Specifications
    let specifications = [];

    try {
      specifications = req.body.specifications
        ? JSON.parse(req.body.specifications)
        : [];
      if (!Array.isArray(specifications)) {
        return res.status(422).json({
          success: false,
          message: "Thông số kỹ thuật không hợp lệ.",
        });
      }

      for (const item of specifications) {
        if (!item.spec_key?.trim()) {
          return res.status(422).json({
            success: false,
            message: "Tên thông số không được để trống.",
          });
        }

        if (!item.spec_value?.trim()) {
          return res.status(422).json({
            success: false,
            message: "Giá trị thông số không được để trống.",
          });
        }
      }
    } catch {
      return res.status(422).json({
        success: false,
        message: "Thông số kỹ thuật không hợp lệ.",
      });
    }

    if (!req.files?.thumbnail?.length) {
      return res.status(422).json({
        success: false,
        message: "Thumbnail là bắt buộc.",
      });
    }

    // Data
    const data = {
      ...req.body,
      sale_price: req.body.sale_price !== "" ? req.body.sale_price : null,
      thumbnail,
    };

    // Transaction
    await connection.beginTransaction();

    const productId = await Product.create(connection, data);

    if (gallery.length > 0) {
      await Product.insertGallery(connection, productId, gallery);
    }
    if (Array.isArray(specifications) && specifications.length > 0) {
      await Product.insertSpecifications(connection, productId, specifications);
    }
    await connection.commit();

    const product = await Product.getById(productId);

    return res.status(201).json({
      success: true,
      message: "Thêm sản phẩm thành công.",
      data: product,
    });
  } catch (error) {
    await connection.rollback();

    const uploadedFiles = [
      ...(req.files?.thumbnail || []),
      ...(req.files?.gallery || []),
    ];

    deleteUploadedFiles(uploadedFiles);

    console.error("Create Product Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const getStockHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.getByIdIncludeDeleted(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    const history = await Product.getStockHistory(id);

    return res.status(200).json({
      success: true,
      message: "Lấy lịch sử tồn kho thành công.",
      data: history,
    });
  } catch (error) {
    console.error("Get Stock History Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  }
};
const updateProduct = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    // Kiểm tra sản phẩm tồn tại
    const product = await Product.getById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    // Validate dữ liệu
    const errors = await validateUpdateProduct(id, req.body);

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({
        success: false,
        message: "Dữ liệu không hợp lệ.",
        errors,
      });
    }

    // Giữ thumbnail cũ
    let thumbnail = product.thumbnail;

    // Nếu có upload thumbnail mới
    if (req.files?.thumbnail?.length) {
      thumbnail = `/uploads/products/${req.files.thumbnail[0].filename}`;
    }

    // Gallery upload mới
    const gallery = req.files?.gallery || [];

    let specifications = [];

    try {
      specifications = req.body.specifications
        ? JSON.parse(req.body.specifications)
        : [];
      if (!Array.isArray(specifications)) {
        return res.status(422).json({
          success: false,
          message: "Thông số kỹ thuật không hợp lệ.",
        });
      }

      for (const item of specifications) {
        if (!item.spec_key?.trim()) {
          return res.status(422).json({
            success: false,
            message: "Tên thông số không được để trống.",
          });
        }

        if (!item.spec_value?.trim()) {
          return res.status(422).json({
            success: false,
            message: "Giá trị thông số không được để trống.",
          });
        }
      }
    } catch {
      return res.status(422).json({
        success: false,
        message: "Thông số kỹ thuật không hợp lệ.",
      });
    }

    const data = {
      ...req.body,
      sale_price: req.body.sale_price !== "" ? req.body.sale_price : null,
      thumbnail,
    };
    await connection.beginTransaction();

    // Update bảng products
    await Product.update(connection, id, data);

    if (gallery.length > 0) {
      const oldGallery = await Product.getGallery(id);

      await Product.deleteGallery(connection, id);

      (oldGallery || []).forEach((image) => {
        deleteFile(image.image_url);
      });

      await Product.insertGallery(connection, id, gallery);
    }

    if (Number(product.quantity) !== Number(data.quantity)) {
      await Product.insertStockLog(connection, {
        productId: id,
        type: "adjust",
        quantity: data.quantity,
        quantityBefore: product.quantity,
        quantityAfter: data.quantity,
        note: "Admin cập nhật sản phẩm",
      });
    }

    await Product.deleteSpecifications(connection, id);

    if (Array.isArray(specifications) && specifications.length > 0) {
      await Product.insertSpecifications(connection, id, specifications);
    }

    await connection.commit();

    // Chỉ xóa thumbnail cũ nếu admin upload thumbnail mới
    if (req.files?.thumbnail?.length) {
      deleteFile(product.thumbnail);
    }

    const newProduct = await Product.getById(id);

    return res.status(200).json({
      success: true,
      message: "Cập nhật sản phẩm thành công.",
      data: newProduct,
    });
  } catch (error) {
    await connection.rollback();

    // Nếu upload thumbnail mới nhưng lỗi thì xóa file mới
    deleteUploadedFiles([
      ...(req.files?.thumbnail || []),
      ...(req.files?.gallery || []),
    ]);

    console.error("Update Product Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const uploadGalleryImages = async (req, res) => {
  const connection = await pool.getConnection();

  console.log(req.files);
  console.log(req.body);

  try {
    const { id } = req.params;

    const product = await Product.getById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    const files = req.files || [];

    const oldGallery = await Product.getGallery(id);

    if (oldGallery.length + files.length > 10) {
      return res.status(422).json({
        success: false,
        message: "Mỗi sản phẩm chỉ được tối đa 10 ảnh.",
      });
    }

    if (!files.length) {
      return res.status(422).json({
        success: false,
        message: "Vui lòng chọn ảnh.",
      });
    }

    await connection.beginTransaction();

    await Product.addGallery(connection, id, files);

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Thêm ảnh thành công.",
      data: await Product.getGallery(id),
    });
  } catch (error) {
    await connection.rollback();

    deleteUploadedFiles(req.files);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const deleteGalleryImage = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { imageId } = req.params;

    const image = await Product.getGalleryImage(imageId);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ảnh.",
      });
    }

    await connection.beginTransaction();

    await Product.deleteGalleryImage(connection, imageId);

    await connection.commit();

    deleteFile(image.image_url);

    return res.status(200).json({
      success: true,
      message: "Xóa ảnh thành công.",
    });
  } catch (error) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const toggleProductStatus = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const product = await Product.getById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    await connection.beginTransaction();

    await Product.toggleStatus(connection, id);

    await connection.commit();

    const updatedProduct = await Product.getById(id);

    return res.status(200).json({
      success: true,
      message: "Đổi trạng thái sản phẩm thành công.",
      data: updatedProduct,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Toggle Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const duplicateProduct = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    // Lấy sản phẩm gốc
    const product = await Product.getById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    await connection.beginTransaction();

    // Tạo sản phẩm mới
    const newProductId = await Product.duplicateProduct(connection, product);

    // Copy gallery
    await Product.duplicateGallery(connection, id, newProductId);

    // Copy specifications
    await Product.duplicateSpecifications(connection, id, newProductId);

    await connection.commit();

    const newProduct = await Product.getById(newProductId);

    return res.status(201).json({
      success: true,
      message: "Nhân bản sản phẩm thành công.",
      data: newProduct,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Duplicate Product Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};
const adjustStock = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const { type, quantity, note } = req.body;

    const product = await Product.getById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    const qty = Number(quantity);

    if (qty <= 0 || Number.isNaN(qty)) {
      return res.status(422).json({
        success: false,
        message: "Số lượng không hợp lệ.",
      });
    }

    let newQuantity = product.quantity;

    switch (type) {
      case "import":
        newQuantity += qty;
        break;

      case "export":
        if (product.quantity < qty) {
          return res.status(400).json({
            success: false,
            message: "Không đủ tồn kho.",
          });
        }

        newQuantity -= qty;
        break;

      case "adjust":
        newQuantity = qty;
        break;

      default:
        return res.status(422).json({
          success: false,
          message: "Loại điều chỉnh không hợp lệ.",
        });
    }

    await connection.beginTransaction();
    await Product.updateQuantity(connection, id, newQuantity);
    await Product.insertStockLog(connection, {
      productId: id,

      type,

      quantity: qty,

      quantityBefore: product.quantity,

      quantityAfter: newQuantity,

      note,
    });
    await connection.commit();

    const newProduct = await Product.getById(id);

    return res.status(200).json({
      success: true,
      message: "Điều chỉnh tồn kho thành công.",
      data: newProduct,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Adjust Stock Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const deleteProduct = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    // Kiểm tra sản phẩm
    const product = await Product.getById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }
    const used = await Product.isUsedInOrders(id);

    if (used) {
      return res.status(409).json({
        success: false,
        message: "Sản phẩm đã phát sinh đơn hàng, không thể xóa.",
      });
    }

    await connection.beginTransaction();

    // Soft Delete
    await Product.softDelete(connection, id);

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Xóa sản phẩm thành công.",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Delete Product Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const bulkDeleteProducts = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(422).json({
        success: false,
        message: "Danh sách sản phẩm không hợp lệ.",
      });
    }

    await connection.beginTransaction();

    for (const id of ids) {
      const used = await Product.isUsedInOrders(id);

      if (used) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: `Sản phẩm ID ${id} đã phát sinh đơn hàng, không thể xóa.`,
        });
      }
    }

    await Product.bulkDelete(connection, ids);

    await connection.commit();

    return res.status(200).json({
      success: true,

      message: "Xóa nhiều sản phẩm thành công.",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Bulk Delete Error:", error);

    return res.status(500).json({
      success: false,

      message: "Lỗi máy chủ.",

      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const bulkForceDeleteProducts = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(422).json({
        success: false,
        message: "Danh sách sản phẩm không hợp lệ.",
      });
    }

    const deleteFiles = [];

    await connection.beginTransaction();

    for (const id of ids) {
      const product = await Product.getDeletedById(id);

      if (!product) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: `Không tìm thấy sản phẩm ID ${id}.`,
        });
      }

      if (!product.deleted_at) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: `Sản phẩm ID ${id} chưa nằm trong thùng rác.`,
        });
      }

      const files = await Product.getFilesForDelete(id);

      deleteFiles.push(files);

      await Product.forceDelete(connection, id);
    }

    await connection.commit();

    for (const files of deleteFiles) {
      if (!files) continue;

      if (files.thumbnail) {
        deleteFile(files.thumbnail);
      }

      for (const image of files.gallery || []) {
        deleteFile(image.image_url);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Xóa vĩnh viễn các sản phẩm thành công.",
    });
  } catch (error) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const bulkRestoreProducts = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(422).json({
        success: false,
        message: "Danh sách sản phẩm không hợp lệ.",
      });
    }

    await connection.beginTransaction();

    const affectedRows = await Product.bulkRestore(connection, ids);

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Khôi phục nhiều sản phẩm thành công.",
      restored: affectedRows,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Bulk Restore Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const restoreProduct = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const product = await Product.getDeletedById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    const skuExists = await Product.isRestoreSkuExists(product.sku, id);

    if (skuExists) {
      return res.status(409).json({
        success: false,
        message: "SKU đã được sản phẩm khác sử dụng.",
      });
    }

    if (!product.deleted_at) {
      return res.status(400).json({
        success: false,
        message: "Sản phẩm chưa bị xóa.",
      });
    }

    await connection.beginTransaction();

    await Product.restore(connection, id);

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Khôi phục sản phẩm thành công.",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Restore Product Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const forceDeleteProduct = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const product = await Product.getDeletedById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    if (!product.deleted_at) {
      return res.status(400).json({
        success: false,
        message: "Sản phẩm chưa nằm trong thùng rác.",
      });
    }

    const files = await Product.getFilesForDelete(id);

    await connection.beginTransaction();

    await Product.forceDelete(connection, id);

    await connection.commit();

    if (files) {
      if (files.thumbnail) {
        deleteFile(files.thumbnail);
      }

      for (const image of files.gallery || []) {
        deleteFile(image.image_url);
      }
    }

    return res.status(200).json({
      success: true,

      message: "Xóa vĩnh viễn sản phẩm thành công.",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Force Delete Error:", error);

    return res.status(500).json({
      success: false,

      message: "Lỗi máy chủ.",

      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const getStockReport = async (req, res) => {
  try {
    const report = await Product.getStockReport();

    return res.status(200).json({
      success: true,

      message: "Lấy báo cáo tồn kho thành công.",

      data: report,
    });
  } catch (error) {
    console.error("Stock Report Error:", error);

    return res.status(500).json({
      success: false,

      message: "Lỗi máy chủ.",

      error: error.message,
    });
  }
};

const getDashboard = async (req, res) => {
  try {
    const [statistics, topSelling, newest, stockWarning] = await Promise.all([
      Product.getStatistics(),
      Product.getTopSelling(5),
      Product.getNewestProducts(5),
      Product.getStockWarning(5),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        statistics,
        topSelling,
        newest,
        stockWarning,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
    });
  }
};

const checkSku = async (req, res) => {
  try {
    const { sku, id } = req.query;

    if (!sku || !sku.trim()) {
      return res.status(422).json({
        success: false,
        message: "SKU không được để trống.",
      });
    }

    const exists = await Product.checkSku(sku.trim(), id ? Number(id) : null);

    return res.status(200).json({
      success: true,
      data: {
        exists,
      },
    });
  } catch (error) {
    console.error("Check SKU Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  }
};

const searchSuggestion = async (req, res) => {
  try {
    const keyword = req.query.q?.trim() || "";

    if (!keyword) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const products = await Product.searchSuggestion(keyword);

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Search Suggestion Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  }
};

const getFormData = async (req, res) => {
  try {
    const data = await Product.getFormData();

    return res.status(200).json({
      success: true,
      message: "Lấy dữ liệu form thành công.",
      data,
    });
  } catch (error) {
    console.error("Get Form Data Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  }
};

module.exports = {
  getAllProducts,
  getTrashProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  forceDeleteProduct,
  bulkDeleteProducts,
  bulkForceDeleteProducts,
  bulkRestoreProducts,
  toggleProductStatus,
  duplicateProduct,
  getStockWarning,
  getProductStatistics,
  getTopSellingProducts,
  getNewestProducts,
  adjustStock,
  getStockReport,
  getStockHistory,
  getDashboard,
  uploadGalleryImages,
  deleteGalleryImage,
  checkSku,
  searchSuggestion,
  getFormData,
};
