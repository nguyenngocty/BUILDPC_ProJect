const express = require("express");

const buildController = require("../../controllers/client/buildController");

const pcPartController = require("../../controllers/client/pcPartController");

const pcPartTypeController = require("../../controllers/client/pcPartTypeController");

const { requireAuth } = require("../../middlewares/authMiddleware");

const router = express.Router();

// ============================================================
// PUBLIC BUILD PC
// ============================================================

// ------------------------------------------------------------
// GET /api/client/builds/part-types
// ------------------------------------------------------------

router.get("/part-types", pcPartTypeController.getPcPartTypes);

// ------------------------------------------------------------
// GET /api/client/builds/parts
// ------------------------------------------------------------

router.get("/parts", pcPartController.getPcParts);

// ------------------------------------------------------------
// GET /api/client/builds/parts/type/:typeId
// ------------------------------------------------------------

router.get("/parts/type/:typeId", pcPartController.getPcPartsByType);

// ------------------------------------------------------------
// GET /api/client/builds/parts/:id
//
// Phải đứng sau /parts/type/:typeId.
// ------------------------------------------------------------

router.get("/parts/:id", pcPartController.getPcPartById);

// ============================================================
// SMART AUTO BUILD - PUBLIC
// ============================================================

// ------------------------------------------------------------
// GET /api/client/builds/auto-build/options
// ------------------------------------------------------------

router.get("/auto-build/options", buildController.getAutoBuildOptions);

// ------------------------------------------------------------
// POST /api/client/builds/auto-build
// ------------------------------------------------------------

router.post("/auto-build", buildController.autoBuild);

// ============================================================
// VALIDATE - PUBLIC
// ============================================================

// ------------------------------------------------------------
// POST /api/client/builds/validate
// ------------------------------------------------------------

router.post("/validate", buildController.validateBuild);

// ============================================================
// BUILD → CART
// ============================================================

// ------------------------------------------------------------
// Temporary Build → Cart
//
// POST /api/client/builds/cart
//
// Body:
//
// {
//   "items": [
//     {
//       "part_id": 3,
//       "quantity": 1
//     }
//   ]
// }
// ------------------------------------------------------------

router.post("/cart", requireAuth, buildController.addBuildToCart);

// ============================================================
// MY BUILDS - AUTH REQUIRED
// ============================================================

// ------------------------------------------------------------
// POST /api/client/builds/my-builds
// ------------------------------------------------------------

router.post("/my-builds", requireAuth, buildController.saveBuild);

// ------------------------------------------------------------
// GET /api/client/builds/my-builds
// ------------------------------------------------------------

router.get("/my-builds", requireAuth, buildController.getMyBuilds);

// ------------------------------------------------------------
// Saved Build → Cart
//
// POST /api/client/builds/my-builds/:id/cart
//
// QUAN TRỌNG:
// route này phải đứng trước /my-builds/:id.
// ------------------------------------------------------------

router.post(
  "/my-builds/:id/cart",
  requireAuth,
  buildController.addMyBuildToCart,
);

// ------------------------------------------------------------
// GET /api/client/builds/my-builds/:id
// ------------------------------------------------------------

router.get("/my-builds/:id", requireAuth, buildController.getMyBuildById);

// ------------------------------------------------------------
// PUT /api/client/builds/my-builds/:id
// ------------------------------------------------------------

router.put("/my-builds/:id", requireAuth, buildController.updateMyBuild);

// ------------------------------------------------------------
// DELETE /api/client/builds/my-builds/:id
// ------------------------------------------------------------

router.delete("/my-builds/:id", requireAuth, buildController.deleteMyBuild);

module.exports = router;
