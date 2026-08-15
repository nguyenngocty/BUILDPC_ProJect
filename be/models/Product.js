const { pool } = require("../config/database");
class Product {
  // GET
  static async getById(id) {
    // Thông tin sản phẩm
    const [products] = await pool.execute(
      `
        SELECT
            p.id,
            p.category_id,
            c.name AS category_name,
            p.name,
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

    // Gallery
    const [images] = await pool.execute(
      `
        SELECT
            id,
            image_url,
            sort_order
        FROM product_images
        WHERE product_id = ?
        ORDER BY sort_order ASC
        `,
      [id],
    );

    // Specifications
    const [specifications] = await pool.execute(
      `
        SELECT
            id,
            spec_key,
            spec_value
        FROM product_specifications
        WHERE product_id = ?
        ORDER BY id ASC
        `,
      [id],
    );

    return {
      ...products[0],
      gallery: images,
      specifications,
    };
  }
  static async getAll({
    page = 1,
    limit = 10,
    search = "",
    category = "",
    status = "",
    stock = "",
    sort = "newest",
  } = {}) {
    // Đảm bảo kiểu number
    page = Number(page) || 1;
    limit = Number(limit) || 10;

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    // Tính offset
    const offset = (page - 1) * limit;

    let where = "WHERE p.deleted_at IS NULL";
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

    if (category) {
      where += `
        AND p.category_id = ?
    `;

      params.push(category);
    }

    if (status !== "") {
      where += `
        AND p.status = ?
    `;

      params.push(status);
    }
    if (stock === "out") {
      where += `
      AND (
        p.quantity -
        IFNULL(
          (
            SELECT SUM(oi.quantity)
            FROM order_items oi
            WHERE oi.product_id = p.id
          ),
          0
        )
      ) <= 0
  `;
    }

    if (stock === "low") {
      where += `
      AND (
        p.quantity -
        IFNULL(
          (
            SELECT SUM(oi.quantity)
            FROM order_items oi
            WHERE oi.product_id = p.id
          ),
          0
        )
      ) BETWEEN 1 AND 5
  `;
    }

    if (stock === "instock") {
      where += `
      AND (
        p.quantity -
        IFNULL(
          (
            SELECT SUM(oi.quantity)
            FROM order_items oi
            WHERE oi.product_id = p.id
          ),
          0
        )
      ) > 5
  `;
    }

    let orderBy = "ORDER BY p.created_at DESC";

    switch (sort) {
      case "oldest":
        orderBy = "ORDER BY p.created_at ASC";
        break;

      case "price_asc":
        orderBy = "ORDER BY p.price ASC";
        break;

      case "price_desc":
        orderBy = "ORDER BY p.price DESC";
        break;

      case "name_asc":
        orderBy = "ORDER BY p.name ASC";
        break;

      case "name_desc":
        orderBy = "ORDER BY p.name DESC";
        break;

      case "stock_desc":
        orderBy = `
        ORDER BY
        (
            p.quantity -
            IFNULL(
                (
                    SELECT SUM(oi.quantity)
                    FROM order_items oi
                    WHERE oi.product_id = p.id
                ),
                0
            )
        ) DESC
    `;
        break;

      default:
        orderBy = "ORDER BY p.created_at DESC";
    }

    // ==========================
    // Đếm tổng số sản phẩm
    // ==========================
    let countSql = `
      SELECT COUNT(*) AS total
      FROM products p
      ${where}
      `;

    const [[count]] = await pool.execute(countSql, params);

    // ==========================
    // Lấy danh sách sản phẩm
    // ==========================
    const sql = `
    SELECT
        p.id,
        p.category_id,
        c.name AS category_name,

        p.name,
        p.sku,

        p.price,
        p.sale_price,

        p.quantity,

        IFNULL((
            SELECT SUM(oi.quantity)
            FROM order_items oi
            WHERE oi.product_id = p.id
        ),0) AS sold,

        (
            p.quantity -
            IFNULL((
                SELECT SUM(oi.quantity)
                FROM order_items oi
                WHERE oi.product_id = p.id
            ),0)
        ) AS remaining,

        CASE
            WHEN (
                p.quantity -
                IFNULL((
                    SELECT SUM(oi.quantity)
                    FROM order_items oi
                    WHERE oi.product_id = p.id
                ),0)
            ) <= 0
            THEN 'out_of_stock'

            ELSE 'in_stock'
        END AS stock_status,

        p.thumbnail,
        p.short_description,
        p.description,
        p.status,
        p.created_at,
        p.updated_at
    FROM products p
    LEFT JOIN categories c
      ON c.id = p.category_id
    ${where}
    ${orderBy}
    LIMIT ?
    OFFSET ?
  `;

    const [rows] = await pool.execute(sql, [...params, limit, offset]);

    // ==========================
    // Trả dữ liệu
    // ==========================
    return {
      products: rows,
      pagination: {
        page,
        limit,
        total: count.total,
        totalPages: Math.ceil(count.total / limit),
      },
    };
  }

  static async getStockWarning(lowStock = 5) {
    const sql = `
        SELECT

            p.id,
            p.name,
            p.sku,
            p.quantity,

            IFNULL((
                SELECT SUM(oi.quantity)
                FROM order_items oi
                WHERE oi.product_id = p.id
            ),0) AS sold,

            (
                p.quantity -
                IFNULL((
                    SELECT SUM(oi.quantity)
                    FROM order_items oi
                    WHERE oi.product_id = p.id
                ),0)
            ) AS remaining

        FROM products p

        WHERE
            p.deleted_at IS NULL
            AND p.status = 1

        ORDER BY remaining ASC
    `;

    const [rows] = await pool.execute(sql);

    const outOfStock = [];
    const lowStockProducts = [];

    for (const product of rows) {
      if (product.remaining <= 0) {
        outOfStock.push(product);
      } else if (product.remaining <= lowStock) {
        lowStockProducts.push(product);
      }
    }

    return {
      outOfStock,

      lowStock: lowStockProducts,
    };
  }

  static async getStatistics() {
    const sql = `
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
    `;

    const [[stat]] = await pool.execute(sql);

    const [stockRows] = await pool.execute(`
        SELECT

            quantity,

            IFNULL(
                (
                    SELECT SUM(oi.quantity)
                    FROM order_items oi
                    WHERE oi.product_id = p.id
                ),
                0
            ) AS sold

        FROM products p

        WHERE deleted_at IS NULL
    `);

    let outOfStock = 0;

    let lowStock = 0;

    for (const item of stockRows) {
      const remaining = Number(item.quantity) - Number(item.sold);

      if (remaining <= 0) {
        outOfStock++;
      } else if (remaining <= 5) {
        lowStock++;
      }
    }

    return {
      total_products: Number(stat.total_products),

      total_active: Number(stat.total_active),

      published: Number(stat.published),

      hidden: Number(stat.hidden),

      trash: Number(stat.trash),

      out_of_stock: outOfStock,

      low_stock: lowStock,
    };
  }

  static async getTopSelling(limit = 10) {
    try {
      const sql = `
        SELECT 
          p.id,
          p.name,
          p.slug,
          p.thumbnail,
          p.price,
          p.sale_price,
          p.quantity,
          IFNULL(SUM(oi.quantity), 0) AS sold
        FROM products p
        LEFT JOIN order_items oi ON oi.product_id = p.id
        WHERE p.deleted_at IS NULL
        GROUP BY p.id
        ORDER BY sold DESC
        LIMIT ?
      `;
      // Lưu ý: Nếu bạn dùng pool.query hoặc pool.execute tùy vào cấu hình kết nối mysql2
      const [rows] = await pool.query(sql, [Number(limit)]);
      return rows;
    } catch (error) {
      console.error("Lỗi truy vấn getTopSelling:", error);
      throw error;
    }
  }

  static async getNewestProducts(limit = 10) {
    const sql = `
        SELECT

            p.id,

            p.name,

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

        ORDER BY p.created_at DESC

        LIMIT ?
    `;

    const [rows] = await pool.execute(sql, [Number(limit)]);

    return rows;
  }

  static async getTrash({ page = 1, limit = 10, search = "" } = {}) {
    page = Number(page);
    limit = Number(limit);

    const offset = (page - 1) * limit;

    let where = `
        WHERE p.deleted_at IS NOT NULL
    `;

    const params = [];

    if (search) {
      where += `
            AND
            (
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

    const sql = `
        SELECT

            p.id,

            p.category_id,

            c.name AS category_name,

            p.name,

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
    `;

    const [rows] = await pool.execute(sql, [...params, limit, offset]);

    return {
      products: rows,

      pagination: {
        page,

        limit,

        total: count.total,

        totalPages: Math.ceil(count.total / limit),
      },
    };
  }

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

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  }

  //

  static async getFilesForDelete(id) {
    const [rows] = await pool.execute(
      `
    SELECT thumbnail
    FROM products
    WHERE id = ?
    `,
      [id],
    );

    if (rows.length === 0) {
      return null;
    }

    const thumbnail = rows[0].thumbnail;

    const [gallery] = await pool.execute(
      `
    SELECT image_url
    FROM product_images
    WHERE product_id = ?
    `,
      [id],
    );

    return {
      thumbnail,
      gallery,
    };
  }

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

  // Create

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
      data.name,
      slug,
      data.sku,
      data.price,
      data.sale_price || null,
      data.quantity,
      data.thumbnail || null,
      data.short_description || null,
      data.description || null,
      data.status ?? 1,
      data.socket || null,
      data.ram_type || null,
    ];

    const [result] = await connection.execute(sql, values);

    return result.insertId;
  }

  static async duplicateProduct(connection, product) {
    const newName = `${product.name} (Copy)`;

    const newSlug = await Product.generateUniqueSlug(newName);

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

    const [result] = await connection.execute(sql, [
      product.category_id,
      newName,
      newSlug,

      `${product.sku}-COPY-${Date.now()}`,

      product.price,
      product.sale_price ?? null,
      product.quantity,
      product.thumbnail ?? null,
      product.short_description || null,
      product.description ?? null,

      0,

      product.socket ?? null,
      product.ram_type ?? null,
    ]);

    return result.insertId;
  }

  static async insertGallery(connection, productId, images) {
    const sql = `
        INSERT INTO product_images
        (
            product_id,
            image_url,
            sort_order
        )
        VALUES
        (
            ?, ?, ?
        )
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
    WHERE product_id = ?
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
      VALUES
      (
        ?,?,?
      )
      `,
        [newId, image.image_url, image.sort_order],
      );
    }
  }
  static async insertSpecifications(connection, productId, specifications) {
    if (!specifications || specifications.length === 0) {
      return;
    }

    const sql = `
        INSERT INTO product_specifications
        (
            product_id,
            spec_key,
            spec_value
        )
        VALUES
        (
            ?, ?, ?
        )
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
    WHERE product_id = ?
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
      VALUES
      (
        ?,?,?
      )
      `,
        [newId, spec.spec_key, spec.spec_value],
      );
    }
  }

  // Check

  static async isSkuExists(sku) {
    const sql = `
    SELECT id
    FROM products
    WHERE sku = ?
      AND deleted_at IS NULL
    LIMIT 1
  `;

    const [rows] = await pool.execute(sql, [sku]);

    return rows.length > 0;
  }

  static async isSkuExistsExceptId(sku, id) {
    const sql = `
    SELECT id
    FROM products
    WHERE
      sku = ?
      AND id <> ?
      AND deleted_at IS NULL
    LIMIT 1
  `;

    const [rows] = await pool.execute(sql, [sku, id]);

    return rows.length > 0;
  }

  static async getGallery(productId) {
    const sql = `
    SELECT
      id,
      image_url
    FROM product_images
    WHERE product_id = ?
    ORDER BY sort_order ASC
  `;

    const [rows] = await pool.execute(sql, [productId]);

    return rows;
  }

  static async deleteGallery(connection, productId) {
    const sql = `
      DELETE
      FROM product_images
      WHERE product_id = ?
  `;

    await connection.execute(sql, [productId]);
  }
  // Update
  static async update(connection, id, data) {
    const slug = await Product.generateUniqueSlug(data.name, id);

    const sql = `
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
  `;

    const values = [
      data.category_id,
      data.name,
      slug,
      data.sku,
      data.price,
      data.sale_price || null,
      data.quantity,
      data.thumbnail || null,
      data.short_description || null,
      data.description || null,
      data.status,
      data.socket || null,
      data.ram_type || null,
      id,
    ];

    const [result] = await connection.execute(sql, values);

    return result.affectedRows;
  }

  static async toggleStatus(connection, id) {
    const sql = `
    UPDATE products
    SET
      status = CASE
        WHEN status = 1 THEN 0
        ELSE 1
      END,
      updated_at = NOW()
    WHERE
      id = ?
      AND deleted_at IS NULL
  `;

    const [result] = await connection.execute(sql, [id]);

    return result.affectedRows;
  }

  static async updateQuantity(connection, id, quantity) {
    await connection.execute(
      `
        UPDATE products
        SET
            quantity=?,
            updated_at=NOW()
        WHERE id=?
        `,
      [quantity, id],
    );
  }

  // Delete

  static async softDelete(connection, id) {
    const sql = `
    UPDATE products
    SET
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE
      id = ?
      AND deleted_at IS NULL
  `;

    const [result] = await connection.execute(sql, [id]);

    return result.affectedRows;
  }

  static async bulkDelete(connection, ids) {
    if (!ids.length) {
      return;
    }

    const placeholders = ids.map(() => "?").join(",");

    const sql = `
        UPDATE products
        SET
          deleted_at = NOW(),
          updated_at = NOW()
        WHERE id IN (${placeholders})
        AND deleted_at IS NULL
    `;

    await connection.execute(sql, ids);
  }

  static async restore(connection, id) {
    const sql = `
    UPDATE products
    SET
      deleted_at = NULL,
      updated_at = NOW()
    WHERE id = ?
      AND deleted_at IS NOT NULL
  `;

    const [result] = await connection.execute(sql, [id]);

    return result.affectedRows;
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

  static async bulkRestore(connection, ids) {
    if (!ids.length) {
      return 0;
    }

    const placeholders = ids.map(() => "?").join(",");

    const sql = `
    UPDATE products
    SET
      deleted_at = NULL,
      updated_at = NOW()
    WHERE
      id IN (${placeholders})
      AND deleted_at IS NOT NULL
  `;

    const [result] = await connection.execute(sql, ids);

    return result.affectedRows;
  }

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
        WHERE product_id=?
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

  static async isRestoreSkuExists(sku, id) {
    const [rows] = await pool.execute(
      `
        SELECT id
        FROM products
        WHERE sku = ?
        AND id <> ?
        AND deleted_at IS NULL
        LIMIT 1
        `,
      [sku, id],
    );

    return rows.length > 0;
  }

  static async decreaseStock(connection, productId, quantity) {
    const sql = `
    UPDATE products
    SET quantity = quantity - ?
    WHERE id = ?
      AND deleted_at IS NULL
      AND quantity >= ?
  `;

    const [result] = await connection.execute(sql, [
      quantity,
      productId,
      quantity,
    ]);

    return result.affectedRows;
  }

  static async getStockReport() {
    const sql = `
        SELECT

            p.id,

            p.name,

            p.sku,

            c.name AS category_name,

            p.quantity,

            IFNULL(

                (
                    SELECT SUM(oi.quantity)
                    FROM order_items oi
                    WHERE oi.product_id = p.id
                ),

                0

            ) AS sold,

            (
                p.quantity -

                IFNULL(

                    (
                        SELECT SUM(oi.quantity)
                        FROM order_items oi
                        WHERE oi.product_id = p.id
                    ),

                    0

                )

            ) AS remaining,

            CASE

                WHEN (

                    p.quantity -

                    IFNULL(

                        (
                            SELECT SUM(oi.quantity)
                            FROM order_items oi
                            WHERE oi.product_id = p.id
                        ),

                        0

                    )

                ) <= 0

                THEN 'out_of_stock'

                WHEN (

                    p.quantity -

                    IFNULL(

                        (
                            SELECT SUM(oi.quantity)
                            FROM order_items oi
                            WHERE oi.product_id = p.id
                        ),

                        0

                    )

                ) <= 5

                THEN 'low_stock'

                ELSE 'in_stock'

            END AS stock_status,

            p.updated_at

        FROM products p

        LEFT JOIN categories c

            ON c.id = p.category_id

        WHERE p.deleted_at IS NULL

        ORDER BY p.name ASC
    `;

    const [rows] = await pool.execute(sql);

    return rows;
  }

  static async increaseStock(connection, productId, quantity) {
    const sql = `
    UPDATE products
    SET quantity = quantity + ?
    WHERE id = ?
      AND deleted_at IS NULL
  `;

    const [result] = await connection.execute(sql, [quantity, productId]);

    return result.affectedRows;
  }

  static async insertStockLog(
    connection,
    { productId, type, quantity, quantityBefore, quantityAfter, note },
  ) {
    const sql = `
        INSERT INTO product_stock_logs
        (
            product_id,
            type,
            quantity,
            quantity_before,
            quantity_after,
            note
        )
        VALUES
        (
            ?,?,?,?,?,?
        )
    `;

    await connection.execute(sql, [
      productId,
      type,
      quantity,
      quantityBefore,
      quantityAfter,
      note || null,
    ]);
  }

  static async getStockHistory(productId) {
    const sql = `
        SELECT
            id,
            type,
            quantity,
            quantity_before,
            quantity_after,
            note,
            created_at
        FROM product_stock_logs
        WHERE product_id = ?
        ORDER BY created_at DESC
    `;

    const [rows] = await pool.execute(sql, [productId]);

    return rows;
  }

  static async getDeletedById(id) {
    const sql = `
        SELECT
          id,
          name,
          sku,
          deleted_at
      FROM products
      WHERE id=?
      LIMIT 1
  `;

    const [rows] = await pool.execute(sql, [id]);

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  }

  static async isUsedInOrders(productId) {
    const sql = `
    SELECT id
    FROM order_items
    WHERE product_id = ?
    LIMIT 1
  `;

    const [rows] = await pool.execute(sql, [productId]);

    return rows.length > 0;
  }

  static async addGallery(connection, productId, files) {
    const sql = `
    INSERT INTO product_images
    (
      product_id,
      image_url,
      sort_order
    )
    VALUES
    (
      ?, ?, ?
    )
  `;

    const [[max]] = await connection.execute(
      `
      SELECT
        IFNULL(MAX(sort_order),0) AS maxOrder
      FROM product_images
      WHERE product_id = ?
    `,
      [productId],
    );

    let order = Number(max.maxOrder);

    for (const file of files) {
      order++;

      await connection.execute(sql, [
        productId,
        `/uploads/products/${file.filename}`,
        order,
      ]);
    }
  }

  static async getGalleryImage(imageId) {
    const [rows] = await pool.execute(
      `
      SELECT *
      FROM product_images
      WHERE id = ?
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

  static async checkSku(sku, id = null) {
    let sql = `
    SELECT id
    FROM products
    WHERE sku = ?
      AND deleted_at IS NULL
  `;

    const params = [sku];

    if (id) {
      sql += " AND id <> ?";
      params.push(id);
    }

    sql += " LIMIT 1";

    const [rows] = await pool.execute(sql, params);

    return rows.length > 0;
  }
  static async searchSuggestion(keyword) {
    const sql = `
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
  `;

    const search = `%${keyword}%`;

    const [rows] = await pool.execute(sql, [search, search]);

    return rows;
  }

  static async getFormData() {
    const [categories] = await pool.execute(`
      SELECT
        id,
        name
      FROM categories
      WHERE status = 1
        AND deleted_at IS NULL
      ORDER BY name ASC
  `);

    const [socketRows] = await pool.execute(`
      SELECT DISTINCT socket
      FROM products
      WHERE socket IS NOT NULL
        AND socket <> ''
      ORDER BY socket ASC
  `);

    const [ramRows] = await pool.execute(`
      SELECT DISTINCT ram_type
      FROM products
      WHERE ram_type IS NOT NULL
        AND ram_type <> ''
      ORDER BY ram_type ASC
  `);

    return {
      categories,

      socket: socketRows.map((item) => item.socket),

      ramType: ramRows.map((item) => item.ram_type),

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

  static async findByCategory(category) {
    try {
      const query = `
          SELECT 
            p.id, 
            p.name, 
            p.price,
            -- Trích xuất thông số socket và ram_type từ chuỗi JSON trong DB
            JSON_UNQUOTE(JSON_EXTRACT(pp.specifications, '$.socket')) AS socket,
            JSON_UNQUOTE(JSON_EXTRACT(pp.specifications, '$.ram_type')) AS ram_type
          FROM pc_parts pp
          JOIN products p ON pp.product_id = p.id
          JOIN pc_part_types pt ON pp.type_id = pt.id
          WHERE LOWER(pt.type_code) = LOWER(?) OR LOWER(pt.type_name) = LOWER(?)
        `;

      const [rows] = await pool.query(query, [category, category]);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // ======================================================
  // CLIENT HELPERS
  // ======================================================

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

      // Không cần gửi duplicated field này ra FE.
      average_rating: undefined,
      review_count: undefined,
    };
  }

  // ======================================================
  // CLIENT - DANH SÁCH SẢN PHẨM
  // ======================================================

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
    // =========================================
    // Pagination
    // =========================================

    page = Number.parseInt(page, 10);
    limit = Number.parseInt(limit, 10);

    if (!Number.isInteger(page) || page < 1) {
      page = 1;
    }

    if (!Number.isInteger(limit) || limit < 1) {
      limit = 12;
    }

    // Không cho client lấy quá nhiều record một lần.
    limit = Math.min(limit, 48);

    const offset = (page - 1) * limit;

    // =========================================
    // Normalize query
    // =========================================

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

    // =========================================
    // Giá thực tế
    // =========================================

    const finalPriceSql = `
    CASE
      WHEN p.sale_price IS NOT NULL
        AND p.sale_price > 0
        AND p.sale_price < p.price
      THEN p.sale_price

      ELSE p.price
    END
  `;

    // =========================================
    // WHERE
    // =========================================

    const where = [
      "p.deleted_at IS NULL",
      "p.status = 1",

      "c.deleted_at IS NULL",
      "c.status = 1",
    ];

    const params = [];

    // =========================================
    // Search
    // =========================================

    if (search) {
      const keyword = `%${search}%`;

      where.push(`
      (
        p.name LIKE ?
        OR p.sku LIKE ?
        OR COALESCE(p.short_description, '') LIKE ?
        OR c.name LIKE ?
      )
    `);

      params.push(keyword, keyword, keyword, keyword);
    }

    // =========================================
    // Category
    // =========================================

    if (category) {
      where.push("c.slug = ?");
      params.push(category);
    }

    // =========================================
    // Socket
    // =========================================

    if (socket) {
      where.push("p.socket = ?");
      params.push(socket);
    }

    // =========================================
    // RAM Type
    // =========================================

    if (ramFilter) {
      where.push("p.ram_type = ?");
      params.push(ramFilter);
    }

    // =========================================
    // Stock
    // products.quantity = tồn kho hiện tại
    // =========================================

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

    // =========================================
    // Sale
    // =========================================

    if (sale === "1" || sale === "true" || sale === "yes") {
      where.push(`
      p.sale_price IS NOT NULL
      AND p.sale_price > 0
      AND p.sale_price < p.price
    `);
    }

    // =========================================
    // Price range
    // =========================================

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

    // =========================================
    // Sort
    // =========================================

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
          COALESCE(sales.sold, 0) DESC,
          p.created_at DESC,
          p.id DESC
      `;
        break;

      case "rating_desc":
        orderBy = `
        ORDER BY
          COALESCE(review_stats.average_rating, 0) DESC,
          COALESCE(review_stats.review_count, 0) DESC,
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

      case "newest":
      default:
        break;
    }

    // =========================================
    // Count
    // =========================================

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

    // =========================================
    // Product list
    // =========================================

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

        ${finalPriceSql} AS final_price,

        CASE
          WHEN p.sale_price IS NOT NULL
            AND p.sale_price > 0
            AND p.sale_price < p.price
          THEN ROUND(
            (
              (p.price - p.sale_price)
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

          SUM(oi.quantity) AS sold

        FROM order_items oi

        INNER JOIN orders o
          ON o.id = oi.order_id

        WHERE
          oi.deleted_at IS NULL
          AND o.deleted_at IS NULL

          -- Chỉ tính sản phẩm thực sự hoàn thành.
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

          COUNT(*) AS review_count

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

    // =========================================
    // FILTER DATA
    // =========================================

    const [categories] = await pool.execute(
      `
      SELECT
        c.id,
        c.name,
        c.slug,
        c.image,

        COUNT(p.id) AS product_count

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
      SELECT DISTINCT
        socket

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
      SELECT DISTINCT
        ram_type

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
            WHEN sale_price IS NOT NULL
              AND sale_price > 0
              AND sale_price < price
            THEN sale_price

            ELSE price
          END
        ) AS min_price,

        MAX(
          CASE
            WHEN sale_price IS NOT NULL
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

    // =========================================
    // Response
    // =========================================

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

  // ======================================================
  // CLIENT - SEARCH SUGGESTIONS
  // ======================================================

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
          WHEN p.sale_price IS NOT NULL
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

  // ======================================================
  // CLIENT - CHI TIẾT SẢN PHẨM
  // ======================================================

  static async getClientProductBySlug(slug) {
    slug = String(slug || "").trim();

    if (!slug) {
      return null;
    }

    // =========================================
    // PRODUCT
    // =========================================

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
          WHEN p.sale_price IS NOT NULL
            AND p.sale_price > 0
            AND p.sale_price < p.price
          THEN p.sale_price

          ELSE p.price
        END AS final_price,

        CASE
          WHEN p.sale_price IS NOT NULL
            AND p.sale_price > 0
            AND p.sale_price < p.price
          THEN ROUND(
            (
              (p.price - p.sale_price)
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
          SUM(oi.quantity) AS sold

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

          COUNT(*) AS review_count

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

    // =========================================
    // GALLERY
    // =========================================

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

    /*
     * Thumbnail cũng được đưa vào danh sách ảnh.
     *
     * Nếu thumbnail đã xuất hiện trong gallery
     * thì không thêm lần nữa.
     */
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

    // =========================================
    // SPECIFICATIONS
    // =========================================

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

    // =========================================
    // RATING DISTRIBUTION
    // =========================================

    const [ratingRows] = await pool.execute(
      `
        SELECT
          rating,
          COUNT(*) AS total

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

    // =========================================
    // REVIEW PREVIEW
    // =========================================

    const [reviews] = await pool.execute(
      `
        SELECT
          cm.id,
          cm.user_id,
          cm.content,
          cm.rating,
          cm.created_at,

          u.full_name AS user_name,
          u.avatar AS user_avatar

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

    // =========================================
    // RELATED PRODUCTS
    // =========================================

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
            WHEN p.sale_price IS NOT NULL
              AND p.sale_price > 0
              AND p.sale_price < p.price
            THEN p.sale_price

            ELSE p.price
          END AS final_price,

          CASE
            WHEN p.sale_price IS NOT NULL
              AND p.sale_price > 0
              AND p.sale_price < p.price
            THEN ROUND(
              (
                (p.price - p.sale_price)
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
                WHEN p.sale_price IS NOT NULL
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

    // =========================================
    // RESPONSE
    // =========================================

    return {
      product,

      gallery: normalizedGallery,

      specifications: specifications.map((item) => ({
        ...item,
        id: Number(item.id),
      })),

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
