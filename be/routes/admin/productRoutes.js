const express = require("express");
const controller = require("../../controllers/admin/productController");
const uploadProduct = require("../../middlewares/uploadProduct");

const router = express.Router();

router.get("/", controller.getAllProducts);
router.get("/trash", controller.getTrashProducts);
router.get("/stock-warning", controller.getStockWarning);
router.get("/statistics", controller.getProductStatistics);
router.get("/top-selling", controller.getTopSellingProducts);
router.get("/newest", controller.getNewestProducts);
router.get("/:id/stock-history", controller.getStockHistory);
router.get("/stock-report", controller.getStockReport);
router.get("/dashboard", controller.getDashboard);
router.get("/check-sku", controller.checkSku);
router.get("/search-suggestion", controller.searchSuggestion);
router.get("/form-data", controller.getFormData);
router.get("/:id", controller.getProductById);
router.post(
  "/:id/gallery",
  uploadProduct.array("gallery", 10),
  controller.uploadGalleryImages,
);
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

router.delete("/:id/gallery/:imageId", controller.deleteGalleryImage);

router.delete("/bulk-delete", controller.bulkDeleteProducts);
router.delete("/bulk-force-delete", controller.bulkForceDeleteProducts);

router.patch("/bulk-restore", controller.bulkRestoreProducts);

router.patch("/:id/toggle-status", controller.toggleProductStatus);

router.patch("/:id/adjust-stock", controller.adjustStock);

router.post("/:id/duplicate", controller.duplicateProduct);

router.patch(
  "/:id",
  uploadProduct.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  controller.updateProduct,
);

router.delete("/:id", controller.deleteProduct);
router.patch("/:id/restore", controller.restoreProduct);
router.delete("/:id/force", controller.forceDeleteProduct);

module.exports = router;
