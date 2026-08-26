const express = require("express");

const controller = require("../../controllers/admin/productController");

const uploadProduct = require("../../middlewares/uploadProduct");

const router = express.Router();

// ============================================================
// PRODUCT LIST / SYSTEM DATA
// ============================================================

router.get("/", controller.getAllProducts);

router.get("/trash", controller.getTrashProducts);

router.get("/stock-warning", controller.getStockWarning);

router.get("/statistics", controller.getProductStatistics);

router.get("/top-selling", controller.getTopSellingProducts);

router.get("/newest", controller.getNewestProducts);

router.get("/stock-report", controller.getStockReport);

router.get("/dashboard", controller.getDashboard);

router.get("/check-sku", controller.checkSku);

router.get("/search-suggestion", controller.searchSuggestion);

router.get("/form-data", controller.getFormData);

// ============================================================
// STOCK HISTORY
// ============================================================

router.get("/:id/stock-history", controller.getStockHistory);

// ============================================================
// VARIANT IMAGES
// ============================================================

router.get(
  "/:productId/variants/:variantId/images",
  controller.getVariantImages,
);

router.post(
  "/:productId/variants/:variantId/images",

  uploadProduct.array("images", 10),

  controller.uploadVariantImages,
);

router.patch(
  "/:productId/variants/:variantId/images/:imageId/primary",

  controller.setPrimaryVariantImage,
);

router.delete(
  "/:productId/variants/:variantId/images/:imageId",

  controller.deleteVariantImage,
);

// ============================================================
// VARIANT MANAGEMENT
// ============================================================

// Tạo một biến thể mới
router.post("/:productId/variants", controller.createVariant);

// Chi tiết một biến thể
router.get("/:productId/variants/:variantId", controller.getVariantById);

router.patch("/:productId/variants/:variantId", controller.updateVariant);

router.patch(
  "/:productId/variants/:variantId/toggle-status",
  controller.toggleVariantStatus,
);

router.patch(
  "/:productId/variants/:variantId/set-default",
  controller.setDefaultVariant,
);

router.delete("/:productId/variants/:variantId", controller.deleteVariant);

router.patch(
  "/:productId/variants/:variantId/restore",
  controller.restoreVariant,
);

// ============================================================
// VARIANT STOCK
// ============================================================

router.patch(
  "/:productId/variants/:variantId/adjust-stock",

  controller.adjustVariantStock,
);

// ============================================================
// PRODUCT STOCK
//
// Chỉ dùng trực tiếp khi Product không có nhiều variants.
// ============================================================

router.patch(
  "/:id/adjust-stock",

  controller.adjustStock,
);

// ============================================================
// PRODUCT GALLERY
// ============================================================

router.post(
  "/:id/gallery",

  uploadProduct.array("gallery", 10),

  controller.uploadGalleryImages,
);

router.delete(
  "/:id/gallery/:imageId",

  controller.deleteGalleryImage,
);

// ============================================================
// BULK ACTIONS
// ============================================================

router.delete(
  "/bulk-delete",

  controller.bulkDeleteProducts,
);

router.delete(
  "/bulk-force-delete",

  controller.bulkForceDeleteProducts,
);

router.patch(
  "/bulk-restore",

  controller.bulkRestoreProducts,
);

// ============================================================
// PRODUCT STATUS
// ============================================================

router.patch(
  "/:id/toggle-status",

  controller.toggleProductStatus,
);

// ============================================================
// DUPLICATE PRODUCT
// ============================================================

router.post(
  "/:id/duplicate",

  controller.duplicateProduct,
);

// ============================================================
// CREATE PRODUCT
// ============================================================

router.post(
  "/",

  uploadProduct.fields([
    {
      name: "thumbnail",
      maxCount: 1,
    },

    {
      name: "gallery",
      maxCount: 10,
    },
  ]),

  controller.createProduct,
);

// ============================================================
// UPDATE PRODUCT
// ============================================================

router.patch(
  "/:id",

  uploadProduct.fields([
    {
      name: "thumbnail",
      maxCount: 1,
    },

    {
      name: "gallery",
      maxCount: 10,
    },
  ]),

  controller.updateProduct,
);

// ============================================================
// DELETE / RESTORE PRODUCT
// ============================================================

router.delete(
  "/:id",

  controller.deleteProduct,
);

router.patch(
  "/:id/restore",

  controller.restoreProduct,
);

router.delete(
  "/:id/force",

  controller.forceDeleteProduct,
);

// ============================================================
// PRODUCT DETAIL
//
// Route động /:id đặt cuối file.
// ============================================================

router.get(
  "/:id",

  controller.getProductById,
);

module.exports = router;
