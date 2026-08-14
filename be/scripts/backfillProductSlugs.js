const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const { pool } = require("../config/database");

function slugify(value = "") {
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

async function createUniqueSlug(connection, name, productId) {
  const baseSlug = slugify(name) || `product-${productId}`;

  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const [rows] = await connection.execute(
      `
          SELECT id
          FROM products
          WHERE slug = ?
            AND id <> ?
          LIMIT 1
        `,
      [slug, productId],
    );

    if (rows.length === 0) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix++;
  }
}

async function main() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [products] = await connection.execute(
      `
          SELECT
            id,
            name,
            slug
          FROM products
          ORDER BY id ASC
        `,
    );

    let updated = 0;

    for (const product of products) {
      if (product.slug && String(product.slug).trim()) {
        continue;
      }

      const slug = await createUniqueSlug(connection, product.name, product.id);

      await connection.execute(
        `
          UPDATE products
          SET
            slug = ?,
            updated_at = NOW()
          WHERE id = ?
        `,
        [slug, product.id],
      );

      console.log(`✅ #${product.id} ${product.name} -> ${slug}`);

      updated++;
    }

    await connection.commit();

    console.log();
    console.log(` Đã cập nhật ${updated} slug.`);
  } catch (error) {
    await connection.rollback();

    console.error("Backfill slug thất bại:", error);

    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

main();
