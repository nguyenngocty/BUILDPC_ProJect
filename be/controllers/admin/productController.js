const { pool } = require("../../config/database");

const Product = require("../../models/Product");
const ProductVariant = require("../../models/ProductVariant");

const { deleteFile, deleteUploadedFiles } = require("../../utils/fileHelper");

const {
  validateCreateProduct,
  validateUpdateProduct,

  parseProductOptions,
  parseProductVariants,
  parseProductSpecifications,
} = require("../../validations/productValidation");

// ============================================================
// HELPERS
// ============================================================

const getUploadedProductFiles = (req) => {
  if (!req?.files) {
    return [];
  }

  // uploadProduct.fields(...)
  if (!Array.isArray(req.files)) {
    return [...(req.files.thumbnail || []), ...(req.files.gallery || [])];
  }

  // uploadProduct.array(...)
  return req.files;
};

const cleanupUploadedProductFiles = (req) => {
  const files = getUploadedProductFiles(req);

  if (files.length > 0) {
    deleteUploadedFiles(files);
  }
};

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object || {}, key);

const normalizeNullableNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return Number(value);
};

const makeDuplicateSku = (originalSku, index = null) => {
  const timestamp = Date.now();

  const suffix =
    index === null ? `-COPY-${timestamp}` : `-COPY-${timestamp}-${index}`;

  /*
   * Để tránh SKU quá dài.
   * Giữ tổng độ dài quanh mức an toàn.
   */
  const maxBaseLength = Math.max(1, 95 - suffix.length);

  const base = String(originalSku || "SKU")
    .trim()
    .slice(0, maxBaseLength);

  return `${base}${suffix}`;
};

const normalizeVariantValuesForDuplicate = (values = []) => {
  const result = {};

  if (!Array.isArray(values)) {
    return result;
  }

  for (const value of values) {
    const code = ProductVariant.normalizeCode(value.option_code);

    if (!code) continue;

    result[code] = value.value;
  }

  return result;
};

// ============================================================
// GET PRODUCT BY ID
// ============================================================

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
    console.error("Get Product By ID Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  }
};

// ============================================================
// GET ALL PRODUCTS
// ============================================================

const getAllProducts = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;

    const limit = Number(req.query.limit) || 10;

    const search = req.query.keyword?.trim() || req.query.search?.trim() || "";

    const category = req.query.category || "";

    let status = req.query.status ?? "";

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

// ============================================================
// GET TRASH
// ============================================================

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
    console.error("Get Trash Products Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  }
};

// ============================================================
// STOCK WARNING
// ============================================================

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

// ============================================================
// STATISTICS
// ============================================================

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

// ============================================================
// TOP SELLING
// ============================================================

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

// ============================================================
// NEWEST
// ============================================================

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

// ============================================================
// CREATE PRODUCT
// ============================================================

const createProduct = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

  try {
    // ========================================================
    // VALIDATION
    // ========================================================

    const errors = await validateCreateProduct(req.body);

    if (Object.keys(errors).length > 0) {
      cleanupUploadedProductFiles(req);

      return res.status(422).json({
        success: false,
        message: "Dữ liệu không hợp lệ.",
        errors,
      });
    }

    // ========================================================
    // THUMBNAIL
    // ========================================================

    if (!req.files?.thumbnail?.length) {
      cleanupUploadedProductFiles(req);

      return res.status(422).json({
        success: false,
        message: "Thumbnail là bắt buộc.",
      });
    }

    const thumbnail = `/uploads/products/${req.files.thumbnail[0].filename}`;

    const gallery = req.files?.gallery || [];

    // ========================================================
    // PARSE JSON FIELDS
    // ========================================================

    const specifications = parseProductSpecifications(req.body);

    const options = parseProductOptions(req.body);

    const variants = parseProductVariants(req.body);

    // ========================================================
    // PRODUCT BASE DATA
    //
    // Nếu có variants, các trường sku/price/quantity ở products
    // chỉ là dữ liệu tạm ban đầu.
    //
    // Sau khi variants được tạo:
    // syncProductAggregate() sẽ đồng bộ lại theo default variant.
    // ========================================================

    const data = {
      ...req.body,

      sku: String(req.body.sku || "").trim(),

      price: Number(req.body.price),

      sale_price: normalizeNullableNumber(req.body.sale_price),

      quantity: Number(req.body.quantity || 0),

      status: req.body.status !== undefined ? Number(req.body.status) : 1,

      thumbnail,
    };

    // ========================================================
    // TRANSACTION
    // ========================================================

    await connection.beginTransaction();

    transactionStarted = true;

    // 1. Product
    const productId = await Product.create(connection, data);

    // 2. Product gallery
    if (gallery.length > 0) {
      await Product.insertGallery(connection, productId, gallery);
    }

    // 3. Specifications
    if (specifications.length > 0) {
      await Product.insertSpecifications(connection, productId, specifications);
    }

    // 4. Variants
    //
    // Nếu variants = []
    // → tự tạo variant "Mặc định".
    await ProductVariant.createProductVariants(connection, productId, {
      options,
      variants,

      fallback: {
        sku: data.sku,
        price: data.price,

        sale_price: data.sale_price,

        quantity: data.quantity,

        thumbnail: data.thumbnail,

        status: data.status,
      },
    });

    // 5. Đồng bộ products
    await ProductVariant.syncProductAggregate(connection, productId);

    await connection.commit();

    transactionStarted = false;

    const product = await Product.getById(productId);

    return res.status(201).json({
      success: true,

      message:
        variants.length > 0
          ? "Thêm sản phẩm và biến thể thành công."
          : "Thêm sản phẩm thành công.",

      data: product,
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    cleanupUploadedProductFiles(req);

    console.error("Create Product Error:", error);

    /*
     * Lỗi nghiệp vụ từ Model Variant.
     */
    if (
      error.message?.includes("đã tồn tại") ||
      error.message?.includes("không hợp lệ") ||
      error.message?.includes("bị trùng") ||
      error.message?.includes("chưa chọn") ||
      error.message?.includes("không thuộc")
    ) {
      return res.status(422).json({
        success: false,
        message: "Dữ liệu biến thể không hợp lệ.",
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

// ============================================================
// UPDATE PRODUCT
// ============================================================

const updateProduct = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

  let oldThumbnailToDelete = null;

  let oldGalleryToDelete = [];

  try {
    const { id } = req.params;

    // ========================================================
    // PRODUCT EXISTS
    // ========================================================

    const product = await Product.getById(id);

    if (!product) {
      cleanupUploadedProductFiles(req);

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    // ========================================================
    // VALIDATION
    // ========================================================

    const errors = await validateUpdateProduct(id, req.body);

    if (Object.keys(errors).length > 0) {
      cleanupUploadedProductFiles(req);

      return res.status(422).json({
        success: false,
        message: "Dữ liệu không hợp lệ.",
        errors,
      });
    }

    // ========================================================
    // FILE DATA
    // ========================================================

    let thumbnail = product.thumbnail;

    if (req.files?.thumbnail?.length) {
      thumbnail = `/uploads/products/${req.files.thumbnail[0].filename}`;

      oldThumbnailToDelete = product.thumbnail;
    }

    const gallery = req.files?.gallery || [];

    // ========================================================
    // PARSE
    // ========================================================

    const specifications = parseProductSpecifications(req.body);

    const options = parseProductOptions(req.body);

    const variants = parseProductVariants(req.body);

    /*
     * Rất quan trọng:
     *
     * FE cũ có thể chưa gửi options/variants.
     *
     * Nếu sản phẩm đang có nhiều biến thể và controller tự coi
     * việc thiếu variants = variants [],
     * toàn bộ variant sẽ bị xóa ngoài ý muốn.
     *
     * Vì vậy phải biết client có THỰC SỰ gửi field variant hay không.
     */
    const variantPayloadProvided =
      hasOwn(req.body, "variants") || hasOwn(req.body, "options");

    const currentVariantData = await ProductVariant.getProductVariantData(id);

    const oldQuantity = Number(product.quantity || 0);

    // ========================================================
    // PRODUCT BASE DATA
    // ========================================================

    const data = {
      ...req.body,

      sku: String(req.body.sku || "").trim(),

      price: Number(req.body.price),

      sale_price: normalizeNullableNumber(req.body.sale_price),

      quantity: Number(req.body.quantity || 0),

      status: Number(req.body.status),

      thumbnail,
    };

    // ========================================================
    // TRANSACTION
    // ========================================================

    await connection.beginTransaction();

    transactionStarted = true;

    // ========================================================
    // UPDATE PRODUCT BASE
    // ========================================================

    await Product.update(connection, id, data);

    // ========================================================
    // GALLERY
    //
    // Giữ behavior hiện tại:
    // nếu upload gallery mới → thay toàn bộ gallery.
    // ========================================================

    if (gallery.length > 0) {
      oldGalleryToDelete = await Product.getGallery(id);

      await Product.deleteGallery(connection, id);

      await Product.insertGallery(connection, id, gallery);
    }

    // ========================================================
    // SPECIFICATIONS
    // ========================================================

    await Product.deleteSpecifications(connection, id);

    if (specifications.length > 0) {
      await Product.insertSpecifications(connection, id, specifications);
    }

    // ========================================================
    // VARIANTS
    // ========================================================

    if (variantPayloadProvided) {
      /*
       * FE mới gửi variants/options.
       *
       * → Sync đầy đủ.
       */
      await ProductVariant.syncProductVariants(connection, id, {
        options,
        variants,

        fallback: {
          sku: data.sku,

          price: data.price,

          sale_price: data.sale_price,

          quantity: data.quantity,

          thumbnail: data.thumbnail,

          status: data.status,
        },
      });
    } else if (!currentVariantData.has_variants) {
      /*
       * FE cũ.
       *
       * Product chỉ có 1 variant mặc định.
       *
       * → Đồng bộ default variant theo Product.
       */
      await ProductVariant.syncProductVariants(connection, id, {
        options: [],
        variants: [],

        fallback: {
          sku: data.sku,

          price: data.price,

          sale_price: data.sale_price,

          quantity: data.quantity,

          thumbnail: data.thumbnail,

          status: data.status,
        },
      });
    } else {
      /*
       * FE chưa hỗ trợ variants nhưng Product đã có
       * nhiều variants.
       *
       * Không được phá variants.
       *
       * Variant tiếp tục là source-of-truth.
       */
      await ProductVariant.syncProductAggregate(connection, id);
    }

    // ========================================================
    // STOCK LOG
    // ========================================================

    const [[updatedStockRow]] = await connection.execute(
      `
          SELECT quantity
          FROM products
          WHERE id = ?
          LIMIT 1
        `,
      [id],
    );

    const finalQuantity = Number(updatedStockRow?.quantity || 0);

    if (oldQuantity !== finalQuantity) {
      await Product.insertStockLog(connection, {
        productId: Number(id),

        variantId: null,

        type: "adjust",

        quantity: Math.abs(finalQuantity - oldQuantity),

        quantityBefore: oldQuantity,

        quantityAfter: finalQuantity,

        productQuantityBefore: oldQuantity,

        productQuantityAfter: finalQuantity,

        referenceType: null,
        referenceId: null,

        note: "Admin cập nhật tổng thể sản phẩm / biến thể",
      });
    }

    await connection.commit();

    transactionStarted = false;

    // ========================================================
    // DELETE OLD PHYSICAL FILES AFTER COMMIT
    // ========================================================

    if (oldThumbnailToDelete && oldThumbnailToDelete !== thumbnail) {
      deleteFile(oldThumbnailToDelete);
    }

    for (const image of oldGalleryToDelete || []) {
      deleteFile(image.image_url);
    }

    const newProduct = await Product.getById(id);

    return res.status(200).json({
      success: true,
      message: "Cập nhật sản phẩm thành công.",
      data: newProduct,
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    /*
     * File mới upload chưa được commit.
     */
    cleanupUploadedProductFiles(req);

    console.error("Update Product Error:", error);

    if (
      error.message?.includes("đã tồn tại") ||
      error.message?.includes("không hợp lệ") ||
      error.message?.includes("bị trùng") ||
      error.message?.includes("chưa chọn") ||
      error.message?.includes("không thuộc") ||
      error.message?.includes("Không tìm thấy biến thể")
    ) {
      return res.status(422).json({
        success: false,
        message: "Dữ liệu biến thể không hợp lệ.",
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

// ============================================================
// STOCK HISTORY
// ============================================================

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

// ============================================================
// UPLOAD GALLERY
// ============================================================

const uploadGalleryImages = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

  try {
    const { id } = req.params;

    const product = await Product.getById(id);

    if (!product) {
      cleanupUploadedProductFiles(req);

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    const files = req.files || [];

    if (!files.length) {
      return res.status(422).json({
        success: false,
        message: "Vui lòng chọn ảnh.",
      });
    }

    const oldGallery = await Product.getGallery(id);

    if (oldGallery.length + files.length > 10) {
      cleanupUploadedProductFiles(req);

      return res.status(422).json({
        success: false,
        message: "Mỗi sản phẩm chỉ được tối đa 10 ảnh.",
      });
    }

    await connection.beginTransaction();

    transactionStarted = true;

    await Product.addGallery(connection, id, files);

    await connection.commit();

    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: "Thêm ảnh thành công.",

      data: await Product.getGallery(id),
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    cleanupUploadedProductFiles(req);

    console.error("Upload Gallery Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

// ============================================================
// DELETE GALLERY IMAGE
// ============================================================

const deleteGalleryImage = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

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

    transactionStarted = true;

    await Product.deleteGalleryImage(connection, imageId);

    await connection.commit();

    transactionStarted = false;

    deleteFile(image.image_url);

    return res.status(200).json({
      success: true,
      message: "Xóa ảnh thành công.",
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("Delete Gallery Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

// ============================================================
// TOGGLE PRODUCT STATUS
// ============================================================

const toggleProductStatus = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

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

    transactionStarted = true;

    await Product.toggleStatus(connection, id);

    await connection.commit();

    transactionStarted = false;

    const updatedProduct = await Product.getById(id);

    return res.status(200).json({
      success: true,

      message: "Đổi trạng thái sản phẩm thành công.",

      data: updatedProduct,
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

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

// ============================================================
// DUPLICATE PRODUCT
// ============================================================

const duplicateProduct = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

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

    transactionStarted = true;

    // ========================================================
    // PRODUCT BASE
    // ========================================================

    const newProductId = await Product.duplicateProduct(connection, product);

    // ========================================================
    // GALLERY
    // ========================================================

    await Product.duplicateGallery(connection, id, newProductId);

    // ========================================================
    // SPECIFICATIONS
    // ========================================================

    await Product.duplicateSpecifications(connection, id, newProductId);

    // ========================================================
    // Lấy Product mới bằng chính connection transaction
    // ========================================================

    const [[newBaseProduct]] = await connection.execute(
      `
          SELECT
            id,
            sku,
            price,
            sale_price,
            quantity,
            thumbnail,
            status

          FROM products

          WHERE id = ?

          LIMIT 1
        `,
      [newProductId],
    );

    // ========================================================
    // DUPLICATE VARIANTS
    // ========================================================

    const originalOptions = await ProductVariant.getOptionsByProductId(
      id,
      connection,
    );

    const originalVariants = await ProductVariant.getVariantsByProductId(
      id,
      {},
      connection,
    );

    if (originalVariants.length > 0) {
      const duplicatedVariants = originalVariants.map((variant, index) => ({
        sku: makeDuplicateSku(variant.sku, index + 1),

        variant_name: variant.variant_name,

        price: variant.price,

        sale_price: variant.sale_price,

        quantity: variant.quantity,

        thumbnail: variant.thumbnail,

        // Product copy mặc định đang ẩn.
        status: 0,

        is_default: Number(variant.is_default) === 1,

        sort_order: variant.sort_order,

        values: normalizeVariantValuesForDuplicate(variant.values),

        /*
         * Giữ reference ảnh hiện tại.
         *
         * Chưa copy physical image ở bước này.
         */
        images: (variant.images || []).map((image) => ({
          image_url: image.image_url,

          sort_order: image.sort_order,

          is_primary: image.is_primary,
        })),
      }));

      await ProductVariant.createProductVariants(connection, newProductId, {
        options: originalOptions,

        variants: duplicatedVariants,

        fallback: newBaseProduct,
      });
    } else {
      /*
       * Product dữ liệu rất cũ chưa có variant.
       */
      await ProductVariant.createProductVariants(connection, newProductId, {
        options: [],
        variants: [],

        fallback: {
          ...newBaseProduct,

          sku: makeDuplicateSku(product.sku),

          status: 0,
        },
      });
    }

    await ProductVariant.syncProductAggregate(connection, newProductId);

    /*
     * Product copy luôn ẩn.
     *
     * syncProductAggregate chỉ sync sku/price/stock,
     * không thay product.status.
     */
    await connection.execute(
      `
        UPDATE products
        SET
          status = 0,
          updated_at = NOW()
        WHERE id = ?
      `,
      [newProductId],
    );

    await connection.commit();

    transactionStarted = false;

    const newProduct = await Product.getById(newProductId);

    return res.status(201).json({
      success: true,

      message: "Nhân bản sản phẩm và biến thể thành công.",

      data: newProduct,
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

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

// ============================================================
// ADJUST STOCK
// ============================================================

const adjustStock = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

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

    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(422).json({
        success: false,
        message: "Số lượng phải là số nguyên lớn hơn 0.",
      });
    }

    const variantData = await ProductVariant.getProductVariantData(id);

    /*
     * Với Product có nhiều variants:
     *
     * Không được chỉnh products.quantity trực tiếp,
     * vì stock thật nằm ở từng variant.
     */
    if (variantData.has_variants) {
      return res.status(409).json({
        success: false,

        message:
          "Sản phẩm có nhiều biến thể. Vui lòng điều chỉnh tồn kho theo từng biến thể.",

        data: {
          variants: variantData.variants,
        },
      });
    }

    const oldQuantity = Number(product.quantity || 0);

    let newQuantity = oldQuantity;

    switch (type) {
      case "import":
        newQuantity = oldQuantity + qty;
        break;

      case "export":
        if (oldQuantity < qty) {
          return res.status(400).json({
            success: false,
            message: "Không đủ tồn kho.",
          });
        }

        newQuantity = oldQuantity - qty;

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

    transactionStarted = true;

    const defaultVariant = await ProductVariant.getDefaultVariant(
      id,
      connection,
    );

    if (defaultVariant) {
      /*
       * Stock thật của product single-variant
       * nằm tại default variant.
       */
      await ProductVariant.updateVariant(connection, id, defaultVariant.id, {
        ...defaultVariant,

        quantity: newQuantity,

        status: defaultVariant.status,

        is_default: 1,
      });

      await ProductVariant.syncProductAggregate(connection, id);
    } else {
      /*
       * Dữ liệu legacy chưa có variant.
       */
      await Product.updateQuantity(connection, id, newQuantity);
    }

    await Product.insertStockLog(connection, {
      productId: Number(id),

      variantId: defaultVariant ? Number(defaultVariant.id) : null,

      type,

      quantity: qty,

      quantityBefore: oldQuantity,

      quantityAfter: newQuantity,

      productQuantityBefore: oldQuantity,

      productQuantityAfter: newQuantity,

      referenceType: null,
      referenceId: null,

      note: String(note || "").trim() || null,
    });

    await connection.commit();

    transactionStarted = false;

    const newProduct = await Product.getById(id);

    return res.status(200).json({
      success: true,
      message: "Điều chỉnh tồn kho thành công.",
      data: newProduct,
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

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

// ============================================================
// SOFT DELETE PRODUCT
// ============================================================

const deleteProduct = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

  try {
    const { id } = req.params;

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

    transactionStarted = true;

    /*
     * Chỉ soft delete Product.
     *
     * KHÔNG soft delete variants ở đây.
     *
     * Lý do:
     * variant có thể đã có variant bị soft-delete riêng.
     * Nếu soft-delete/restrore toàn bộ theo Product thì khi restore
     * sẽ vô tình hồi sinh variant đã xóa trước đó.
     *
     * Product deleted đã đủ để toàn bộ Product không xuất hiện.
     */
    await Product.softDelete(connection, id);

    await connection.commit();

    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: "Xóa sản phẩm thành công.",
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

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

// ============================================================
// BULK DELETE
// ============================================================

const bulkDeleteProducts = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(422).json({
        success: false,
        message: "Danh sách sản phẩm không hợp lệ.",
      });
    }

    await connection.beginTransaction();

    transactionStarted = true;

    for (const id of ids) {
      const used = await Product.isUsedInOrders(id);

      if (used) {
        await connection.rollback();

        transactionStarted = false;

        return res.status(409).json({
          success: false,

          message: `Sản phẩm ID ${id} đã phát sinh đơn hàng, không thể xóa.`,
        });
      }
    }

    await Product.bulkDelete(connection, ids);

    await connection.commit();

    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: "Xóa nhiều sản phẩm thành công.",
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

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

// ============================================================
// RESTORE PRODUCT
// ============================================================

const restoreProduct = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

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
        message: "Sản phẩm chưa bị xóa.",
      });
    }

    const skuExists = await Product.isRestoreSkuExists(product.sku, id);

    if (skuExists) {
      return res.status(409).json({
        success: false,

        message: "SKU đã được sản phẩm khác sử dụng.",
      });
    }

    await connection.beginTransaction();

    transactionStarted = true;

    await Product.restore(connection, id);

    /*
     * Variant không bị soft-delete khi Product vào trash,
     * nên không cần restore variants.
     */

    await connection.commit();

    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: "Khôi phục sản phẩm thành công.",
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

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

// ============================================================
// BULK RESTORE
// ============================================================

const bulkRestoreProducts = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(422).json({
        success: false,
        message: "Danh sách sản phẩm không hợp lệ.",
      });
    }

    /*
     * Kiểm tra SKU trước khi restore.
     */
    for (const id of ids) {
      const product = await Product.getDeletedById(id);

      if (!product) {
        return res.status(404).json({
          success: false,

          message: `Không tìm thấy sản phẩm ID ${id}.`,
        });
      }

      if (!product.deleted_at) {
        return res.status(400).json({
          success: false,

          message: `Sản phẩm ID ${id} chưa nằm trong thùng rác.`,
        });
      }

      const skuExists = await Product.isRestoreSkuExists(product.sku, id);

      if (skuExists) {
        return res.status(409).json({
          success: false,

          message: `SKU của sản phẩm ID ${id} đã được sản phẩm khác sử dụng.`,
        });
      }
    }

    await connection.beginTransaction();

    transactionStarted = true;

    const affectedRows = await Product.bulkRestore(connection, ids);

    await connection.commit();

    transactionStarted = false;

    return res.status(200).json({
      success: true,

      message: "Khôi phục nhiều sản phẩm thành công.",

      restored: affectedRows,
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

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

// ============================================================
// FORCE DELETE PRODUCT
// ============================================================

const forceDeleteProduct = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

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

    const used = await Product.isUsedInOrders(id);

    if (used) {
      return res.status(409).json({
        success: false,

        message: "Sản phẩm đã phát sinh đơn hàng, không thể xóa vĩnh viễn.",
      });
    }

    const files = await Product.getFilesForDelete(id);

    await connection.beginTransaction();

    transactionStarted = true;

    /*
     * Xóa Variant trước Product.
     */
    await ProductVariant.forceDeleteByProduct(connection, id);

    await Product.forceDelete(connection, id);

    await connection.commit();

    transactionStarted = false;

    // ========================================================
    // DELETE PHYSICAL FILES AFTER COMMIT
    // ========================================================

    if (files) {
      if (files.thumbnail) {
        deleteFile(files.thumbnail);
      }

      for (const image of files.gallery || []) {
        deleteFile(image.image_url);
      }

      for (const image of files.variantImages || []) {
        deleteFile(image.image_url);
      }
    }

    return res.status(200).json({
      success: true,

      message: "Xóa vĩnh viễn sản phẩm thành công.",
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

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

// ============================================================
// BULK FORCE DELETE
// ============================================================

const bulkForceDeleteProducts = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(422).json({
        success: false,
        message: "Danh sách sản phẩm không hợp lệ.",
      });
    }

    const filesToDelete = [];

    /*
     * Kiểm tra toàn bộ trước khi bắt đầu xóa.
     */
    for (const id of ids) {
      const product = await Product.getDeletedById(id);

      if (!product) {
        return res.status(404).json({
          success: false,

          message: `Không tìm thấy sản phẩm ID ${id}.`,
        });
      }

      if (!product.deleted_at) {
        return res.status(400).json({
          success: false,

          message: `Sản phẩm ID ${id} chưa nằm trong thùng rác.`,
        });
      }

      const used = await Product.isUsedInOrders(id);

      if (used) {
        return res.status(409).json({
          success: false,

          message: `Sản phẩm ID ${id} đã phát sinh đơn hàng, không thể xóa vĩnh viễn.`,
        });
      }

      const files = await Product.getFilesForDelete(id);

      filesToDelete.push(files);
    }

    await connection.beginTransaction();

    transactionStarted = true;

    for (const id of ids) {
      await ProductVariant.forceDeleteByProduct(connection, id);

      await Product.forceDelete(connection, id);
    }

    await connection.commit();

    transactionStarted = false;

    for (const files of filesToDelete) {
      if (!files) continue;

      if (files.thumbnail) {
        deleteFile(files.thumbnail);
      }

      for (const image of files.gallery || []) {
        deleteFile(image.image_url);
      }

      for (const image of files.variantImages || []) {
        deleteFile(image.image_url);
      }
    }

    return res.status(200).json({
      success: true,

      message: "Xóa vĩnh viễn các sản phẩm thành công.",
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("Bulk Force Delete Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

// ============================================================
// STOCK REPORT
// ============================================================

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

// ============================================================
// DASHBOARD
// ============================================================

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
    console.error("Product Dashboard Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  }
};

// ============================================================
// CHECK SKU
// ============================================================

const checkSku = async (req, res) => {
  try {
    const { sku, id, variant_id } = req.query;

    if (!sku || !sku.trim()) {
      return res.status(422).json({
        success: false,
        message: "SKU không được để trống.",
      });
    }

    /*
     * Kiểm tra cả:
     * - products
     * - product_variants
     */
    const exists = await ProductVariant.isSkuUsedAnywhere(sku.trim(), {
      excludeProductId: id ? Number(id) : null,

      excludeVariantId: variant_id ? Number(variant_id) : null,
    });

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

// ============================================================
// SEARCH SUGGESTION
// ============================================================

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

// ============================================================
// FORM DATA
// ============================================================

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

// ============================================================
// ADJUST VARIANT STOCK
// ============================================================

const adjustVariantStock = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

  try {
    const { productId, variantId } = req.params;

    const { type, quantity, note } = req.body;

    const normalizedProductId = Number(productId);

    const normalizedVariantId = Number(variantId);

    // ========================================================
    // VALIDATE IDS
    // ========================================================

    if (!Number.isInteger(normalizedProductId) || normalizedProductId <= 0) {
      return res.status(422).json({
        success: false,
        message: "ID sản phẩm không hợp lệ.",
      });
    }

    if (!Number.isInteger(normalizedVariantId) || normalizedVariantId <= 0) {
      return res.status(422).json({
        success: false,
        message: "ID biến thể không hợp lệ.",
      });
    }

    const normalizedType = String(type || "")
      .trim()
      .toLowerCase();

    if (!["import", "export", "adjust"].includes(normalizedType)) {
      return res.status(422).json({
        success: false,

        message: "Loại điều chỉnh tồn kho không hợp lệ.",
      });
    }

    const qty = Number(quantity);

    /*
     * import/export:
     * phải > 0
     *
     * adjust:
     * được phép = 0 vì Admin có thể
     * điều chỉnh variant về hết hàng.
     */
    if (normalizedType === "adjust") {
      if (!Number.isInteger(qty) || qty < 0) {
        return res.status(422).json({
          success: false,

          message: "Số lượng điều chỉnh phải là số nguyên không âm.",
        });
      }
    } else {
      if (!Number.isInteger(qty) || qty <= 0) {
        return res.status(422).json({
          success: false,

          message: "Số lượng nhập/xuất phải là số nguyên lớn hơn 0.",
        });
      }
    }

    // ========================================================
    // TRANSACTION
    // ========================================================

    await connection.beginTransaction();

    transactionStarted = true;

    /*
     * Lock Product trước.
     *
     * Giúp các thao tác stock trên cùng Product
     * chạy tuần tự, tránh aggregate quantity bị race condition.
     */
    const lockedProduct = await ProductVariant.getProductQuantityForUpdate(
      connection,
      normalizedProductId,
    );

    if (!lockedProduct) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    /*
     * Lock chính Variant cần chỉnh.
     */
    const variant = await ProductVariant.getVariantForUpdate(
      connection,
      normalizedProductId,
      normalizedVariantId,
    );

    if (!variant) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(404).json({
        success: false,

        message:
          "Không tìm thấy biến thể hoặc biến thể không thuộc sản phẩm này.",
      });
    }

    const quantityBefore = Number(variant.quantity || 0);

    let quantityAfter = quantityBefore;

    // ========================================================
    // CALCULATE STOCK
    // ========================================================

    switch (normalizedType) {
      case "import":
        quantityAfter = quantityBefore + qty;
        break;

      case "export":
        if (quantityBefore < qty) {
          await connection.rollback();

          transactionStarted = false;

          return res.status(409).json({
            success: false,

            message: "Không đủ tồn kho của biến thể để xuất.",

            data: {
              variant_id: normalizedVariantId,

              sku: variant.sku,

              variant_name: variant.variant_name,

              available: quantityBefore,

              requested: qty,
            },
          });
        }

        quantityAfter = quantityBefore - qty;

        break;

      case "adjust":
        quantityAfter = qty;
        break;
    }

    // ========================================================
    // UPDATE VARIANT STOCK
    // ========================================================

    const affectedRows = await ProductVariant.updateVariantQuantity(
      connection,
      normalizedProductId,
      normalizedVariantId,
      quantityAfter,
    );

    if (affectedRows === 0) {
      throw new Error("Không thể cập nhật tồn kho biến thể.");
    }

    // ========================================================
    // SYNC PRODUCT TOTAL
    // ========================================================

    await ProductVariant.syncProductAggregate(connection, normalizedProductId);

    const [[updatedProductStock]] = await connection.execute(
      `
          SELECT quantity
          FROM products
          WHERE id = ?
          LIMIT 1
        `,
      [normalizedProductId],
    );

    const productQuantityBefore = Number(lockedProduct.quantity || 0);

    const productQuantityAfter = Number(updatedProductStock?.quantity || 0);

    // ========================================================
    // STOCK LOG
    //
    // DB hiện tại của bạn đang log theo product_id.
    // Tạm thời đưa Variant ID / SKU vào note.
    //
    // Sau này nếu muốn lịch sử tồn kho chi tiết hơn,
    // có thể thêm variant_id vào product_stock_logs.
    // ========================================================

    const stockDifference = Math.abs(quantityAfter - quantityBefore);

    await Product.insertStockLog(connection, {
      productId: normalizedProductId,

      variantId: normalizedVariantId,

      type: normalizedType,

      quantity: normalizedType === "adjust" ? stockDifference : qty,

      // Tồn kho của chính Variant
      quantityBefore,
      quantityAfter,

      // Tổng tồn kho Product
      productQuantityBefore,
      productQuantityAfter,

      referenceType: null,
      referenceId: null,

      note: String(note || "").trim() || null,
    });

    await connection.commit();

    transactionStarted = false;

    // ========================================================
    // RESPONSE DATA
    // ========================================================

    const updatedProduct = await Product.getById(normalizedProductId);

    const updatedVariant =
      updatedProduct?.variants?.find(
        (item) => Number(item.id) === normalizedVariantId,
      ) || null;

    return res.status(200).json({
      success: true,

      message:
        normalizedType === "import"
          ? "Nhập kho biến thể thành công."
          : normalizedType === "export"
            ? "Xuất kho biến thể thành công."
            : "Điều chỉnh tồn kho biến thể thành công.",

      data: {
        variant: updatedVariant,

        stock_change: {
          type: normalizedType,

          quantity: qty,

          variant_before: quantityBefore,

          variant_after: quantityAfter,

          product_before: productQuantityBefore,

          product_after: productQuantityAfter,
        },

        product: updatedProduct,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("Adjust Variant Stock Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

// ============================================================
// VARIANT MANAGEMENT HELPERS
// ============================================================

const normalizeVariantIdParams = (req) => {
  const productId = Number(req.params.productId);
  const variantId = Number(req.params.variantId);

  return {
    productId,
    variantId,

    valid:
      Number.isInteger(productId) &&
      productId > 0 &&
      Number.isInteger(variantId) &&
      variantId > 0,
  };
};

const normalizeVariantValuesPayload = (values) => {
  if (values === undefined) {
    return undefined;
  }

  if (values === null) {
    return {};
  }

  if (typeof values === "string") {
    try {
      values = JSON.parse(values);
    } catch {
      throw new Error("Giá trị thuộc tính biến thể không hợp lệ.");
    }
  }

  if (Array.isArray(values)) {
    const result = {};

    for (const item of values) {
      const code = ProductVariant.normalizeCode(
        item?.option_code || item?.code,
      );

      if (!code) {
        throw new Error("Mã thuộc tính biến thể không hợp lệ.");
      }

      result[code] = item?.value ?? item?.option_value ?? "";
    }

    return result;
  }

  if (typeof values !== "object") {
    throw new Error("Giá trị thuộc tính biến thể không hợp lệ.");
  }

  const result = {};

  for (const [key, value] of Object.entries(values)) {
    const code = ProductVariant.normalizeCode(key);

    if (!code) {
      continue;
    }

    result[code] = value;
  }

  return result;
};

const getCurrentVariantValuesObject = (variant) => {
  const result = {};

  for (const item of variant?.values || []) {
    const code = ProductVariant.normalizeCode(item.option_code);

    if (!code) {
      continue;
    }

    result[code] = item.value;
  }

  return result;
};

const buildExistingOptionMap = (options = []) => {
  const map = {};

  for (const option of options) {
    const code = ProductVariant.normalizeCode(option.code);

    if (!code) {
      continue;
    }

    const values = {};

    for (const value of option.values || []) {
      values[
        String(value.value || "")
          .trim()
          .toLowerCase()
      ] = {
        id: Number(value.id),
        value: value.value,
      };
    }

    map[code] = {
      id: Number(option.id),
      code,
      name: option.name,
      values,
    };
  }

  return map;
};

const getVariantCombinationKey = (values = []) => {
  if (!Array.isArray(values) || values.length === 0) {
    return "";
  }

  return values
    .map((item) => {
      const optionCode = ProductVariant.normalizeCode(item.option_code);

      const value = String(item.value || "")
        .trim()
        .toLowerCase();

      return `${optionCode}:${value}`;
    })
    .sort()
    .join("|");
};

const getPayloadCombinationKey = (optionMap, values) => {
  const parts = [];

  for (const optionCode of Object.keys(optionMap)) {
    const selected = String(values?.[optionCode] ?? "")
      .trim()
      .toLowerCase();

    if (!selected) {
      throw new Error(
        `Biến thể chưa chọn giá trị cho "${optionMap[optionCode].name}".`,
      );
    }

    const valueInfo = optionMap[optionCode].values[selected];

    if (!valueInfo) {
      throw new Error(
        `Giá trị "${values[optionCode]}" không thuộc "${optionMap[optionCode].name}".`,
      );
    }

    parts.push(`${optionCode}:${selected}`);
  }

  for (const receivedCode of Object.keys(values || {})) {
    const normalizedCode = ProductVariant.normalizeCode(receivedCode);

    if (!optionMap[normalizedCode]) {
      throw new Error(`Thuộc tính "${receivedCode}" không thuộc sản phẩm này.`);
    }
  }

  return parts.sort().join("|");
};

// ============================================================
// GET ONE VARIANT
// ============================================================

const getVariantById = async (req, res) => {
  try {
    const { productId, variantId, valid } = normalizeVariantIdParams(req);

    if (!valid) {
      return res.status(422).json({
        success: false,
        message: "ID sản phẩm hoặc ID biến thể không hợp lệ.",
      });
    }

    const product = await Product.getById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    const variants = await ProductVariant.getVariantsByProductId(productId);

    const variant =
      variants.find((item) => Number(item.id) === variantId) || null;

    if (!variant) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy biến thể hoặc biến thể không thuộc sản phẩm này.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết biến thể thành công.",
      data: variant,
    });
  } catch (error) {
    console.error("Get Variant By ID Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  }
};

// ============================================================
// VARIANT IMAGE HELPERS
// ============================================================

const getVariantImagesInternal = async (
  connection,
  productId,
  variantId,
  { forUpdate = false } = {},
) => {
  const sql = `
    SELECT
      pvi.id,
      pvi.variant_id,
      pvi.image_url,
      pvi.sort_order,
      pvi.is_primary

    FROM product_variant_images pvi

    INNER JOIN product_variants pv
      ON pv.id = pvi.variant_id

    WHERE
      pvi.variant_id = ?
      AND pv.product_id = ?

      AND pvi.deleted_at IS NULL
      AND pv.deleted_at IS NULL

    ORDER BY
      pvi.is_primary DESC,
      pvi.sort_order ASC,
      pvi.id ASC

    ${forUpdate ? "FOR UPDATE" : ""}
  `;

  const [rows] = await connection.execute(sql, [variantId, productId]);

  return rows.map((item) => ({
    ...item,

    id: Number(item.id),

    variant_id: Number(item.variant_id),

    sort_order: Number(item.sort_order || 0),

    is_primary: Number(item.is_primary || 0),
  }));
};

const getVariantImageInternal = async (
  connection,
  productId,
  variantId,
  imageId,
  { forUpdate = false } = {},
) => {
  const sql = `
    SELECT
      pvi.id,
      pvi.variant_id,
      pvi.image_url,
      pvi.sort_order,
      pvi.is_primary

    FROM product_variant_images pvi

    INNER JOIN product_variants pv
      ON pv.id = pvi.variant_id

    WHERE
      pvi.id = ?
      AND pvi.variant_id = ?
      AND pv.product_id = ?

      AND pvi.deleted_at IS NULL
      AND pv.deleted_at IS NULL

    LIMIT 1

    ${forUpdate ? "FOR UPDATE" : ""}
  `;

  const [rows] = await connection.execute(sql, [imageId, variantId, productId]);

  if (rows.length === 0) {
    return null;
  }

  const item = rows[0];

  return {
    ...item,

    id: Number(item.id),

    variant_id: Number(item.variant_id),

    sort_order: Number(item.sort_order || 0),

    is_primary: Number(item.is_primary || 0),
  };
};

const normalizeVariantImageParams = (req) => {
  const productId = Number(req.params.productId);

  const variantId = Number(req.params.variantId);

  const imageId =
    req.params.imageId !== undefined ? Number(req.params.imageId) : null;

  return {
    productId,

    variantId,

    imageId,

    valid:
      Number.isInteger(productId) &&
      productId > 0 &&
      Number.isInteger(variantId) &&
      variantId > 0 &&
      (imageId === null || (Number.isInteger(imageId) && imageId > 0)),
  };
};

// ============================================================
// UPDATE ONE VARIANT
//
// LƯU Ý:
// quantity KHÔNG được cập nhật tại API này.
// Tồn kho phải đi qua adjustVariantStock()
// để đảm bảo stock log.
// ============================================================

const updateVariant = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

  try {
    const { productId, variantId, valid } = normalizeVariantIdParams(req);

    if (!valid) {
      return res.status(422).json({
        success: false,
        message: "ID sản phẩm hoặc ID biến thể không hợp lệ.",
      });
    }

    const product = await Product.getById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    await connection.beginTransaction();

    transactionStarted = true;

    const currentVariant = await ProductVariant.getVariantById(
      variantId,
      productId,
      connection,
    );

    if (!currentVariant || currentVariant.deleted_at) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy biến thể hoặc biến thể không thuộc sản phẩm này.",
      });
    }

    // ========================================================
    // KHÔNG CHO UPDATE STOCK QUA API NÀY
    // ========================================================

    if (hasOwn(req.body, "quantity")) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(422).json({
        success: false,

        message:
          "Không được cập nhật tồn kho bằng API sửa biến thể. Vui lòng sử dụng API điều chỉnh tồn kho.",
      });
    }

    // ========================================================
    // NORMALIZE DATA
    // ========================================================

    const sku =
      req.body.sku !== undefined
        ? String(req.body.sku || "").trim()
        : String(currentVariant.sku || "").trim();

    if (!sku) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(422).json({
        success: false,
        message: "SKU biến thể không được để trống.",
      });
    }

    const variantName =
      req.body.variant_name !== undefined
        ? String(req.body.variant_name || "").trim()
        : String(currentVariant.variant_name || "").trim();

    const price =
      req.body.price !== undefined
        ? Number(req.body.price)
        : Number(currentVariant.price);

    const salePrice =
      req.body.sale_price !== undefined
        ? normalizeNullableNumber(req.body.sale_price)
        : currentVariant.sale_price !== null
          ? Number(currentVariant.sale_price)
          : null;

    const status =
      req.body.status !== undefined
        ? Number(req.body.status)
        : Number(currentVariant.status);

    const sortOrder =
      req.body.sort_order !== undefined
        ? Number(req.body.sort_order)
        : Number(currentVariant.sort_order || 0);

    if (!Number.isFinite(price) || price <= 0) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(422).json({
        success: false,
        message: "Giá bán của biến thể không hợp lệ.",
      });
    }

    if (
      salePrice !== null &&
      (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price)
    ) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(422).json({
        success: false,
        message: "Giá khuyến mãi phải nhỏ hơn giá bán.",
      });
    }

    if (![0, 1].includes(status)) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(422).json({
        success: false,
        message: "Trạng thái biến thể không hợp lệ.",
      });
    }

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(422).json({
        success: false,
        message: "Thứ tự hiển thị biến thể không hợp lệ.",
      });
    }

    // ========================================================
    // DEFAULT VARIANT KHÔNG ĐƯỢC ẨN QUA UPDATE
    // ========================================================

    if (Number(currentVariant.is_default) === 1 && status === 0) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(409).json({
        success: false,

        message:
          "Không thể ẩn biến thể mặc định. Hãy đặt một biến thể khác làm mặc định trước.",
      });
    }

    // ========================================================
    // UPDATE BASE FIELDS
    // ========================================================

    await ProductVariant.updateVariant(connection, productId, variantId, {
      sku,

      variant_name: variantName || "Mặc định",

      price,

      sale_price: salePrice,

      // Giữ stock hiện tại.
      quantity: Number(currentVariant.quantity || 0),

      thumbnail:
        req.body.thumbnail !== undefined
          ? req.body.thumbnail
          : currentVariant.thumbnail,

      status,

      is_default: Number(currentVariant.is_default),

      sort_order: sortOrder,
    });

    // ========================================================
    // UPDATE VALUES NẾU CLIENT GỬI
    // ========================================================

    if (hasOwn(req.body, "values")) {
      const currentVariantData = await ProductVariant.getProductVariantData(
        productId,
        connection,
      );

      const productOptions = currentVariantData.options || [];

      const optionMap = buildExistingOptionMap(productOptions);

      const normalizedValues = normalizeVariantValuesPayload(req.body.values);

      if (
        Object.keys(optionMap).length === 0 &&
        Object.keys(normalizedValues || {}).length > 0
      ) {
        throw new Error("Sản phẩm không có thuộc tính biến thể để cập nhật.");
      }

      const combinationKey =
        Object.keys(optionMap).length > 0
          ? getPayloadCombinationKey(optionMap, normalizedValues)
          : "";

      /*
       * Kiểm tra combination trùng variant khác.
       */
      if (combinationKey) {
        for (const otherVariant of currentVariantData.variants || []) {
          if (Number(otherVariant.id) === variantId) {
            continue;
          }

          const otherKey = getVariantCombinationKey(otherVariant.values);

          if (otherKey === combinationKey) {
            throw new Error(
              `Tổ hợp thuộc tính đã được sử dụng bởi biến thể "${otherVariant.variant_name}".`,
            );
          }
        }
      }

      await ProductVariant.replaceVariantValues(
        connection,
        variantId,
        optionMap,
        normalizedValues,
      );
    }

    // ========================================================
    // SYNC PRODUCT
    // ========================================================

    await ProductVariant.syncProductAggregate(connection, productId);

    await connection.commit();

    transactionStarted = false;

    const updatedProduct = await Product.getById(productId);

    const updatedVariant =
      updatedProduct?.variants?.find((item) => Number(item.id) === variantId) ||
      null;

    return res.status(200).json({
      success: true,
      message: "Cập nhật biến thể thành công.",

      data: {
        variant: updatedVariant,
        product: updatedProduct,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("Update Variant Error:", error);

    if (
      error.message?.includes("đã tồn tại") ||
      error.message?.includes("không hợp lệ") ||
      error.message?.includes("bị trùng") ||
      error.message?.includes("chưa chọn") ||
      error.message?.includes("không thuộc") ||
      error.message?.includes("Tổ hợp thuộc tính") ||
      error.message?.includes("không có thuộc tính")
    ) {
      return res.status(422).json({
        success: false,
        message: "Dữ liệu biến thể không hợp lệ.",
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

// ============================================================
// TOGGLE VARIANT STATUS
// ============================================================

const toggleVariantStatus = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

  try {
    const { productId, variantId, valid } = normalizeVariantIdParams(req);

    if (!valid) {
      return res.status(422).json({
        success: false,
        message: "ID sản phẩm hoặc ID biến thể không hợp lệ.",
      });
    }

    const product = await Product.getById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    await connection.beginTransaction();

    transactionStarted = true;

    const variant = await ProductVariant.getVariantById(
      variantId,
      productId,
      connection,
    );

    if (!variant || variant.deleted_at) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy biến thể hoặc biến thể không thuộc sản phẩm này.",
      });
    }

    const newStatus = Number(variant.status) === 1 ? 0 : 1;

    /*
     * Không cho tắt default variant.
     *
     * Admin phải đặt default khác trước.
     */
    if (Number(variant.is_default) === 1 && newStatus === 0) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(409).json({
        success: false,

        message:
          "Không thể ẩn biến thể mặc định. Hãy đặt một biến thể khác làm mặc định trước.",
      });
    }

    await ProductVariant.updateVariant(connection, productId, variantId, {
      ...variant,

      quantity: Number(variant.quantity || 0),

      status: newStatus,

      is_default: Number(variant.is_default),
    });

    await ProductVariant.syncProductAggregate(connection, productId);

    await connection.commit();

    transactionStarted = false;

    const updatedProduct = await Product.getById(productId);

    const updatedVariant =
      updatedProduct?.variants?.find((item) => Number(item.id) === variantId) ||
      null;

    return res.status(200).json({
      success: true,

      message:
        newStatus === 1
          ? "Hiển thị biến thể thành công."
          : "Ẩn biến thể thành công.",

      data: {
        variant: updatedVariant,
        product: updatedProduct,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("Toggle Variant Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

// ============================================================
// SET DEFAULT VARIANT
// ============================================================

const setDefaultVariant = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

  try {
    const { productId, variantId, valid } = normalizeVariantIdParams(req);

    if (!valid) {
      return res.status(422).json({
        success: false,
        message: "ID sản phẩm hoặc ID biến thể không hợp lệ.",
      });
    }

    const product = await Product.getById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    await connection.beginTransaction();

    transactionStarted = true;

    const variant = await ProductVariant.getVariantById(
      variantId,
      productId,
      connection,
    );

    if (!variant || variant.deleted_at) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy biến thể hoặc biến thể không thuộc sản phẩm này.",
      });
    }

    if (Number(variant.status) !== 1) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(409).json({
        success: false,

        message: "Không thể đặt biến thể đang ẩn làm biến thể mặc định.",
      });
    }

    if (Number(variant.is_default) === 1) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(200).json({
        success: true,

        message: "Biến thể này đã là biến thể mặc định.",

        data: {
          variant,
          product,
        },
      });
    }

    await ProductVariant.setDefaultVariant(connection, productId, variantId);

    /*
     * setDefaultVariant() của Model đã gọi
     * syncProductAggregate().
     */

    await connection.commit();

    transactionStarted = false;

    const updatedProduct = await Product.getById(productId);

    const updatedVariant =
      updatedProduct?.variants?.find((item) => Number(item.id) === variantId) ||
      null;

    return res.status(200).json({
      success: true,
      message: "Đặt biến thể mặc định thành công.",

      data: {
        variant: updatedVariant,
        product: updatedProduct,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("Set Default Variant Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

// ============================================================
// DELETE VARIANT
// ============================================================

const deleteVariant = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

  try {
    const { productId, variantId, valid } = normalizeVariantIdParams(req);

    if (!valid) {
      return res.status(422).json({
        success: false,
        message: "ID sản phẩm hoặc ID biến thể không hợp lệ.",
      });
    }

    const product = await Product.getById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    await connection.beginTransaction();

    transactionStarted = true;

    const productBefore = await ProductVariant.getProductQuantityForUpdate(
      connection,
      productId,
    );

    if (!productBefore) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    const result = await ProductVariant.deleteVariantSafely(
      connection,
      productId,
      variantId,
    );

    const [[productAfterRow]] = await connection.execute(
      `
        SELECT quantity
        FROM products
        WHERE id = ?
        LIMIT 1
      `,
      [productId],
    );

    const productQuantityBefore = Number(productBefore.quantity || 0);

    const productQuantityAfter = Number(productAfterRow?.quantity || 0);

    const deletedVariantQuantity = Number(
      result.deleted_variant?.quantity || 0,
    );

    /*
     * Soft delete variant làm giảm aggregate stock của Product.
     *
     * Ghi log để sau này Admin nhìn được vì sao tổng stock thay đổi.
     */
    if (productQuantityBefore !== productQuantityAfter) {
      await Product.insertStockLog(connection, {
        productId,

        variantId,

        type: "adjust",

        quantity: Math.abs(productQuantityAfter - productQuantityBefore),

        quantityBefore: deletedVariantQuantity,

        quantityAfter: 0,

        productQuantityBefore,
        productQuantityAfter,

        referenceType: "variant_delete",

        referenceId: variantId,

        note: `Xóa biến thể ${result.deleted_variant.sku} - ${result.deleted_variant.variant_name}`,
      });
    }

    await connection.commit();

    transactionStarted = false;

    const updatedProduct = await Product.getById(productId);

    return res.status(200).json({
      success: true,

      message: result.deleted_variant.was_default
        ? "Xóa biến thể thành công và đã chuyển biến thể mặc định."
        : "Xóa biến thể thành công.",

      data: {
        deleted_variant: result.deleted_variant,

        replacement_default: result.replacement_default,

        stock_change: {
          product_before: productQuantityBefore,

          product_after: productQuantityAfter,
        },

        product: updatedProduct,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("Delete Variant Error:", error);

    if (
      error.message?.includes("Không tìm thấy biến thể") ||
      error.message?.includes("biến thể cuối cùng") ||
      error.message?.includes("không còn biến thể đang hiển thị")
    ) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

// ============================================================
// RESTORE VARIANT
// ============================================================

const restoreVariant = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

  try {
    const { productId, variantId, valid } = normalizeVariantIdParams(req);

    if (!valid) {
      return res.status(422).json({
        success: false,
        message: "ID sản phẩm hoặc ID biến thể không hợp lệ.",
      });
    }

    const product = await Product.getById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    await connection.beginTransaction();

    transactionStarted = true;

    const productBefore = await ProductVariant.getProductQuantityForUpdate(
      connection,
      productId,
    );

    if (!productBefore) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    const deletedVariant = await ProductVariant.getVariantById(
      variantId,
      productId,
      connection,
    );

    if (!deletedVariant) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy biến thể hoặc biến thể không thuộc sản phẩm này.",
      });
    }

    const variantQuantity = Number(deletedVariant.quantity || 0);

    const result = await ProductVariant.restoreVariantSafely(
      connection,
      productId,
      variantId,
    );

    const [[productAfterRow]] = await connection.execute(
      `
        SELECT quantity
        FROM products
        WHERE id = ?
        LIMIT 1
      `,
      [productId],
    );

    const productQuantityBefore = Number(productBefore.quantity || 0);

    const productQuantityAfter = Number(productAfterRow?.quantity || 0);

    if (productQuantityBefore !== productQuantityAfter) {
      await Product.insertStockLog(connection, {
        productId,

        variantId,

        type: "adjust",

        quantity: Math.abs(productQuantityAfter - productQuantityBefore),

        quantityBefore: 0,

        quantityAfter: variantQuantity,

        productQuantityBefore,
        productQuantityAfter,

        referenceType: "variant_restore",

        referenceId: variantId,

        note: `Khôi phục biến thể ${deletedVariant.sku} - ${deletedVariant.variant_name}`,
      });
    }

    await connection.commit();

    transactionStarted = false;

    const updatedProduct = await Product.getById(productId);

    const restoredVariant =
      updatedProduct?.variants?.find((item) => Number(item.id) === variantId) ||
      result.restored_variant ||
      null;

    return res.status(200).json({
      success: true,

      message: "Khôi phục biến thể thành công.",

      data: {
        variant: restoredVariant,

        stock_change: {
          product_before: productQuantityBefore,

          product_after: productQuantityAfter,
        },

        product: updatedProduct,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("Restore Variant Error:", error);

    if (
      error.message?.includes("chưa bị xóa") ||
      error.message?.includes("Không tìm thấy biến thể") ||
      error.message?.includes("Không thể khôi phục") ||
      error.message?.includes("đã được sử dụng")
    ) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

// ============================================================
// GET VARIANT IMAGES
// ============================================================

const getVariantImages = async (req, res) => {
  try {
    const { productId, variantId, valid } = normalizeVariantImageParams(req);

    if (!valid) {
      return res.status(422).json({
        success: false,
        message: "ID sản phẩm hoặc ID biến thể không hợp lệ.",
      });
    }

    // ========================================================
    // PRODUCT EXISTS
    // ========================================================

    const product = await Product.getById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    // ========================================================
    // VARIANT EXISTS
    // ========================================================

    const variant = await ProductVariant.getVariantById(variantId, productId);

    if (!variant || variant.deleted_at) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy biến thể hoặc biến thể không thuộc sản phẩm này.",
      });
    }

    // ========================================================
    // GET IMAGES
    // ========================================================

    const images = await getVariantImagesInternal(pool, productId, variantId);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách ảnh biến thể thành công.",

      data: {
        variant: {
          id: Number(variant.id),

          product_id: Number(variant.product_id),

          sku: variant.sku,

          variant_name: variant.variant_name,
        },

        images,

        total: images.length,
      },
    });
  } catch (error) {
    console.error("Get Variant Images Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  }
};

// ============================================================
// UPLOAD VARIANT IMAGES
// ============================================================

const uploadVariantImages = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

  try {
    const { productId, variantId, valid } = normalizeVariantImageParams(req);

    if (!valid) {
      cleanupUploadedProductFiles(req);

      return res.status(422).json({
        success: false,
        message: "ID sản phẩm hoặc ID biến thể không hợp lệ.",
      });
    }

    // ========================================================
    // FILES
    // ========================================================

    const files = Array.isArray(req.files) ? req.files : [];

    if (files.length === 0) {
      return res.status(422).json({
        success: false,
        message: "Vui lòng chọn ít nhất một ảnh.",
      });
    }

    // ========================================================
    // PRODUCT EXISTS
    // ========================================================

    const product = await Product.getById(productId);

    if (!product) {
      cleanupUploadedProductFiles(req);

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    // ========================================================
    // TRANSACTION
    // ========================================================

    await connection.beginTransaction();

    transactionStarted = true;

    // ========================================================
    // LOCK VARIANT
    // ========================================================

    const variant = await ProductVariant.getVariantForUpdate(
      connection,
      productId,
      variantId,
    );

    if (!variant) {
      await connection.rollback();

      transactionStarted = false;

      cleanupUploadedProductFiles(req);

      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy biến thể hoặc biến thể không thuộc sản phẩm này.",
      });
    }

    // ========================================================
    // CURRENT IMAGES
    // ========================================================

    const currentImages = await getVariantImagesInternal(
      connection,
      productId,
      variantId,
      {
        forUpdate: true,
      },
    );

    // ========================================================
    // LIMIT
    // ========================================================

    if (currentImages.length + files.length > 10) {
      await connection.rollback();

      transactionStarted = false;

      cleanupUploadedProductFiles(req);

      return res.status(422).json({
        success: false,

        message: "Mỗi biến thể chỉ được tối đa 10 ảnh.",

        data: {
          current: currentImages.length,

          uploading: files.length,

          maximum: 10,
        },
      });
    }

    // ========================================================
    // FIRST IMAGE PRIMARY
    //
    // Nếu variant chưa có ảnh nào:
    // ảnh đầu tiên upload sẽ tự động là ảnh chính.
    // ========================================================

    const shouldAssignPrimary = currentImages.length === 0;

    let maxSortOrder = currentImages.reduce((max, image) => {
      return Math.max(max, Number(image.sort_order || 0));
    }, 0);

    for (let index = 0; index < files.length; index++) {
      const file = files[index];

      maxSortOrder += 1;

      const imageUrl = `/uploads/products/${file.filename}`;

      const isPrimary = shouldAssignPrimary && index === 0 ? 1 : 0;

      await connection.execute(
        `
          INSERT INTO product_variant_images
          (
            variant_id,
            image_url,
            sort_order,
            is_primary
          )
          VALUES (?, ?, ?, ?)
        `,
        [variantId, imageUrl, maxSortOrder, isPrimary],
      );
    }

    // ========================================================
    // COMMIT
    // ========================================================

    await connection.commit();

    transactionStarted = false;

    // ========================================================
    // RESPONSE
    // ========================================================

    const images = await getVariantImagesInternal(pool, productId, variantId);

    return res.status(201).json({
      success: true,

      message:
        files.length === 1
          ? "Thêm ảnh biến thể thành công."
          : `Thêm ${files.length} ảnh biến thể thành công.`,

      data: {
        variant: {
          id: Number(variant.id),

          product_id: Number(variant.product_id),

          sku: variant.sku,

          variant_name: variant.variant_name,
        },

        images,

        total: images.length,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    /*
     * Nếu DB thất bại thì xóa file vừa upload,
     * tránh file rác trong uploads/products.
     */
    cleanupUploadedProductFiles(req);

    console.error("Upload Variant Images Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

// ============================================================
// SET PRIMARY VARIANT IMAGE
// ============================================================

const setPrimaryVariantImage = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

  try {
    const { productId, variantId, imageId, valid } =
      normalizeVariantImageParams(req);

    if (!valid || imageId === null) {
      return res.status(422).json({
        success: false,
        message: "ID sản phẩm, biến thể hoặc ảnh không hợp lệ.",
      });
    }

    // ========================================================
    // PRODUCT EXISTS
    // ========================================================

    const product = await Product.getById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    // ========================================================
    // TRANSACTION
    // ========================================================

    await connection.beginTransaction();

    transactionStarted = true;

    // ========================================================
    // VARIANT EXISTS
    // ========================================================

    const variant = await ProductVariant.getVariantForUpdate(
      connection,
      productId,
      variantId,
    );

    if (!variant) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy biến thể hoặc biến thể không thuộc sản phẩm này.",
      });
    }

    // ========================================================
    // IMAGE EXISTS
    // ========================================================

    const image = await getVariantImageInternal(
      connection,
      productId,
      variantId,
      imageId,
      {
        forUpdate: true,
      },
    );

    if (!image) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ảnh của biến thể.",
      });
    }

    // ========================================================
    // ALREADY PRIMARY
    // ========================================================

    if (Number(image.is_primary) === 1) {
      await connection.rollback();

      transactionStarted = false;

      const images = await getVariantImagesInternal(pool, productId, variantId);

      return res.status(200).json({
        success: true,

        message: "Ảnh này đã là ảnh chính của biến thể.",

        data: {
          primary_image: image,

          images,
        },
      });
    }

    // ========================================================
    // CLEAR OLD PRIMARY
    // ========================================================

    await connection.execute(
      `
        UPDATE product_variant_images

        SET
          is_primary = 0,
          updated_at = NOW()

        WHERE
          variant_id = ?
          AND deleted_at IS NULL
      `,
      [variantId],
    );

    // ========================================================
    // SET NEW PRIMARY
    // ========================================================

    await connection.execute(
      `
        UPDATE product_variant_images

        SET
          is_primary = 1,
          updated_at = NOW()

        WHERE
          id = ?
          AND variant_id = ?
          AND deleted_at IS NULL
      `,
      [imageId, variantId],
    );

    // ========================================================
    // UPDATE VARIANT THUMBNAIL
    //
    // Ảnh chính của variant đồng thời được dùng làm thumbnail
    // riêng của variant.
    // ========================================================

    await connection.execute(
      `
        UPDATE product_variants

        SET
          thumbnail = ?,
          updated_at = NOW()

        WHERE
          id = ?
          AND product_id = ?
          AND deleted_at IS NULL
      `,
      [image.image_url, variantId, productId],
    );

    /*
     * Nếu variant này là default,
     * product thumbnail cũng sẽ được sync theo variant.
     */
    await ProductVariant.syncProductAggregate(connection, productId);

    await connection.commit();

    transactionStarted = false;

    // ========================================================
    // RESPONSE
    // ========================================================

    const images = await getVariantImagesInternal(pool, productId, variantId);

    const primaryImage =
      images.find((item) => Number(item.is_primary) === 1) || null;

    const updatedProduct = await Product.getById(productId);

    const updatedVariant =
      updatedProduct?.variants?.find((item) => Number(item.id) === variantId) ||
      null;

    return res.status(200).json({
      success: true,

      message: "Đặt ảnh chính cho biến thể thành công.",

      data: {
        primary_image: primaryImage,

        variant: updatedVariant,

        images,

        product: updatedProduct,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("Set Primary Variant Image Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

// ============================================================
// DELETE VARIANT IMAGE
// ============================================================

const deleteVariantImage = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

  let deletedImageUrl = null;

  try {
    const { productId, variantId, imageId, valid } =
      normalizeVariantImageParams(req);

    if (!valid || imageId === null) {
      return res.status(422).json({
        success: false,
        message: "ID sản phẩm, biến thể hoặc ảnh không hợp lệ.",
      });
    }

    // ========================================================
    // PRODUCT EXISTS
    // ========================================================

    const product = await Product.getById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    // ========================================================
    // TRANSACTION
    // ========================================================

    await connection.beginTransaction();

    transactionStarted = true;

    // ========================================================
    // LOCK VARIANT
    // ========================================================

    const variant = await ProductVariant.getVariantForUpdate(
      connection,
      productId,
      variantId,
    );

    if (!variant) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy biến thể hoặc biến thể không thuộc sản phẩm này.",
      });
    }

    // ========================================================
    // IMAGE EXISTS
    // ========================================================

    const image = await getVariantImageInternal(
      connection,
      productId,
      variantId,
      imageId,
      {
        forUpdate: true,
      },
    );

    if (!image) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ảnh của biến thể.",
      });
    }

    deletedImageUrl = image.image_url;

    const wasPrimary = Number(image.is_primary) === 1;

    // ========================================================
    // SOFT DELETE IMAGE
    // ========================================================

    await connection.execute(
      `
        UPDATE product_variant_images

        SET
          deleted_at = NOW(),
          is_primary = 0,
          updated_at = NOW()

        WHERE
          id = ?
          AND variant_id = ?
          AND deleted_at IS NULL
      `,
      [imageId, variantId],
    );

    // ========================================================
    // IF PRIMARY → CHOOSE REPLACEMENT
    // ========================================================

    let replacementPrimary = null;

    if (wasPrimary) {
      const remainingImages = await getVariantImagesInternal(
        connection,
        productId,
        variantId,
        {
          forUpdate: true,
        },
      );

      if (remainingImages.length > 0) {
        replacementPrimary = remainingImages[0];

        await connection.execute(
          `
            UPDATE product_variant_images

            SET
              is_primary = 1,
              updated_at = NOW()

            WHERE
              id = ?
              AND variant_id = ?
              AND deleted_at IS NULL
          `,
          [replacementPrimary.id, variantId],
        );

        await connection.execute(
          `
            UPDATE product_variants

            SET
              thumbnail = ?,
              updated_at = NOW()

            WHERE
              id = ?
              AND product_id = ?
              AND deleted_at IS NULL
          `,
          [replacementPrimary.image_url, variantId, productId],
        );
      } else {
        /*
         * Variant không còn ảnh riêng.
         */
        await connection.execute(
          `
            UPDATE product_variants

            SET
              thumbnail = NULL,
              updated_at = NOW()

            WHERE
              id = ?
              AND product_id = ?
              AND deleted_at IS NULL
          `,
          [variantId, productId],
        );
      }
    }

    // ========================================================
    // SYNC DEFAULT VARIANT → PRODUCT
    // ========================================================

    await ProductVariant.syncProductAggregate(connection, productId);

    await connection.commit();

    transactionStarted = false;

    // ========================================================
    // DELETE PHYSICAL FILE AFTER COMMIT
    // ========================================================

    if (deletedImageUrl) {
      deleteFile(deletedImageUrl);
    }

    // ========================================================
    // RESPONSE
    // ========================================================

    const images = await getVariantImagesInternal(pool, productId, variantId);

    const updatedProduct = await Product.getById(productId);

    const updatedVariant =
      updatedProduct?.variants?.find((item) => Number(item.id) === variantId) ||
      null;

    return res.status(200).json({
      success: true,

      message: wasPrimary
        ? replacementPrimary
          ? "Xóa ảnh thành công và đã chuyển ảnh chính."
          : "Xóa ảnh chính thành công. Biến thể hiện không còn ảnh riêng."
        : "Xóa ảnh biến thể thành công.",

      data: {
        deleted_image: {
          id: image.id,

          image_url: image.image_url,

          was_primary: wasPrimary,
        },

        replacement_primary:
          images.find((item) => Number(item.is_primary) === 1) || null,

        variant: updatedVariant,

        images,

        product: updatedProduct,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("Delete Variant Image Error:", error);

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

// ============================================================
// CREATE SINGLE VARIANT
// ============================================================

const createVariant = async (req, res) => {
  const connection = await pool.getConnection();

  let transactionStarted = false;

  try {
    const productId = Number(req.params.productId);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(422).json({
        success: false,
        message: "ID sản phẩm không hợp lệ.",
      });
    }

    // ========================================================
    // PRODUCT EXISTS
    // ========================================================

    const product = await Product.getById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    // ========================================================
    // KHÔNG CHO TẠO STOCK ÂM
    // ========================================================

    if (req.body.quantity !== undefined) {
      const quantity = Number(req.body.quantity);

      if (!Number.isInteger(quantity) || quantity < 0) {
        return res.status(422).json({
          success: false,
          message: "Số lượng biến thể phải là số nguyên không âm.",
        });
      }
    }

    // ========================================================
    // VALIDATE BASIC DATA
    // ========================================================

    const sku = String(req.body.sku || "").trim();

    if (!sku) {
      return res.status(422).json({
        success: false,
        message: "SKU biến thể không được để trống.",
      });
    }

    const price = Number(req.body.price);

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(422).json({
        success: false,
        message: "Giá bán của biến thể không hợp lệ.",
      });
    }

    const salePrice =
      req.body.sale_price === undefined ||
      req.body.sale_price === null ||
      req.body.sale_price === ""
        ? null
        : Number(req.body.sale_price);

    if (
      salePrice !== null &&
      (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price)
    ) {
      return res.status(422).json({
        success: false,
        message: "Giá khuyến mãi phải nhỏ hơn giá bán.",
      });
    }

    const status = req.body.status !== undefined ? Number(req.body.status) : 1;

    if (![0, 1].includes(status)) {
      return res.status(422).json({
        success: false,
        message: "Trạng thái biến thể không hợp lệ.",
      });
    }

    // ========================================================
    // TRANSACTION
    // ========================================================

    await connection.beginTransaction();

    transactionStarted = true;

    const productQuantityBefore =
      await ProductVariant.getProductQuantityForUpdate(connection, productId);

    if (!productQuantityBefore) {
      await connection.rollback();

      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    // ========================================================
    // CREATE VARIANT
    // ========================================================

    const createdVariant = await ProductVariant.createSingleVariantSafely(
      connection,
      productId,
      {
        ...req.body,

        sku,

        price,

        sale_price: salePrice,

        quantity:
          req.body.quantity !== undefined ? Number(req.body.quantity) : 0,

        status,
      },
    );

    // ========================================================
    // PRODUCT STOCK AFTER CREATE
    // ========================================================

    const [[productAfterRow]] = await connection.execute(
      `
        SELECT quantity
        FROM products
        WHERE id = ?
        LIMIT 1
      `,
      [productId],
    );

    const beforeQuantity = Number(productQuantityBefore.quantity || 0);

    const afterQuantity = Number(productAfterRow?.quantity || 0);

    const variantQuantity = Number(createdVariant?.quantity || 0);

    // ========================================================
    // STOCK LOG
    // ========================================================

    if (beforeQuantity !== afterQuantity) {
      await Product.insertStockLog(connection, {
        productId,

        variantId: Number(createdVariant.id),

        type: "adjust",

        quantity: Math.abs(afterQuantity - beforeQuantity),

        quantityBefore: 0,

        quantityAfter: variantQuantity,

        productQuantityBefore: beforeQuantity,

        productQuantityAfter: afterQuantity,

        referenceType: "variant_create",

        referenceId: Number(createdVariant.id),

        note: `Tạo biến thể ${createdVariant.sku} - ${createdVariant.variant_name}`,
      });
    }

    await connection.commit();

    transactionStarted = false;

    // ========================================================
    // RESPONSE
    // ========================================================

    const updatedProduct = await Product.getById(productId);

    const updatedVariant =
      updatedProduct?.variants?.find(
        (item) => Number(item.id) === Number(createdVariant.id),
      ) || createdVariant;

    return res.status(201).json({
      success: true,

      message: "Thêm biến thể thành công.",

      data: {
        variant: updatedVariant,

        stock_change: {
          product_before: beforeQuantity,

          product_after: afterQuantity,
        },

        product: updatedProduct,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("Create Variant Error:", error);

    if (
      error.message?.includes("đã tồn tại") ||
      error.message?.includes("không hợp lệ") ||
      error.message?.includes("không tồn tại") ||
      error.message?.includes("không thuộc") ||
      error.message?.includes("chưa chọn") ||
      error.message?.includes("Tổ hợp") ||
      error.message?.includes("thuộc tính") ||
      error.message?.includes("mặc định")
    ) {
      return res.status(422).json({
        success: false,
        message: "Dữ liệu biến thể không hợp lệ.",
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

// ============================================================
// EXPORT
// ============================================================

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
  adjustVariantStock,
  getStockReport,
  getStockHistory,

  getDashboard,

  uploadGalleryImages,
  deleteGalleryImage,

  checkSku,
  searchSuggestion,

  getFormData,
  // VARIANT MANAGEMENT
  createVariant,
  getVariantById,
  updateVariant,
  toggleVariantStatus,
  setDefaultVariant,
  deleteVariant,
  restoreVariant,

  // ==========================================================
  // VARIANT IMAGES
  // ==========================================================

  getVariantImages,
  uploadVariantImages,
  setPrimaryVariantImage,
  deleteVariantImage,
};
