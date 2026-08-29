const { pool } = require("../config/database");
const ProductVariant = require("./ProductVariant");

class Product {
  // ============================================================
  // ADMIN - DETAIL
  // ============================================================

  static async getById(id) {
    const [products] = await pool.execute(
      `
        SELECT
          p.id,
          p.category_id,
          c.name AS category_name,

          p.name,
          p.slug,
          p.sku,

          p.price,
          p.sale_price,
          p.quantity,

          p.thumbnail,
          p.short_description,
          p.description,

          p.status,

          p.socket,
          p.ram_type,

          p.created_at,
          p.updated_at

        FROM products p

        LEFT JOIN categories c
          ON c.id = p.category_id

        WHERE
          p.id = ?
          AND p.deleted_at IS NULL

        LIMIT 1
      `,
      [id],
    );

    if (products.length === 0) {
      return null;
    }

    const product = products[0];

    // ==========================================================
    // Gallery
    // ==========================================================

    const [images] = await pool.execute(
      `
        SELECT
          id,
          image_url,
          sort_order

        FROM product_images

        WHERE
          product_id = ?
          AND deleted_at IS NULL

        ORDER BY
          sort_order ASC,
          id ASC
      `,
      [id],
    );

    // ==========================================================
    // Specifications
    // ==========================================================

    const [specifications] = await pool.execute(
      `
        SELECT
          id,
          spec_key,
          spec_value

        FROM product_specifications

        WHERE
          product_id = ?
          AND deleted_at IS NULL

        ORDER BY id ASC
      `,
      [id],
    );

    // ==========================================================
    // Variants + Options
    // ==========================================================

    const variantData = await ProductVariant.getProductVariantData(id);

    return {
      ...product,

      id: Number(product.id),
      category_id: Number(product.category_id),

      price: Number(product.price || 0),

      sale_price:
        product.sale_price !== null ? Number(product.sale_price) : null,

      quantity: Number(product.quantity || 0),

      status: Number(product.status),

      gallery: images.map((image) => ({
        ...image,
        id: Number(image.id),
        sort_order: Number(image.sort_order || 0),
      })),

      specifications: specifications.map((item) => ({
        ...item,
        id: Number(item.id),
      })),

      options: variantData.options,

      variants: variantData.variants,

      has_variants: variantData.has_variants,
    };
  }

  // ============================================================
  // ADMIN - LIST
  // ============================================================

  static async getAll({
    page = 1,
    limit = 10,
    search = "",
    category = "",
    status = "",
    stock = "",
    sort = "newest",
  } = {}) {
    page = Number(page) || 1;
    limit = Number(limit) || 10;

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    // Không cho admin lấy quá nhiều record trong một request.
    limit = Math.min(limit, 100);

    const offset = (page - 1) * limit;

    let where = `
      WHERE p.deleted_at IS NULL
    `;

    const params = [];

    // ==========================================================
    // Search
    // ==========================================================

    if (search) {
      where += `
        AND (
          p.name LIKE ?
          OR p.sku LIKE ?
        )
      `;

      params.push(`%${search}%`);
      params.push(`%${search}%`);
    }

    // ==========================================================
    // Category
    // ==========================================================

    if (category) {
      where += `
        AND p.category_id = ?
      `;

      params.push(category);
    }

    // ==========================================================
    // Status
    // ==========================================================

    if (status !== "") {
      where += `
        AND p.status = ?
      `;

      params.push(status);
    }

    // ==========================================================
    // Stock
    //
    // QUAN TRỌNG:
    // products.quantity giờ được xem là tồn kho HIỆN TẠI.
    //
    // Không được:
    // quantity - SUM(order_items.quantity)
    //
    // vì khi checkout tồn kho đã được giảm.
    // ==========================================================

    if (stock === "out") {
      where += `
        AND p.quantity <= 0
      `;
    }

    if (stock === "low") {
      where += `
        AND p.quantity BETWEEN 1 AND 5
      `;
    }

    if (stock === "instock") {
      where += `
        AND p.quantity > 5
      `;
    }

    // ==========================================================
    // Sort
    // ==========================================================

    let orderBy = `
      ORDER BY p.created_at DESC, p.id DESC
    `;

    switch (sort) {
      case "oldest":
        orderBy = `
          ORDER BY p.created_at ASC, p.id ASC
        `;
        break;

      case "price_asc":
        orderBy = `
          ORDER BY p.price ASC, p.id DESC
        `;
        break;

      case "price_desc":
        orderBy = `
          ORDER BY p.price DESC, p.id DESC
        `;
        break;

      case "name_asc":
        orderBy = `
          ORDER BY p.name ASC, p.id DESC
        `;
        break;

      case "name_desc":
        orderBy = `
          ORDER BY p.name DESC, p.id DESC
        `;
        break;

      case "stock_desc":
        orderBy = `
          ORDER BY p.quantity DESC, p.id DESC
        `;
        break;

      case "stock_asc":
        orderBy = `
          ORDER BY p.quantity ASC, p.id DESC
        `;
        break;

      default:
        break;
    }

    // ==========================================================
    // Count
    // ==========================================================

    const [[count]] = await pool.execute(
      `
        SELECT COUNT(*) AS total

        FROM products p

        ${where}
      `,
      params,
    );

    // ==========================================================
    // Products
    // ==========================================================

    const sql = `
      SELECT
        p.id,
        p.category_id,

        c.name AS category_name,

        p.name,
        p.slug,
        p.sku,

        p.price,
        p.sale_price,

        p.quantity,

        COALESCE(
          sales.sold,
          0
        ) AS sold,

        p.quantity AS remaining,

        CASE
          WHEN p.quantity <= 0
            THEN 'out_of_stock'

          WHEN p.quantity <= 5
            THEN 'low_stock'

          ELSE 'in_stock'
        END AS stock_status,

        (
          SELECT COUNT(*)
          FROM product_variants pv
          WHERE
            pv.product_id = p.id
            AND pv.deleted_at IS NULL
        ) AS variant_count,

        p.thumbnail,
        p.short_description,
        p.description,

        p.status,

        p.socket,
        p.ram_type,

        p.created_at,
        p.updated_at

      FROM products p

      LEFT JOIN categories c
        ON c.id = p.category_id

      LEFT JOIN (
        SELECT
          oi.product_id,
          SUM(oi.quantity) AS sold

        FROM order_items oi

        INNER JOIN orders o
          ON o.id = oi.order_id

        WHERE
          oi.deleted_at IS NULL
          AND o.deleted_at IS NULL
          AND o.status = 'COMPLETED'

        GROUP BY oi.product_id
      ) sales
        ON sales.product_id = p.id

      ${where}

      ${orderBy}

      LIMIT ?
      OFFSET ?
    `;

    const [rows] = await pool.execute(sql, [...params, limit, offset]);

    return {
      products: rows.map((item) => ({
        ...item,

        id: Number(item.id),
        category_id: Number(item.category_id),

        price: Number(item.price || 0),

        sale_price: item.sale_price !== null ? Number(item.sale_price) : null,

        quantity: Number(item.quantity || 0),
        sold: Number(item.sold || 0),
        remaining: Number(item.remaining || 0),

        variant_count: Number(item.variant_count || 0),

        status: Number(item.status),
      })),

      pagination: {
        page,
        limit,
        total: Number(count.total || 0),

        totalPages:
          Number(count.total || 0) > 0
            ? Math.ceil(Number(count.total) / limit)
            : 0,
      },
    };
  }

  // ============================================================
  // ADMIN - STOCK WARNING
  // ============================================================

  static async getStockWarning(lowStock = 5) {
    lowStock = Number(lowStock);

    if (!Number.isFinite(lowStock) || lowStock < 1) {
      lowStock = 5;
    }

    const [rows] = await pool.execute(
      `
        SELECT
          p.id,
          p.name,
          p.sku,
          p.quantity,

          COALESCE(
            sales.sold,
            0
          ) AS sold,

          p.quantity AS remaining

        FROM products p

        LEFT JOIN (
          SELECT
            oi.product_id,
            SUM(oi.quantity) AS sold

          FROM order_items oi

          INNER JOIN orders o
            ON o.id = oi.order_id

          WHERE
            oi.deleted_at IS NULL
            AND o.deleted_at IS NULL
            AND o.status = 'COMPLETED'

          GROUP BY oi.product_id
        ) sales
          ON sales.product_id = p.id

        WHERE
          p.deleted_at IS NULL
          AND p.status = 1

        ORDER BY
          p.quantity ASC,
          p.name ASC
      `,
    );

    const outOfStock = [];
    const lowStockProducts = [];

    for (const product of rows) {
      const item = {
        ...product,

        id: Number(product.id),
        quantity: Number(product.quantity || 0),
        sold: Number(product.sold || 0),
        remaining: Number(product.quantity || 0),
      };

      if (item.quantity <= 0) {
        outOfStock.push(item);
      } else if (item.quantity <= lowStock) {
        lowStockProducts.push(item);
      }
    }

    return {
      outOfStock,
      lowStock: lowStockProducts,
    };
  }

  // ============================================================
  // ADMIN - STATISTICS
  // ============================================================

  static async getStatistics() {
    const [[stat]] = await pool.execute(
      `
        SELECT
          COUNT(*) AS total_products,

          SUM(
            CASE
              WHEN deleted_at IS NULL
              THEN 1
              ELSE 0
            END
          ) AS total_active,

          SUM(
            CASE
              WHEN status = 1
                AND deleted_at IS NULL
              THEN 1
              ELSE 0
            END
          ) AS published,

          SUM(
            CASE
              WHEN status = 0
                AND deleted_at IS NULL
              THEN 1
              ELSE 0
            END
          ) AS hidden,

          SUM(
            CASE
              WHEN deleted_at IS NOT NULL
              THEN 1
              ELSE 0
            END
          ) AS trash

        FROM products
      `,
    );

    const [[stockStat]] = await pool.execute(
      `
        SELECT
          SUM(
            CASE
              WHEN quantity <= 0
              THEN 1
              ELSE 0
            END
          ) AS out_of_stock,

          SUM(
            CASE
              WHEN quantity BETWEEN 1 AND 5
              THEN 1
              ELSE 0
            END
          ) AS low_stock

        FROM products

        WHERE deleted_at IS NULL
      `,
    );

    return {
      total_products: Number(stat.total_products || 0),

      total_active: Number(stat.total_active || 0),

      published: Number(stat.published || 0),

      hidden: Number(stat.hidden || 0),

      trash: Number(stat.trash || 0),

      out_of_stock: Number(stockStat.out_of_stock || 0),

      low_stock: Number(stockStat.low_stock || 0),
    };
  }

  // ============================================================
  // ADMIN - TOP SELLING
  // ============================================================

  static async getTopSelling(limit = 10) {
    limit = Number(limit);

    if (!Number.isInteger(limit) || limit < 1) {
      limit = 10;
    }

    limit = Math.min(limit, 100);

    const sql = `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.sku,
        p.thumbnail,
        p.price,
        p.sale_price,
        p.quantity,

        COALESCE(
          sales.sold,
          0
        ) AS sold

      FROM products p

      LEFT JOIN (
        SELECT
          oi.product_id,

          SUM(oi.quantity) AS sold

        FROM order_items oi

        INNER JOIN orders o
          ON o.id = oi.order_id

        WHERE
          oi.deleted_at IS NULL
          AND o.deleted_at IS NULL
          AND o.status = 'COMPLETED'

        GROUP BY oi.product_id
      ) sales
        ON sales.product_id = p.id

      WHERE p.deleted_at IS NULL

      ORDER BY
        sold DESC,
        p.created_at DESC

      LIMIT ?
    `;

    const [rows] = await pool.query(sql, [limit]);

    return rows.map((item) => ({
      ...item,

      id: Number(item.id),

      price: Number(item.price || 0),

      sale_price: item.sale_price !== null ? Number(item.sale_price) : null,

      quantity: Number(item.quantity || 0),

      sold: Number(item.sold || 0),
    }));
  }

  // ============================================================
  // ADMIN - NEWEST
  // ============================================================

  static async getNewestProducts(limit = 10) {
    limit = Number(limit);

    if (!Number.isInteger(limit) || limit < 1) {
      limit = 10;
    }

    limit = Math.min(limit, 100);

    const [rows] = await pool.query(
      `
        SELECT
          p.id,
          p.name,
          p.slug,
          p.sku,

          p.thumbnail,

          p.price,
          p.sale_price,
          p.quantity,

          p.status,

          c.name AS category_name,

          p.created_at

        FROM products p

        LEFT JOIN categories c
          ON c.id = p.category_id

        WHERE p.deleted_at IS NULL

        ORDER BY
          p.created_at DESC,
          p.id DESC

        LIMIT ?
      `,
      [limit],
    );

    return rows;
  }

  // ============================================================
  // ADMIN - TRASH
  // ============================================================

  static async getTrash({ page = 1, limit = 10, search = "" } = {}) {
    page = Number(page) || 1;
    limit = Number(limit) || 10;

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    limit = Math.min(limit, 100);

    const offset = (page - 1) * limit;

    let where = `
      WHERE p.deleted_at IS NOT NULL
    `;

    const params = [];

    if (search) {
      where += `
        AND (
          p.name LIKE ?
          OR p.sku LIKE ?
        )
      `;

      params.push(`%${search}%`);
      params.push(`%${search}%`);
    }

    const [[count]] = await pool.execute(
      `
        SELECT COUNT(*) AS total

        FROM products p

        ${where}
      `,
      params,
    );

    const [rows] = await pool.execute(
      `
        SELECT
          p.id,
          p.category_id,

          c.name AS category_name,

          p.name,
          p.slug,
          p.sku,

          p.price,
          p.sale_price,
          p.quantity,

          p.thumbnail,

          p.status,

          p.deleted_at

        FROM products p

        LEFT JOIN categories c
          ON c.id = p.category_id

        ${where}

        ORDER BY p.deleted_at DESC

        LIMIT ?
        OFFSET ?
      `,
      [...params, limit, offset],
    );

    return {
      products: rows,

      pagination: {
        page,
        limit,

        total: Number(count.total || 0),

        totalPages:
          Number(count.total || 0) > 0
            ? Math.ceil(Number(count.total) / limit)
            : 0,
      },
    };
  }

  // ============================================================
  // ADMIN - INCLUDE DELETED
  // ============================================================

  static async getByIdIncludeDeleted(id) {
    const [rows] = await pool.execute(
      `
        SELECT *
        FROM products
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  }

  static async getDeletedById(id) {
    const [rows] = await pool.execute(
      `
        SELECT
          id,
          name,
          sku,
          deleted_at

        FROM products

        WHERE id = ?

        LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  }

  // ============================================================
  // FILES
  // ============================================================

  static async getFilesForDelete(id) {
    const [rows] = await pool.execute(
      `
        SELECT thumbnail
        FROM products
        WHERE id = ?
        LIMIT 1
      `,
      [id],
    );

    if (rows.length === 0) {
      return null;
    }

    const [gallery] = await pool.execute(
      `
        SELECT image_url
        FROM product_images
        WHERE product_id = ?
      `,
      [id],
    );

    const [variantImages] = await pool.execute(
      `
        SELECT pvi.image_url

        FROM product_variant_images pvi

        INNER JOIN product_variants pv
          ON pv.id = pvi.variant_id

        WHERE pv.product_id = ?
      `,
      [id],
    );

    return {
      thumbnail: rows[0].thumbnail,

      gallery,

      variantImages,
    };
  }

  // ============================================================
  // SLUG
  // ============================================================

  static async isSlugExists(slug, excludeId = null) {
    let sql = `
      SELECT id
      FROM products
      WHERE slug = ?
    `;

    const params = [slug];

    if (excludeId) {
      sql += `
        AND id <> ?
      `;

      params.push(excludeId);
    }

    sql += `
      LIMIT 1
    `;

    const [rows] = await pool.execute(sql, params);

    return rows.length > 0;
  }

  static slugify(value = "") {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  static async generateUniqueSlug(name, excludeId = null) {
    const baseSlug = Product.slugify(name) || `product-${Date.now()}`;

    let slug = baseSlug;
    let suffix = 2;

    while (await Product.isSlugExists(slug, excludeId)) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    return slug;
  }

  // ============================================================
  // ADMIN - CREATE PRODUCT
  // ============================================================

  static async create(connection, data) {
    const slug = data.slug || (await Product.generateUniqueSlug(data.name));

    const sql = `
      INSERT INTO products
      (
        category_id,
        name,
        slug,
        sku,
        price,
        sale_price,
        quantity,
        thumbnail,
        short_description,
        description,
        status,
        socket,
        ram_type
      )
      VALUES
      (
        ?,?,?,?,?,?,?,?,?,?,?,?,?
      )
    `;

    const values = [
      data.category_id,

      String(data.name || "").trim(),

      slug,

      String(data.sku || "").trim(),

      Number(data.price),

      data.sale_price === "" ||
      data.sale_price === null ||
      data.sale_price === undefined
        ? null
        : Number(data.sale_price),

      Number(data.quantity || 0),

      data.thumbnail || null,

      data.short_description || null,

      data.description || null,

      data.status !== undefined ? Number(data.status) : 1,

      data.socket || null,

      data.ram_type || null,
    ];

    const [result] = await connection.execute(sql, values);

    return result.insertId;
  }

  // ============================================================
  // ADMIN - DUPLICATE PRODUCT BASE
  // ============================================================

  static async duplicateProduct(connection, product) {
    const newName = `${product.name} (Copy)`;

    const newSlug = await Product.generateUniqueSlug(newName);

    const generatedSku = `${product.sku}-COPY-${Date.now()}`;

    const [result] = await connection.execute(
      `
        INSERT INTO products
        (
          category_id,
          name,
          slug,
          sku,
          price,
          sale_price,
          quantity,
          thumbnail,
          short_description,
          description,
          status,
          socket,
          ram_type
        )
        VALUES
        (
          ?,?,?,?,?,?,?,?,?,?,?,?,?
        )
      `,
      [
        product.category_id,

        newName,

        newSlug,

        generatedSku,

        product.price,

        product.sale_price ?? null,

        product.quantity,

        product.thumbnail ?? null,

        product.short_description || null,

        product.description ?? null,

        // Bản copy mặc định ẩn.
        0,

        product.socket ?? null,

        product.ram_type ?? null,
      ],
    );

    return result.insertId;
  }

  // ============================================================
  // GALLERY
  // ============================================================

  static async insertGallery(connection, productId, images) {
    if (!Array.isArray(images) || images.length === 0) {
      return;
    }

    const sql = `
      INSERT INTO product_images
      (
        product_id,
        image_url,
        sort_order
      )
      VALUES (?, ?, ?)
    `;

    for (let i = 0; i < images.length; i++) {
      await connection.execute(sql, [
        productId,

        `/uploads/products/${images[i].filename}`,

        i + 1,
      ]);
    }
  }

  static async duplicateGallery(connection, oldId, newId) {
    const [rows] = await connection.execute(
      `
        SELECT
          image_url,
          sort_order

        FROM product_images

        WHERE
          product_id = ?
          AND deleted_at IS NULL
      `,
      [oldId],
    );

    for (const image of rows) {
      await connection.execute(
        `
          INSERT INTO product_images
          (
            product_id,
            image_url,
            sort_order
          )
          VALUES (?, ?, ?)
        `,
        [newId, image.image_url, image.sort_order],
      );
    }
  }

  static async getGallery(productId) {
    const [rows] = await pool.execute(
      `
        SELECT
          id,
          image_url,
          sort_order

        FROM product_images

        WHERE
          product_id = ?
          AND deleted_at IS NULL

        ORDER BY
          sort_order ASC,
          id ASC
      `,
      [productId],
    );

    return rows;
  }

  static async deleteGallery(connection, productId) {
    await connection.execute(
      `
        DELETE
        FROM product_images
        WHERE product_id = ?
      `,
      [productId],
    );
  }

  static async addGallery(connection, productId, files) {
    if (!Array.isArray(files) || files.length === 0) {
      return;
    }

    const [[max]] = await connection.execute(
      `
        SELECT
          IFNULL(MAX(sort_order), 0) AS maxOrder

        FROM product_images

        WHERE
          product_id = ?
          AND deleted_at IS NULL
      `,
      [productId],
    );

    let order = Number(max.maxOrder || 0);

    for (const file of files) {
      order++;

      await connection.execute(
        `
          INSERT INTO product_images
          (
            product_id,
            image_url,
            sort_order
          )
          VALUES (?, ?, ?)
        `,
        [productId, `/uploads/products/${file.filename}`, order],
      );
    }
  }

  static async getGalleryImage(imageId) {
    const [rows] = await pool.execute(
      `
        SELECT *
        FROM product_images
        WHERE
          id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [imageId],
    );

    return rows[0] || null;
  }

  static async deleteGalleryImage(connection, imageId) {
    const [result] = await connection.execute(
      `
        DELETE
        FROM product_images
        WHERE id = ?
      `,
      [imageId],
    );

    return result.affectedRows;
  }

  // ============================================================
  // SPECIFICATIONS
  // ============================================================

  static async insertSpecifications(connection, productId, specifications) {
    if (!Array.isArray(specifications) || specifications.length === 0) {
      return;
    }

    const sql = `
      INSERT INTO product_specifications
      (
        product_id,
        spec_key,
        spec_value
      )
      VALUES (?, ?, ?)
    `;

    for (const spec of specifications) {
      await connection.execute(sql, [
        productId,
        spec.spec_key,
        spec.spec_value,
      ]);
    }
  }

  static async duplicateSpecifications(connection, oldId, newId) {
    const [rows] = await connection.execute(
      `
        SELECT
          spec_key,
          spec_value

        FROM product_specifications

        WHERE
          product_id = ?
          AND deleted_at IS NULL
      `,
      [oldId],
    );

    for (const spec of rows) {
      await connection.execute(
        `
          INSERT INTO product_specifications
          (
            product_id,
            spec_key,
            spec_value
          )
          VALUES (?, ?, ?)
        `,
        [newId, spec.spec_key, spec.spec_value],
      );
    }
  }

  static async deleteSpecifications(connection, productId) {
    await connection.execute(
      `
        DELETE FROM product_specifications
        WHERE product_id = ?
      `,
      [productId],
    );
  }

  // ============================================================
  // SKU
  // ============================================================

  static async isSkuExists(sku) {
    const [rows] = await pool.execute(
      `
        SELECT id
        FROM products

        WHERE
          sku = ?
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [String(sku || "").trim()],
    );

    return rows.length > 0;
  }

  static async isSkuExistsExceptId(sku, id) {
    const [rows] = await pool.execute(
      `
        SELECT id

        FROM products

        WHERE
          sku = ?
          AND id <> ?
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [String(sku || "").trim(), id],
    );

    return rows.length > 0;
  }

  static async checkSku(sku, id = null) {
    let sql = `
      SELECT id
      FROM products

      WHERE
        sku = ?
        AND deleted_at IS NULL
    `;

    const params = [String(sku || "").trim()];

    if (id) {
      sql += `
        AND id <> ?
      `;

      params.push(id);
    }

    sql += `
      LIMIT 1
    `;

    const [rows] = await pool.execute(sql, params);

    return rows.length > 0;
  }

  // ============================================================
  // ADMIN - UPDATE
  // ============================================================

  static async update(connection, id, data) {
    const slug = await Product.generateUniqueSlug(data.name, id);

    const [result] = await connection.execute(
      `
        UPDATE products

        SET
          category_id = ?,
          name = ?,
          slug = ?,
          sku = ?,
          price = ?,
          sale_price = ?,
          quantity = ?,
          thumbnail = ?,
          short_description = ?,
          description = ?,
          status = ?,
          socket = ?,
          ram_type = ?,
          updated_at = NOW()

        WHERE
          id = ?
          AND deleted_at IS NULL
      `,
      [
        data.category_id,

        String(data.name || "").trim(),

        slug,

        String(data.sku || "").trim(),

        Number(data.price),

        data.sale_price === "" ||
        data.sale_price === null ||
        data.sale_price === undefined
          ? null
          : Number(data.sale_price),

        Number(data.quantity || 0),

        data.thumbnail || null,

        data.short_description || null,

        data.description || null,

        Number(data.status),

        data.socket || null,

        data.ram_type || null,

        id,
      ],
    );

    return result.affectedRows;
  }

  // ============================================================
  // STATUS
  // ============================================================

  static async toggleStatus(connection, id) {
    const [result] = await connection.execute(
      `
        UPDATE products

        SET
          status =
            CASE
              WHEN status = 1 THEN 0
              ELSE 1
            END,

          updated_at = NOW()

        WHERE
          id = ?
          AND deleted_at IS NULL
      `,
      [id],
    );

    return result.affectedRows;
  }

  // ============================================================
  // STOCK
  // ============================================================

  static async updateQuantity(connection, id, quantity) {
    const [result] = await connection.execute(
      `
        UPDATE products

        SET
          quantity = ?,
          updated_at = NOW()

        WHERE
          id = ?
          AND deleted_at IS NULL
      `,
      [Number(quantity), id],
    );

    return result.affectedRows;
  }

  static async decreaseStock(connection, productId, quantity) {
    const [result] = await connection.execute(
      `
        UPDATE products

        SET
          quantity = quantity - ?,
          updated_at = NOW()

        WHERE
          id = ?
          AND deleted_at IS NULL
          AND quantity >= ?
      `,
      [quantity, productId, quantity],
    );

    return result.affectedRows;
  }

  static async increaseStock(connection, productId, quantity) {
    const [result] = await connection.execute(
      `
        UPDATE products

        SET
          quantity = quantity + ?,
          updated_at = NOW()

        WHERE
          id = ?
          AND deleted_at IS NULL
      `,
      [quantity, productId],
    );

    return result.affectedRows;
  }

  // ============================================================
  // STOCK LOG
  // ============================================================

  static async insertStockLog(
    connection,
    {
      productId,
      variantId = null,
      type,
      quantity,
      quantityBefore,
      quantityAfter,
      productQuantityBefore = null,
      productQuantityAfter = null,
      referenceType = null,
      referenceId = null,
      note,
    },
  ) {
    const sql = `
    INSERT INTO product_stock_logs
    (
      product_id,
      variant_id,
      type,
      quantity,
      quantity_before,
      quantity_after,
      product_quantity_before,
      product_quantity_after,
      reference_type,
      reference_id,
      note
    )
    VALUES
    (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `;

    await connection.execute(sql, [
      productId,
      variantId || null,
      type,
      quantity,
      quantityBefore,
      quantityAfter,
      productQuantityBefore,
      productQuantityAfter,
      referenceType || null,
      referenceId || null,
      note || null,
    ]);
  }

  static async getStockHistory(productId) {
    const sql = `
    SELECT
      psl.id,
      psl.product_id,
      psl.variant_id,

      psl.type,
      psl.quantity,

      psl.quantity_before,
      psl.quantity_after,

      psl.product_quantity_before,
      psl.product_quantity_after,

      psl.reference_type,
      psl.reference_id,

      psl.note,
      psl.created_at,

      pv.sku AS variant_sku,
      pv.variant_name,

      CASE
        WHEN psl.variant_id IS NULL
          THEN 'product'
        ELSE 'variant'
      END AS stock_scope

    FROM product_stock_logs psl

    LEFT JOIN product_variants pv
      ON pv.id = psl.variant_id

    WHERE psl.product_id = ?

    ORDER BY
      psl.created_at DESC,
      psl.id DESC
  `;

    const [rows] = await pool.execute(sql, [productId]);

    return rows.map((item) => ({
      ...item,

      id: Number(item.id),

      product_id: Number(item.product_id),

      variant_id: item.variant_id !== null ? Number(item.variant_id) : null,

      quantity: Number(item.quantity || 0),

      quantity_before: Number(item.quantity_before || 0),

      quantity_after: Number(item.quantity_after || 0),

      product_quantity_before:
        item.product_quantity_before !== null
          ? Number(item.product_quantity_before)
          : null,

      product_quantity_after:
        item.product_quantity_after !== null
          ? Number(item.product_quantity_after)
          : null,

      reference_id:
        item.reference_id !== null ? Number(item.reference_id) : null,
    }));
  }

  // ============================================================
  // STOCK REPORT
  // ============================================================

  static async getStockReport() {
    const [rows] = await pool.execute(
      `
        SELECT
          p.id,
          p.name,
          p.sku,

          c.name AS category_name,

          p.quantity,

          COALESCE(
            sales.sold,
            0
          ) AS sold,

          p.quantity AS remaining,

          CASE
            WHEN p.quantity <= 0
              THEN 'out_of_stock'

            WHEN p.quantity <= 5
              THEN 'low_stock'

            ELSE 'in_stock'
          END AS stock_status,

          (
            SELECT COUNT(*)
            FROM product_variants pv
            WHERE
              pv.product_id = p.id
              AND pv.deleted_at IS NULL
          ) AS variant_count,

          p.updated_at

        FROM products p

        LEFT JOIN categories c
          ON c.id = p.category_id

        LEFT JOIN (
          SELECT
            oi.product_id,
            SUM(oi.quantity) AS sold

          FROM order_items oi

          INNER JOIN orders o
            ON o.id = oi.order_id

          WHERE
            oi.deleted_at IS NULL
            AND o.deleted_at IS NULL
            AND o.status = 'COMPLETED'

          GROUP BY oi.product_id
        ) sales
          ON sales.product_id = p.id

        WHERE p.deleted_at IS NULL

        ORDER BY p.name ASC
      `,
    );

    return rows.map((item) => ({
      ...item,

      id: Number(item.id),

      quantity: Number(item.quantity || 0),

      sold: Number(item.sold || 0),

      remaining: Number(item.remaining || 0),

      variant_count: Number(item.variant_count || 0),
    }));
  }

  // ============================================================
  // SOFT DELETE
  // ============================================================

  static async softDelete(connection, id) {
    const [result] = await connection.execute(
      `
        UPDATE products

        SET
          deleted_at = NOW(),
          updated_at = NOW()

        WHERE
          id = ?
          AND deleted_at IS NULL
      `,
      [id],
    );

    return result.affectedRows;
  }

  static async bulkDelete(connection, ids) {
    if (!Array.isArray(ids) || !ids.length) {
      return 0;
    }

    const placeholders = ids.map(() => "?").join(",");

    const [result] = await connection.execute(
      `
        UPDATE products

        SET
          deleted_at = NOW(),
          updated_at = NOW()

        WHERE
          id IN (${placeholders})
          AND deleted_at IS NULL
      `,
      ids,
    );

    return result.affectedRows;
  }

  // ============================================================
  // RESTORE
  // ============================================================

  static async restore(connection, id) {
    const [result] = await connection.execute(
      `
        UPDATE products

        SET
          deleted_at = NULL,
          updated_at = NOW()

        WHERE
          id = ?
          AND deleted_at IS NOT NULL
      `,
      [id],
    );

    return result.affectedRows;
  }

  static async bulkRestore(connection, ids) {
    if (!Array.isArray(ids) || !ids.length) {
      return 0;
    }

    const placeholders = ids.map(() => "?").join(",");

    const [result] = await connection.execute(
      `
        UPDATE products

        SET
          deleted_at = NULL,
          updated_at = NOW()

        WHERE
          id IN (${placeholders})
          AND deleted_at IS NOT NULL
      `,
      ids,
    );

    return result.affectedRows;
  }

  static async isRestoreSkuExists(sku, id) {
    const [rows] = await pool.execute(
      `
        SELECT id

        FROM products

        WHERE
          sku = ?
          AND id <> ?
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [sku, id],
    );

    return rows.length > 0;
  }

  // ============================================================
  // FORCE DELETE PRODUCT BASE
  //
  // Variant sẽ được controller xóa trước bằng:
  // ProductVariant.forceDeleteByProduct(...)
  // ============================================================

  static async forceDelete(connection, id) {
    await connection.execute(
      `
        DELETE
        FROM product_images
        WHERE product_id = ?
      `,
      [id],
    );

    await connection.execute(
      `
        DELETE
        FROM product_specifications
        WHERE product_id = ?
      `,
      [id],
    );

    await connection.execute(
      `
        DELETE
        FROM product_stock_logs
        WHERE product_id = ?
      `,
      [id],
    );

    await connection.execute(
      `
        DELETE
        FROM products
        WHERE id = ?
      `,
      [id],
    );
  }

  // ============================================================
  // ORDER USAGE
  // ============================================================

  static async isUsedInOrders(productId) {
    const [rows] = await pool.execute(
      `
        SELECT id

        FROM order_items

        WHERE
          product_id = ?
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [productId],
    );

    return rows.length > 0;
  }

  // ============================================================
  // SEARCH SUGGESTION ADMIN
  // ============================================================

  static async searchSuggestion(keyword) {
    const search = `%${keyword}%`;

    const [rows] = await pool.execute(
      `
        SELECT
          id,
          name,
          sku,
          thumbnail

        FROM products

        WHERE
          deleted_at IS NULL

          AND (
            name LIKE ?
            OR sku LIKE ?
          )

        ORDER BY name ASC

        LIMIT 10
      `,
      [search, search],
    );

    return rows;
  }

  // ============================================================
  // ADMIN FORM DATA
  // ============================================================

  static async getFormData() {
    const [categories] = await pool.execute(
      `
        SELECT
          id,
          name

        FROM categories

        WHERE
          status = 1
          AND deleted_at IS NULL

        ORDER BY name ASC
      `,
    );

    const [socketRows] = await pool.execute(
      `
        SELECT DISTINCT socket

        FROM products

        WHERE
          socket IS NOT NULL
          AND socket <> ''

        ORDER BY socket ASC
      `,
    );

    const [ramRows] = await pool.execute(
      `
        SELECT DISTINCT ram_type

        FROM products

        WHERE
          ram_type IS NOT NULL
          AND ram_type <> ''

        ORDER BY ram_type ASC
      `,
    );

    const [optionRows] = await pool.execute(
      `
        SELECT
          id,
          name,
          code,
          display_type,
          sort_order

        FROM product_options

        WHERE
          deleted_at IS NULL
          AND status = 1

        ORDER BY
          sort_order ASC,
          name ASC
      `,
    );

    const options = [];

    for (const option of optionRows) {
      const [values] = await pool.execute(
        `
          SELECT
            id,
            option_id,
            value,
            label,
            color_code,
            sort_order

          FROM product_option_values

          WHERE
            option_id = ?
            AND deleted_at IS NULL
            AND status = 1

          ORDER BY
            sort_order ASC,
            id ASC
        `,
        [option.id],
      );

      options.push({
        ...option,

        id: Number(option.id),

        sort_order: Number(option.sort_order || 0),

        values: values.map((item) => ({
          ...item,

          id: Number(item.id),

          option_id: Number(item.option_id),

          sort_order: Number(item.sort_order || 0),
        })),
      });
    }

    return {
      categories,

      socket: socketRows.map((item) => item.socket),

      ramType: ramRows.map((item) => item.ram_type),

      options,

      status: [
        {
          value: 1,
          label: "Hiển thị",
        },
        {
          value: 0,
          label: "Ẩn",
        },
      ],
    };
  }

  // ============================================================
  // BUILD PC HELPER
  // ============================================================

  static async findByCategory(category) {
    const query = `
      SELECT
        p.id,
        p.name,
        p.price,

        JSON_UNQUOTE(
          JSON_EXTRACT(
            pp.specifications,
            '$.socket'
          )
        ) AS socket,

        JSON_UNQUOTE(
          JSON_EXTRACT(
            pp.specifications,
            '$.ram_type'
          )
        ) AS ram_type

      FROM pc_parts pp

      JOIN products p
        ON pp.product_id = p.id

      JOIN pc_part_types pt
        ON pp.type_id = pt.id

      WHERE
        LOWER(pt.type_code) = LOWER(?)
        OR LOWER(pt.type_name) = LOWER(?)
    `;

    const [rows] = await pool.query(query, [category, category]);

    return rows;
  }

  // ============================================================
  // CLIENT HELPERS
  //
  // PHẦN CLIENT CHƯA CHUYỂN SANG VARIANT.
  // Giữ products là aggregate/default để client cũ vẫn chạy.
  // ============================================================

  static normalizeClientProduct(row) {
    if (!row) return null;

    const price = Number(row.price || 0);

    const salePrice =
      row.sale_price !== null && row.sale_price !== undefined
        ? Number(row.sale_price)
        : null;

    const finalPrice = Number(row.final_price || price);

    const quantity = Math.max(Number(row.quantity || 0), 0);

    const sold = Math.max(Number(row.sold || 0), 0);

    const averageRating = Number(row.average_rating || 0);

    const reviewCount = Number(row.review_count || 0);

    const isSale = salePrice !== null && salePrice > 0 && salePrice < price;

    return {
      ...row,

      id: Number(row.id),

      category_id: Number(row.category_id),

      price,

      sale_price: salePrice,

      final_price: finalPrice,

      quantity,

      sold,

      is_sale: isSale,

      discount_percent: Number(row.discount_percent || 0),

      in_stock: quantity > 0,

      stock_status:
        quantity <= 0
          ? "out_of_stock"
          : quantity <= 5
            ? "low_stock"
            : "in_stock",

      rating: {
        average: Number(averageRating.toFixed(1)),

        count: reviewCount,
      },

      average_rating: undefined,

      review_count: undefined,
    };
  }

  // ============================================================
  // CLIENT - DANH SÁCH SẢN PHẨM
  // ============================================================

  static async getClientProducts({
    page = 1,
    limit = 12,

    category = "",
    search = "",

    sort = "newest",

    price_min = "",
    price_max = "",

    socket = "",
    ram = "",
    ram_type = "",

    stock = "",
    sale = "",
  } = {}) {
    page = Number.parseInt(page, 10);

    limit = Number.parseInt(limit, 10);

    if (!Number.isInteger(page) || page < 1) {
      page = 1;
    }

    if (!Number.isInteger(limit) || limit < 1) {
      limit = 12;
    }

    limit = Math.min(limit, 48);

    const offset = (page - 1) * limit;

    search = String(search || "")
      .trim()
      .slice(0, 100);

    category = String(category || "").trim();

    socket = String(socket || "").trim();

    const ramFilter = String(ram_type || ram || "").trim();

    stock = String(stock || "")
      .trim()
      .toLowerCase();

    sale = String(sale || "")
      .trim()
      .toLowerCase();

    sort = String(sort || "newest")
      .trim()
      .toLowerCase();

    const finalPriceSql = `
      CASE
        WHEN p.sale_price IS NOT NULL
          AND p.sale_price > 0
          AND p.sale_price < p.price
        THEN p.sale_price

        ELSE p.price
      END
    `;

    const where = [
      "p.deleted_at IS NULL",
      "p.status = 1",

      "c.deleted_at IS NULL",
      "c.status = 1",
    ];

    const params = [];

    if (search) {
      const keyword = `%${search}%`;

      where.push(`
        (
          p.name LIKE ?
          OR p.sku LIKE ?
          OR COALESCE(
            p.short_description,
            ''
          ) LIKE ?
          OR c.name LIKE ?
        )
      `);

      params.push(keyword, keyword, keyword, keyword);
    }

    if (category) {
      where.push("c.slug = ?");

      params.push(category);
    }

    if (socket) {
      where.push("p.socket = ?");

      params.push(socket);
    }

    if (ramFilter) {
      where.push("p.ram_type = ?");

      params.push(ramFilter);
    }

    switch (stock) {
      case "in_stock":
      case "instock":
        where.push("p.quantity > 0");
        break;

      case "low_stock":
      case "low":
        where.push("p.quantity BETWEEN 1 AND 5");
        break;

      case "out_of_stock":
      case "out":
        where.push("p.quantity <= 0");
        break;
    }

    if (sale === "1" || sale === "true" || sale === "yes") {
      where.push(`
        p.sale_price IS NOT NULL
        AND p.sale_price > 0
        AND p.sale_price < p.price
      `);
    }

    const minPrice = price_min !== "" ? Number(price_min) : null;

    const maxPrice = price_max !== "" ? Number(price_max) : null;

    if (minPrice !== null && Number.isFinite(minPrice) && minPrice >= 0) {
      where.push(`${finalPriceSql} >= ?`);

      params.push(minPrice);
    }

    if (maxPrice !== null && Number.isFinite(maxPrice) && maxPrice >= 0) {
      where.push(`${finalPriceSql} <= ?`);

      params.push(maxPrice);
    }

    const whereSql = `
      WHERE ${where.join("\n AND ")}
    `;

    let orderBy = `
      ORDER BY
        p.created_at DESC,
        p.id DESC
    `;

    switch (sort) {
      case "oldest":
        orderBy = `
          ORDER BY
            p.created_at ASC,
            p.id ASC
        `;
        break;

      case "price_asc":
        orderBy = `
          ORDER BY
            ${finalPriceSql} ASC,
            p.id DESC
        `;
        break;

      case "price_desc":
        orderBy = `
          ORDER BY
            ${finalPriceSql} DESC,
            p.id DESC
        `;
        break;

      case "name_asc":
        orderBy = `
          ORDER BY
            p.name ASC,
            p.id DESC
        `;
        break;

      case "name_desc":
        orderBy = `
          ORDER BY
            p.name DESC,
            p.id DESC
        `;
        break;

      case "best_selling":
      case "sold_desc":
        orderBy = `
          ORDER BY
            COALESCE(
              sales.sold,
              0
            ) DESC,

            p.created_at DESC,

            p.id DESC
        `;
        break;

      case "rating_desc":
        orderBy = `
          ORDER BY
            COALESCE(
              review_stats.average_rating,
              0
            ) DESC,

            COALESCE(
              review_stats.review_count,
              0
            ) DESC,

            p.id DESC
        `;
        break;

      case "discount_desc":
        orderBy = `
          ORDER BY
            discount_percent DESC,
            p.id DESC
        `;
        break;
    }

    const [[countRow]] = await pool.execute(
      `
          SELECT
            COUNT(*) AS total

          FROM products p

          INNER JOIN categories c
            ON c.id = p.category_id

          ${whereSql}
        `,
      params,
    );

    const total = Number(countRow.total || 0);

    const [rows] = await pool.execute(
      `
          SELECT
            p.id,
            p.category_id,

            c.name AS category_name,
            c.slug AS category_slug,

            p.name,
            p.slug,
            p.sku,

            p.price,
            p.sale_price,

            ${finalPriceSql}
              AS final_price,

            CASE
              WHEN
                p.sale_price IS NOT NULL
                AND p.sale_price > 0
                AND p.sale_price < p.price

              THEN ROUND(
                (
                  (
                    p.price -
                    p.sale_price
                  )
                  / p.price
                ) * 100
              )

              ELSE 0
            END AS discount_percent,

            p.quantity,

            CASE
              WHEN p.quantity <= 0
                THEN 'out_of_stock'

              WHEN p.quantity <= 5
                THEN 'low_stock'

              ELSE 'in_stock'
            END AS stock_status,

            p.thumbnail,

            p.short_description,

            p.socket,
            p.ram_type,

            COALESCE(
              sales.sold,
              0
            ) AS sold,

            COALESCE(
              review_stats.average_rating,
              0
            ) AS average_rating,

            COALESCE(
              review_stats.review_count,
              0
            ) AS review_count,

            p.created_at,
            p.updated_at

          FROM products p

          INNER JOIN categories c
            ON c.id = p.category_id

          LEFT JOIN (
            SELECT
              oi.product_id,

              SUM(oi.quantity)
                AS sold

            FROM order_items oi

            INNER JOIN orders o
              ON o.id = oi.order_id

            WHERE
              oi.deleted_at IS NULL
              AND o.deleted_at IS NULL
              AND o.status = 'COMPLETED'

            GROUP BY oi.product_id
          ) AS sales
            ON sales.product_id = p.id

          LEFT JOIN (
            SELECT
              product_id,

              ROUND(
                AVG(rating),
                1
              ) AS average_rating,

              COUNT(*)
                AS review_count

            FROM comments

            WHERE
              deleted_at IS NULL
              AND is_approved = 1
              AND rating BETWEEN 1 AND 5

            GROUP BY product_id
          ) AS review_stats
            ON review_stats.product_id = p.id

          ${whereSql}

          ${orderBy}

          LIMIT ?
          OFFSET ?
        `,
      [...params, limit, offset],
    );

    const products = rows.map((row) => Product.normalizeClientProduct(row));

    const [categories] = await pool.execute(
      `
          SELECT
            c.id,
            c.name,
            c.slug,
            c.image,

            COUNT(p.id)
              AS product_count

          FROM categories c

          INNER JOIN products p
            ON p.category_id = c.id
            AND p.deleted_at IS NULL
            AND p.status = 1

          WHERE
            c.deleted_at IS NULL
            AND c.status = 1

          GROUP BY
            c.id,
            c.name,
            c.slug,
            c.image

          ORDER BY c.name ASC
        `,
    );

    const [socketRows] = await pool.execute(
      `
          SELECT DISTINCT socket

          FROM products

          WHERE
            deleted_at IS NULL
            AND status = 1

            AND socket IS NOT NULL
            AND socket <> ''

          ORDER BY socket ASC
        `,
    );

    const [ramRows] = await pool.execute(
      `
          SELECT DISTINCT ram_type

          FROM products

          WHERE
            deleted_at IS NULL
            AND status = 1

            AND ram_type IS NOT NULL
            AND ram_type <> ''

          ORDER BY ram_type ASC
        `,
    );

    const [[priceRange]] = await pool.execute(
      `
          SELECT
            MIN(
              CASE
                WHEN
                  sale_price IS NOT NULL
                  AND sale_price > 0
                  AND sale_price < price

                THEN sale_price

                ELSE price
              END
            ) AS min_price,

            MAX(
              CASE
                WHEN
                  sale_price IS NOT NULL
                  AND sale_price > 0
                  AND sale_price < price

                THEN sale_price

                ELSE price
              END
            ) AS max_price

          FROM products

          WHERE
            deleted_at IS NULL
            AND status = 1
        `,
    );

    return {
      products,

      pagination: {
        page,
        limit,
        total,

        totalPages: total > 0 ? Math.ceil(total / limit) : 0,

        hasPreviousPage: page > 1,

        hasNextPage: page * limit < total,
      },

      filters: {
        categories: categories.map((item) => ({
          ...item,

          id: Number(item.id),

          product_count: Number(item.product_count || 0),
        })),

        socket: socketRows.map((item) => item.socket),

        ramType: ramRows.map((item) => item.ram_type),

        price: {
          min: Number(priceRange.min_price || 0),

          max: Number(priceRange.max_price || 0),
        },
      },

      appliedFilters: {
        category,
        search,
        sort,

        price_min:
          minPrice !== null && Number.isFinite(minPrice) ? minPrice : null,

        price_max:
          maxPrice !== null && Number.isFinite(maxPrice) ? maxPrice : null,

        socket,

        ram_type: ramFilter,

        stock,

        sale: sale === "1" || sale === "true" || sale === "yes",
      },
    };
  }

  // ============================================================
  // CLIENT - TOP SELLING PRODUCTS
  //
  // Dùng cho:
  // GET /api/client/products/top-sellers
  //
  // QUAN TRỌNG:
  // - Không dùng getTopSelling() của Admin.
  // - Chỉ lấy Product đang hiển thị.
  // - Chỉ lấy Category đang hiển thị.
  // - Doanh số chỉ tính đơn COMPLETED.
  // - Rating chỉ tính comment đã duyệt.
  // - Giá/stock/SKU/thumbnail ưu tiên Client Default Variant.
  // - Không tin dữ liệu variant đã ẩn hoặc đã soft-delete.
  // ============================================================

  static async getClientTopSellingProducts(limit = 8) {
    // ==========================================================
    // LIMIT
    // ==========================================================

    limit = Number.parseInt(limit, 10);

    if (!Number.isInteger(limit) || limit < 1) {
      limit = 8;
    }

    // Home không cần trả quá nhiều sản phẩm.
    limit = Math.min(limit, 24);

    // ==========================================================
    // PRODUCT BASE QUERY
    // ==========================================================

    const [rows] = await pool.execute(
      `
      SELECT
        p.id,
        p.category_id,

        c.name AS category_name,
        c.slug AS category_slug,

        p.name,
        p.slug,
        p.sku,

        p.price,
        p.sale_price,

        CASE
          WHEN
            p.sale_price IS NOT NULL
            AND p.sale_price > 0
            AND p.sale_price < p.price

          THEN p.sale_price

          ELSE p.price
        END AS final_price,

        CASE
          WHEN
            p.sale_price IS NOT NULL
            AND p.sale_price > 0
            AND p.sale_price < p.price
            AND p.price > 0

          THEN ROUND(
            (
              (
                p.price -
                p.sale_price
              )
              / p.price
            ) * 100
          )

          ELSE 0
        END AS discount_percent,

        p.quantity,

        p.thumbnail,
        p.short_description,

        p.socket,
        p.ram_type,

        COALESCE(
          sales.sold,
          0
        ) AS sold,

        COALESCE(
          sales.order_count,
          0
        ) AS order_count,

        COALESCE(
          review_stats.average_rating,
          0
        ) AS average_rating,

        COALESCE(
          review_stats.review_count,
          0
        ) AS review_count,

        p.created_at,
        p.updated_at

      FROM products p

      INNER JOIN categories c
        ON c.id = p.category_id

      LEFT JOIN (
        SELECT
          oi.product_id,

          SUM(oi.quantity) AS sold,

          COUNT(
            DISTINCT oi.order_id
          ) AS order_count

        FROM order_items oi

        INNER JOIN orders o
          ON o.id = oi.order_id

        WHERE
          oi.deleted_at IS NULL
          AND o.deleted_at IS NULL
          AND o.status = 'COMPLETED'

        GROUP BY oi.product_id
      ) AS sales
        ON sales.product_id = p.id

      LEFT JOIN (
        SELECT
          cm.product_id,

          ROUND(
            AVG(cm.rating),
            1
          ) AS average_rating,

          COUNT(*)
            AS review_count

        FROM comments cm

        WHERE
          cm.deleted_at IS NULL
          AND cm.is_approved = 1
          AND cm.rating BETWEEN 1 AND 5

        GROUP BY cm.product_id
      ) AS review_stats
        ON review_stats.product_id = p.id

      WHERE
        p.deleted_at IS NULL
        AND p.status = 1

        AND p.slug IS NOT NULL
        AND p.slug <> ''

        AND c.deleted_at IS NULL
        AND c.status = 1

      ORDER BY
        COALESCE(
          sales.sold,
          0
        ) DESC,

        COALESCE(
          sales.order_count,
          0
        ) DESC,

        COALESCE(
          review_stats.average_rating,
          0
        ) DESC,

        p.created_at DESC,

        p.id DESC

      LIMIT ?
    `,
      [limit],
    );

    // ==========================================================
    // NORMALIZE + VARIANT DATA
    // ==========================================================

    const products = await Promise.all(
      rows.map(async (row) => {
        const product = Product.normalizeClientProduct(row);

        product.order_count = Math.max(Number(row.order_count || 0), 0);

        // ======================================================
        // CLIENT VARIANT DATA
        // ======================================================

        const variantData = await ProductVariant.getClientProductVariantData(
          product.id,
        );

        const defaultVariant = variantData.default_variant;

        product.has_variants = Boolean(variantData.has_variants);

        product.default_variant_id = defaultVariant
          ? Number(defaultVariant.id)
          : null;

        product.available_variant_count = Number(
          variantData.available_variant_count || 0,
        );

        product.total_available_quantity = Number(
          variantData.available_quantity || 0,
        );

        /*
         * Mỗi Product hiện tại của project đều thường có ít nhất
         * một default variant.
         *
         * Nhưng vẫn giữ fallback Product để hỗ trợ dữ liệu legacy.
         */
        if (defaultVariant) {
          product.sku = defaultVariant.sku || product.sku;

          product.price = Number(defaultVariant.price || 0);

          product.sale_price =
            defaultVariant.sale_price !== null &&
            defaultVariant.sale_price !== undefined
              ? Number(defaultVariant.sale_price)
              : null;

          product.final_price = Number(
            defaultVariant.final_price || defaultVariant.price || 0,
          );

          product.discount_percent = Number(
            defaultVariant.discount_percent || 0,
          );

          product.is_sale = Boolean(defaultVariant.is_sale);

          /*
           * Thumbnail variant mặc định thắng thumbnail Product.
           */
          if (defaultVariant.thumbnail) {
            product.thumbnail = defaultVariant.thumbnail;
          }

          /*
           * quantity trên card:
           * giữ quantity của variant mặc định để FE biết chính xác
           * variant đang đại diện cho giá hiển thị còn bao nhiêu.
           */
          product.quantity = Math.max(Number(defaultVariant.quantity || 0), 0);

          product.default_variant = {
            id: Number(defaultVariant.id),

            sku: defaultVariant.sku,

            variant_name: defaultVariant.variant_name,

            price: Number(defaultVariant.price || 0),

            sale_price:
              defaultVariant.sale_price !== null &&
              defaultVariant.sale_price !== undefined
                ? Number(defaultVariant.sale_price)
                : null,

            final_price: Number(
              defaultVariant.final_price || defaultVariant.price || 0,
            ),

            discount_percent: Number(defaultVariant.discount_percent || 0),

            quantity: Math.max(Number(defaultVariant.quantity || 0), 0),

            thumbnail: defaultVariant.thumbnail || null,

            in_stock: Boolean(defaultVariant.in_stock),

            stock_status: defaultVariant.stock_status,

            is_default: Number(defaultVariant.is_default) === 1,
          };
        } else {
          product.default_variant = null;
        }

        // ======================================================
        // CLIENT STOCK
        //
        // Product được xem là còn hàng nếu ít nhất một visible
        // variant còn hàng.
        //
        // Nếu là dữ liệu legacy không có variant visible thì
        // fallback về quantity Product.
        // ======================================================

        const availableQuantity =
          variantData.available_variant_count > 0
            ? Number(variantData.available_quantity || 0)
            : Number(product.quantity || 0);

        product.in_stock = availableQuantity > 0;

        product.stock_status =
          availableQuantity <= 0
            ? "out_of_stock"
            : availableQuantity <= 5
              ? "low_stock"
              : "in_stock";

        return product;
      }),
    );

    return products;
  }

  // ============================================================
  // CLIENT - SEARCH SUGGESTIONS
  // ============================================================

  static async getClientSearchSuggestions(keyword, limit = 8) {
    keyword = String(keyword || "")
      .trim()
      .slice(0, 100);

    if (!keyword) {
      return [];
    }

    limit = Number.parseInt(limit, 10);

    if (!Number.isInteger(limit) || limit < 1) {
      limit = 8;
    }

    limit = Math.min(limit, 10);

    const search = `%${keyword}%`;

    const [rows] = await pool.execute(
      `
          SELECT
            p.id,
            p.name,
            p.slug,
            p.sku,
            p.thumbnail,

            p.price,
            p.sale_price,

            CASE
              WHEN
                p.sale_price IS NOT NULL
                AND p.sale_price > 0
                AND p.sale_price < p.price

              THEN p.sale_price

              ELSE p.price
            END AS final_price,

            c.name AS category_name,
            c.slug AS category_slug

          FROM products p

          INNER JOIN categories c
            ON c.id = p.category_id

          WHERE
            p.deleted_at IS NULL
            AND p.status = 1

            AND c.deleted_at IS NULL
            AND c.status = 1

            AND (
              p.name LIKE ?
              OR p.sku LIKE ?
            )

          ORDER BY
            CASE
              WHEN p.name LIKE ?
                THEN 0
              ELSE 1
            END,

            p.name ASC

          LIMIT ?
        `,
      [search, search, `${keyword}%`, limit],
    );

    return rows.map((row) => ({
      ...row,

      id: Number(row.id),

      price: Number(row.price || 0),

      sale_price: row.sale_price !== null ? Number(row.sale_price) : null,

      final_price: Number(row.final_price || 0),
    }));
  }

  // ============================================================
  // CLIENT - PRODUCT DETAIL
  // ============================================================

  static async getClientProductBySlug(slug) {
    slug = String(slug || "").trim();

    if (!slug) {
      return null;
    }

    const [products] = await pool.execute(
      `
          SELECT
            p.id,
            p.category_id,

            p.name,
            p.slug,
            p.sku,

            p.price,
            p.sale_price,

            CASE
              WHEN
                p.sale_price IS NOT NULL
                AND p.sale_price > 0
                AND p.sale_price < p.price

              THEN p.sale_price

              ELSE p.price
            END AS final_price,

            CASE
              WHEN
                p.sale_price IS NOT NULL
                AND p.sale_price > 0
                AND p.sale_price < p.price

              THEN ROUND(
                (
                  (
                    p.price -
                    p.sale_price
                  )
                  / p.price
                ) * 100
              )

              ELSE 0
            END AS discount_percent,

            p.quantity,

            p.thumbnail,
            p.short_description,
            p.description,

            p.socket,
            p.ram_type,

            p.created_at,
            p.updated_at,

            c.name AS category_name,
            c.slug AS category_slug,

            COALESCE(
              sales.sold,
              0
            ) AS sold,

            COALESCE(
              review_stats.average_rating,
              0
            ) AS average_rating,

            COALESCE(
              review_stats.review_count,
              0
            ) AS review_count

          FROM products p

          INNER JOIN categories c
            ON c.id = p.category_id

          LEFT JOIN (
            SELECT
              oi.product_id,

              SUM(oi.quantity)
                AS sold

            FROM order_items oi

            INNER JOIN orders o
              ON o.id = oi.order_id

            WHERE
              oi.deleted_at IS NULL
              AND o.deleted_at IS NULL
              AND o.status = 'COMPLETED'

            GROUP BY oi.product_id
          ) AS sales
            ON sales.product_id = p.id

          LEFT JOIN (
            SELECT
              product_id,

              ROUND(
                AVG(rating),
                1
              ) AS average_rating,

              COUNT(*)
                AS review_count

            FROM comments

            WHERE
              deleted_at IS NULL
              AND is_approved = 1
              AND rating BETWEEN 1 AND 5

            GROUP BY product_id
          ) AS review_stats
            ON review_stats.product_id = p.id

          WHERE
            p.slug = ?

            AND p.deleted_at IS NULL
            AND p.status = 1

            AND c.deleted_at IS NULL
            AND c.status = 1

          LIMIT 1
        `,
      [slug],
    );

    if (products.length === 0) {
      return null;
    }

    const product = Product.normalizeClientProduct(products[0]);

    // ==========================================================
    // CLIENT VARIANTS
    // ==========================================================

    const variantData = await ProductVariant.getClientProductVariantData(
      product.id,
    );

    const defaultVariant = variantData.default_variant;

    /*
     * Product table đang lưu aggregate/default để tương thích
     * dữ liệu cũ.
     *
     * Nhưng Client Product Detail phải ưu tiên variant mặc định
     * thực tế.
     */
    if (defaultVariant) {
      product.default_variant_id = Number(defaultVariant.id);

      product.sku = defaultVariant.sku;

      product.price = Number(defaultVariant.price || 0);

      product.sale_price =
        defaultVariant.sale_price !== null
          ? Number(defaultVariant.sale_price)
          : null;

      product.final_price = Number(
        defaultVariant.final_price || defaultVariant.price || 0,
      );

      product.discount_percent = Number(defaultVariant.discount_percent || 0);

      product.is_sale = Boolean(defaultVariant.is_sale);

      product.in_stock = Number(defaultVariant.quantity || 0) > 0;

      product.stock_status = defaultVariant.stock_status;

      /*
       * Đây là tồn kho của variant đang được chọn mặc định.
       *
       * total_available_quantity bên dưới mới là tổng tồn
       * của các variant được phép bán.
       */
      product.quantity = Number(defaultVariant.quantity || 0);

      /*
       * Nếu variant có thumbnail riêng thì dùng.
       * Nếu không có giữ thumbnail Product.
       */
      if (defaultVariant.thumbnail) {
        product.thumbnail = defaultVariant.thumbnail;
      }
    } else {
      product.default_variant_id = null;
    }

    product.has_variants = variantData.has_variants;

    product.total_available_quantity = variantData.available_quantity;

    product.available_variant_count = variantData.available_variant_count;

    const [gallery] = await pool.execute(
      `
          SELECT
            id,
            image_url,
            sort_order

          FROM product_images

          WHERE
            product_id = ?
            AND deleted_at IS NULL

          ORDER BY
            sort_order ASC,
            id ASC
        `,
      [product.id],
    );

    const normalizedGallery = [];

    if (product.thumbnail) {
      normalizedGallery.push({
        id: null,

        image_url: product.thumbnail,

        sort_order: 0,

        is_thumbnail: true,
      });
    }

    for (const image of gallery) {
      if (image.image_url === product.thumbnail) {
        continue;
      }

      normalizedGallery.push({
        ...image,

        id: Number(image.id),

        sort_order: Number(image.sort_order || 0),

        is_thumbnail: false,
      });
    }

    const [specifications] = await pool.execute(
      `
          SELECT
            id,
            spec_key,
            spec_value

          FROM product_specifications

          WHERE
            product_id = ?
            AND deleted_at IS NULL

          ORDER BY id ASC
        `,
      [product.id],
    );

    const [ratingRows] = await pool.execute(
      `
          SELECT
            rating,

            COUNT(*)
              AS total

          FROM comments

          WHERE
            product_id = ?
            AND deleted_at IS NULL
            AND is_approved = 1
            AND rating BETWEEN 1 AND 5

          GROUP BY rating
        `,
      [product.id],
    );

    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    for (const row of ratingRows) {
      const star = Number(row.rating);

      if (star >= 1 && star <= 5) {
        distribution[star] = Number(row.total || 0);
      }
    }

    const [reviews] = await pool.execute(
      `
          SELECT
            cm.id,
            cm.user_id,
            cm.content,
            cm.rating,
            cm.created_at,

            u.full_name
              AS user_name,

            u.avatar
              AS user_avatar

          FROM comments cm

          INNER JOIN users u
            ON u.id = cm.user_id

          WHERE
            cm.product_id = ?

            AND cm.deleted_at IS NULL
            AND cm.is_approved = 1

            AND u.deleted_at IS NULL
            AND u.status = 1

          ORDER BY
            cm.created_at DESC,
            cm.id DESC

          LIMIT 5
        `,
      [product.id],
    );

    const currentPrice = Number(product.final_price || 0);

    const [relatedRows] = await pool.execute(
      `
          SELECT
            p.id,
            p.category_id,

            p.name,
            p.slug,
            p.sku,
            p.thumbnail,

            p.price,
            p.sale_price,

            CASE
              WHEN
                p.sale_price IS NOT NULL
                AND p.sale_price > 0
                AND p.sale_price < p.price

              THEN p.sale_price

              ELSE p.price
            END AS final_price,

            CASE
              WHEN
                p.sale_price IS NOT NULL
                AND p.sale_price > 0
                AND p.sale_price < p.price

              THEN ROUND(
                (
                  (
                    p.price -
                    p.sale_price
                  )
                  / p.price
                ) * 100
              )

              ELSE 0
            END AS discount_percent,

            p.quantity,

            c.name AS category_name,
            c.slug AS category_slug,

            COALESCE(
              sales.sold,
              0
            ) AS sold,

            COALESCE(
              review_stats.average_rating,
              0
            ) AS average_rating,

            COALESCE(
              review_stats.review_count,
              0
            ) AS review_count

          FROM products p

          INNER JOIN categories c
            ON c.id = p.category_id

          LEFT JOIN (
            SELECT
              oi.product_id,

              SUM(oi.quantity)
                AS sold

            FROM order_items oi

            INNER JOIN orders o
              ON o.id = oi.order_id

            WHERE
              oi.deleted_at IS NULL
              AND o.deleted_at IS NULL
              AND o.status = 'COMPLETED'

            GROUP BY oi.product_id
          ) AS sales
            ON sales.product_id = p.id

          LEFT JOIN (
            SELECT
              product_id,

              ROUND(
                AVG(rating),
                1
              ) AS average_rating,

              COUNT(*)
                AS review_count

            FROM comments

            WHERE
              deleted_at IS NULL
              AND is_approved = 1
              AND rating BETWEEN 1 AND 5

            GROUP BY product_id
          ) AS review_stats
            ON review_stats.product_id = p.id

          WHERE
            p.category_id = ?

            AND p.id <> ?

            AND p.status = 1
            AND p.deleted_at IS NULL

            AND p.slug IS NOT NULL
            AND p.slug <> ''

            AND c.status = 1
            AND c.deleted_at IS NULL

          ORDER BY
            CASE
              WHEN p.quantity > 0
                THEN 0

              ELSE 1
            END ASC,

            ABS(
              (
                CASE
                  WHEN
                    p.sale_price IS NOT NULL
                    AND p.sale_price > 0
                    AND p.sale_price < p.price

                  THEN p.sale_price

                  ELSE p.price
                END
              ) - ?
            ) ASC,

            COALESCE(
              sales.sold,
              0
            ) DESC,

            p.created_at DESC

          LIMIT 8
        `,
      [product.category_id, product.id, currentPrice],
    );

    const relatedProducts = relatedRows.map((row) =>
      Product.normalizeClientProduct(row),
    );

    return {
      product,

      gallery: normalizedGallery,

      specifications: specifications.map((item) => ({
        ...item,

        id: Number(item.id),
      })),

      // ========================================================
      // VARIANT DATA
      // ========================================================

      options: variantData.options,

      variants: variantData.variants,

      defaultVariant: variantData.default_variant,

      hasVariants: variantData.has_variants,

      variantSummary: {
        total: Number(variantData.available_variant_count || 0),

        quantity: Number(variantData.available_quantity || 0),
      },

      rating: {
        average: product.rating.average,

        total: product.rating.count,

        distribution,
      },

      reviews: reviews.map((review) => ({
        ...review,

        id: Number(review.id),

        user_id: Number(review.user_id),

        rating: Number(review.rating || 0),
      })),

      relatedProducts,
    };
  }
}

module.exports = Product;
