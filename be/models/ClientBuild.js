const database = require("../config/database");
const PcBuild = require("./PcBuild");

const pool =
  database.pool ||
  database.db ||
  database.connection ||
  database.conn ||
  database;

// ============================================================
// HELPERS
// ============================================================

const normalizeInt = (value, defaultValue = 0) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const normalizePositiveInt = (value, defaultValue = null) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return defaultValue;
  }

  return parsed;
};

const createBusinessError = (message, statusCode = 400, details = null) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.status = statusCode;

  if (details) {
    error.details = details;
  }

  return error;
};

// ============================================================
// CLIENT BUILD MODEL
//
// Mục đích:
//
// - Scope build theo user đăng nhập.
// - Không duplicate compatibility.
// - Create/Update/Delete vẫn gọi PcBuild.
// - Chặn User A truy cập Build của User B.
// ============================================================

class ClientBuild {
  // ==========================================================
  // CHECK OWNERSHIP
  // ==========================================================

  static async ownsBuild(userId, buildId, { includeDeleted = false } = {}) {
    const normalizedUserId = normalizePositiveInt(userId);

    const normalizedBuildId = normalizePositiveInt(buildId);

    if (!normalizedUserId || !normalizedBuildId) {
      return false;
    }

    const deletedCondition = includeDeleted ? "" : "AND deleted_at IS NULL";

    const [rows] = await pool.query(
      `
        SELECT id

        FROM pc_builds

        WHERE id = ?
          AND user_id = ?
          AND build_type = 'user'
          ${deletedCondition}

        LIMIT 1
      `,
      [normalizedBuildId, normalizedUserId],
    );

    return Boolean(rows[0]);
  }

  // ==========================================================
  // GET MY BUILDS
  //
  // GET /api/client/builds/my-builds
  //
  // Chỉ trả build của đúng user.
  // List chỉ trả summary để tránh N+1 query items.
  // ==========================================================

  static async findByUser(
    userId,
    { search = "", page = 1, limit = 10, sort = "newest" } = {},
  ) {
    const normalizedUserId = normalizePositiveInt(userId);

    if (!normalizedUserId) {
      throw createBusinessError("Người dùng không hợp lệ", 401);
    }

    const pageNumber = Math.max(normalizeInt(page, 1), 1);

    const limitNumber = Math.min(Math.max(normalizeInt(limit, 10), 1), 50);

    const offset = (pageNumber - 1) * limitNumber;

    const where = [
      "pb.user_id = ?",
      "pb.build_type = 'user'",
      "pb.deleted_at IS NULL",
    ];

    const params = [normalizedUserId];

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    const normalizedSearch = String(search || "").trim();

    if (normalizedSearch) {
      where.push(`
        (
          pb.name LIKE ?
          OR pb.description LIKE ?
        )
      `);

      const keyword = `%${normalizedSearch}%`;

      params.push(keyword, keyword);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    // --------------------------------------------------------
    // SORT
    // --------------------------------------------------------

    const sortMap = {
      newest: "pb.id DESC",

      oldest: "pb.id ASC",

      updated: "pb.updated_at DESC, pb.id DESC",

      price_asc: "pb.total_price ASC, pb.id DESC",

      price_desc: "pb.total_price DESC, pb.id DESC",

      name_asc: "pb.name ASC, pb.id DESC",

      name_desc: "pb.name DESC, pb.id DESC",
    };

    const normalizedSort = String(sort || "newest")
      .trim()
      .toLowerCase();

    const orderBy = sortMap[normalizedSort] || sortMap.newest;

    // --------------------------------------------------------
    // DATA
    // --------------------------------------------------------

    const [rows] = await pool.query(
      `
        SELECT
          pb.id,
          pb.user_id,
          pb.build_type,
          pb.name,
          pb.description,
          pb.image,
          pb.total_price,
          pb.status,
          pb.is_featured,
          pb.created_at,
          pb.updated_at,

          (
            SELECT COUNT(*)

            FROM pc_build_items pbi

            WHERE pbi.build_id = pb.id
              AND pbi.deleted_at IS NULL
              AND pbi.replaced_at IS NULL
          ) AS item_count

        FROM pc_builds pb

        ${whereSql}

        ORDER BY ${orderBy}

        LIMIT ?
        OFFSET ?
      `,
      [...params, limitNumber, offset],
    );

    // --------------------------------------------------------
    // COUNT
    // --------------------------------------------------------

    const [countRows] = await pool.query(
      `
          SELECT
            COUNT(*) AS total

          FROM pc_builds pb

          ${whereSql}
        `,
      params,
    );

    const total = Number(countRows[0]?.total || 0);

    const data = rows.map((build) => ({
      ...build,

      id: Number(build.id),

      user_id: build.user_id !== null ? Number(build.user_id) : null,

      total_price: Number(build.total_price || 0),

      status: Number(build.status || 0),

      is_featured: Number(build.is_featured || 0),

      item_count: Number(build.item_count || 0),
    }));

    return {
      data,

      pagination: {
        page: pageNumber,

        limit: limitNumber,

        total,

        totalPages: total === 0 ? 0 : Math.ceil(total / limitNumber),

        hasNextPage: pageNumber * limitNumber < total,

        hasPrevPage: pageNumber > 1,
      },

      filters: {
        search: normalizedSearch,

        sort: normalizedSort,
      },
    };
  }

  // ==========================================================
  // GET OWN BUILD DETAIL
  // ==========================================================

  static async findOwnedById(userId, buildId) {
    const normalizedUserId = normalizePositiveInt(userId);

    const normalizedBuildId = normalizePositiveInt(buildId);

    if (!normalizedUserId || !normalizedBuildId) {
      return null;
    }

    const owns = await this.ownsBuild(normalizedUserId, normalizedBuildId);

    if (!owns) {
      // Cố ý trả null thay vì Forbidden.
      //
      // User A không cần biết Build ID này
      // có tồn tại nhưng thuộc User B hay không.
      return null;
    }

    const build = await PcBuild.findById(normalizedBuildId);

    if (!build) {
      return null;
    }

    return {
      ...build,

      id: Number(build.id),

      user_id: build.user_id !== null ? Number(build.user_id) : null,

      total_price: Number(build.total_price || 0),

      status: Number(build.status || 0),

      is_featured: Number(build.is_featured || 0),
    };
  }

  // ==========================================================
  // CREATE MY BUILD
  //
  // Security:
  //
  // FE không được quyết định:
  // - user_id
  // - build_type
  // - status
  // - is_featured
  // - total_price
  // - price của item
  // - product_id
  // - variant_id
  // ==========================================================

  static async createForUser(userId, data = {}) {
    const normalizedUserId = normalizePositiveInt(userId);

    if (!normalizedUserId) {
      throw createBusinessError("Người dùng không hợp lệ", 401);
    }

    const name = String(data.name || "").trim();

    if (!name) {
      throw createBusinessError("Vui lòng nhập tên cấu hình PC", 400);
    }

    if (name.length > 255) {
      throw createBusinessError("Tên cấu hình PC quá dài", 400);
    }

    const items = Array.isArray(data.items) ? data.items : [];

    if (!items.length) {
      throw createBusinessError("Vui lòng chọn ít nhất một linh kiện", 400);
    }

    const payload = {
      user_id: normalizedUserId,

      build_type: "user",

      name,

      description: data.description ? String(data.description).trim() : null,

      image: data.image ? String(data.image).trim() : null,

      // Client không được tự set các field này.
      status: 1,

      is_featured: 0,

      // PcBuild.prepareItems()
      // sẽ resolve toàn bộ dữ liệu thật.
      items,
    };

    return PcBuild.create(payload);
  }

  // ==========================================================
  // UPDATE MY BUILD
  // ==========================================================

  static async updateForUser(userId, buildId, data = {}) {
    const normalizedUserId = normalizePositiveInt(userId);

    const normalizedBuildId = normalizePositiveInt(buildId);

    if (!normalizedUserId || !normalizedBuildId) {
      return null;
    }

    const owns = await this.ownsBuild(normalizedUserId, normalizedBuildId);

    if (!owns) {
      return null;
    }

    // --------------------------------------------------------
    // WHITELIST
    //
    // Không spread req.body vào PcBuild.update().
    // --------------------------------------------------------

    const payload = {};

    if (Object.prototype.hasOwnProperty.call(data, "name")) {
      const name = String(data.name || "").trim();

      if (!name) {
        throw createBusinessError("Tên cấu hình PC không hợp lệ", 400);
      }

      if (name.length > 255) {
        throw createBusinessError("Tên cấu hình PC quá dài", 400);
      }

      payload.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(data, "description")) {
      payload.description = data.description
        ? String(data.description).trim()
        : null;
    }

    if (Object.prototype.hasOwnProperty.call(data, "image")) {
      payload.image = data.image ? String(data.image).trim() : null;
    }

    if (Object.prototype.hasOwnProperty.call(data, "items")) {
      if (!Array.isArray(data.items) || !data.items.length) {
        throw createBusinessError(
          "Cấu hình phải có ít nhất một linh kiện",
          400,
        );
      }

      payload.items = data.items;
    }

    // Không cho Client update:
    //
    // payload.user_id
    // payload.build_type
    // payload.status
    // payload.is_featured
    // payload.total_price

    return PcBuild.update(normalizedBuildId, payload);
  }

  // ==========================================================
  // DELETE MY BUILD
  // ==========================================================

  static async deleteForUser(userId, buildId) {
    const normalizedUserId = normalizePositiveInt(userId);

    const normalizedBuildId = normalizePositiveInt(buildId);

    if (!normalizedUserId || !normalizedBuildId) {
      return false;
    }

    const owns = await this.ownsBuild(normalizedUserId, normalizedBuildId);

    if (!owns) {
      return false;
    }

    return PcBuild.delete(normalizedBuildId);
  }
}

module.exports = ClientBuild;
