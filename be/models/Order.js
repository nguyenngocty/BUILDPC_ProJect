const database = require("../config/database");
const ProductVariant = require("./ProductVariant");
const ghnService = require("../services/ghnService");

const db =
  database.pool ||
  database.db ||
  database.connection ||
  database.conn ||
  database;

const pool = database.pool || db;

// ============================================================
// DATABASE HELPERS
// ============================================================

const runQuery = async (executor, sql, params = []) => {
  if (executor && typeof executor.query === "function") {
    const result = await executor.query(sql, params);

    return Array.isArray(result) ? result[0] : result;
  }

  if (executor && typeof executor.execute === "function") {
    const result = await executor.execute(sql, params);

    return Array.isArray(result) ? result[0] : result;
  }

  throw new Error("Database connection không có hàm query hoặc execute");
};

const query = async (sql, params = []) => {
  return runQuery(db, sql, params);
};

const getTransactionConnection = async () => {
  if (!pool || typeof pool.getConnection !== "function") {
    throw new Error("Database pool không hỗ trợ transaction");
  }

  return pool.getConnection();
};

// ============================================================
// NORMALIZE
// ============================================================

const normalizeInt = (value, defaultValue = 0) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const normalizeNullableInt = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeMoney = (value) => {
  const number = Number(value || 0);

  return Number.isFinite(number) ? Math.max(number, 0) : 0;
};

const normalizeText = (value, maxLength = 255) => {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
};

const normalizeProvinceCode = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase();
};

const normalizeWardCode = (value) => {
  return String(value || "").trim();
};

const normalizeCouponCode = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase();
};

const normalizePaymentMethod = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

const getFinalPrice = ({ price, sale_price }) => {
  const regularPrice = normalizeMoney(price);

  const salePrice =
    sale_price !== null && sale_price !== undefined
      ? normalizeMoney(sale_price)
      : null;

  if (salePrice !== null && salePrice > 0 && salePrice < regularPrice) {
    return salePrice;
  }

  return regularPrice;
};

const generateOrderCode = () => {
  const time = Date.now();

  const random = Math.floor(Math.random() * 9000) + 1000;

  return `ORD${time}${random}`;
};

// ============================================================
// DATE
// ============================================================

const normalizeDateOnly = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",

    year: "numeric",

    month: "2-digit",

    day: "2-digit",
  });

  return formatter.format(date);
};

const getVietnamToday = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",

    year: "numeric",

    month: "2-digit",

    day: "2-digit",
  });

  return formatter.format(new Date());
};

// ============================================================
// GHN HELPERS
// ============================================================

const isGhnItemActive = (item) => {
  if (!item) {
    return false;
  }

  if (item.Status !== undefined && Number(item.Status) !== 1) {
    return false;
  }

  if (item.IsEnable !== undefined && Number(item.IsEnable) !== 1) {
    return false;
  }

  return true;
};

const normalizeGhnEstimatedDelivery = (value) => {
  // ========================================================
  // EMPTY
  // ========================================================

  if (value === null || value === undefined || value === "") {
    return null;
  }

  const rawValue = String(value).trim();

  if (!rawValue) {
    return null;
  }

  // ========================================================
  // NUMERIC TIMESTAMP
  //
  // GHN thường trả Unix timestamp theo giây.
  //
  // Quan trọng:
  // - 0
  // - "0"
  // - số âm
  //
  // đều KHÔNG phải ngày giao hàng hợp lệ.
  // Tuyệt đối không được new Date(0) vì sẽ ra năm 1970.
  // ========================================================

  const numericPattern = /^-?\d+(\.\d+)?$/;

  if (numericPattern.test(rawValue)) {
    const numericValue = Number(rawValue);

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return null;
    }

    /*
     * Nếu giá trị lớn hơn 100000000000
     * thì xem như millisecond timestamp.
     *
     * Ngược lại xem như Unix timestamp theo giây.
     */
    const milliseconds =
      numericValue > 100000000000 ? numericValue : numericValue * 1000;

    const date = new Date(milliseconds);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    /*
     * Chặn mọi giá trị timestamp bất thường
     * vô tình dẫn tới năm 1970 hoặc quá cũ.
     *
     * GHN estimated delivery phải là thời gian thực tế,
     * nên mốc trước năm 2000 không có ý nghĩa nghiệp vụ.
     */
    if (date.getUTCFullYear() < 2000) {
      return null;
    }

    return date;
  }

  // ========================================================
  // DATE STRING
  //
  // Phòng trường hợp GHN thay đổi response
  // và trả ISO datetime/string datetime.
  // ========================================================

  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  if (parsedDate.getUTCFullYear() < 2000) {
    return null;
  }

  return parsedDate;
};
// ============================================================
// JSON
// ============================================================

const parseJson = (value, fallback = []) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const stringifyJson = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

// ============================================================
// VARIANT OPTIONS SNAPSHOT
// ============================================================

const getVariantOptionsSnapshot = async (executor, variantId) => {
  if (!variantId) {
    return [];
  }

  const rows = await runQuery(
    executor,
    `
        SELECT
          pvv.option_id,
          pvv.option_value_id,

          po.name AS option_name,
          po.code AS option_code,
          po.display_type,

          pov.value,
          pov.label,
          pov.color_code

        FROM product_variant_values pvv

        INNER JOIN product_options po
          ON po.id = pvv.option_id

        INNER JOIN product_option_values pov
          ON pov.id = pvv.option_value_id

        WHERE
          pvv.variant_id = ?

        ORDER BY
          po.sort_order ASC,
          po.id ASC
      `,
    [variantId],
  );

  return rows.map((item) => ({
    option_id: Number(item.option_id),

    option_value_id: Number(item.option_value_id),

    option_name: item.option_name,

    option_code: item.option_code,

    display_type: item.display_type,

    value: item.value,

    label: item.label,

    color_code: item.color_code,
  }));
};

// ============================================================
// NORMALIZE ORDER ITEM
// ============================================================

const normalizeOrderItem = (item) => {
  return {
    ...item,

    id: Number(item.id),

    order_id: Number(item.order_id),

    product_id: Number(item.product_id),

    variant_id:
      item.variant_id !== null && item.variant_id !== undefined
        ? Number(item.variant_id)
        : null,

    price: Number(item.price || 0),

    quantity: Number(item.quantity || 0),

    total_price: Number(item.total_price || 0),

    variant_options: parseJson(item.variant_options, []),
  };
};

// ============================================================
// STOCK LOG
// ============================================================

const createStockLog = async (
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

    note = null,
  },
) => {
  await runQuery(
    connection,
    `
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

        note,

        created_at
      )

      VALUES
      (
        ?,
        ?,

        ?,
        ?,

        ?,
        ?,

        ?,
        ?,

        ?,
        ?,

        ?,

        NOW()
      )
    `,
    [
      productId,

      variantId,

      type,

      quantity,

      quantityBefore,

      quantityAfter,

      productQuantityBefore,

      productQuantityAfter,

      referenceType,

      referenceId,

      normalizeText(note, 255) || null,
    ],
  );
};

// ============================================================
// CART ITEM NORMALIZER
// ============================================================

const normalizeCartCheckoutItem = async (connection, cartItem) => {
  const productId = normalizeInt(cartItem.product_id);

  const variantId = normalizeNullableInt(cartItem.variant_id);

  const requestedQuantity = Math.max(normalizeInt(cartItem.quantity, 0), 0);

  if (productId < 1 || requestedQuantity < 1) {
    throw new Error("Sản phẩm trong giỏ hàng không hợp lệ.");
  }

  // ========================================================
  // PRODUCT
  // ========================================================

  const productRows = await runQuery(
    connection,
    `
          SELECT
            id,
            name,
            slug,
            sku,
            thumbnail,

            price,
            sale_price,

            quantity,
            status

          FROM products

          WHERE
            id = ?
            AND deleted_at IS NULL

          LIMIT 1

          FOR UPDATE
        `,
    [productId],
  );

  const product = productRows[0];

  if (!product) {
    throw new Error(`Sản phẩm ID ${productId} không còn tồn tại.`);
  }

  if (Number(product.status) !== 1) {
    throw new Error(`Sản phẩm "${product.name}" hiện không khả dụng.`);
  }

  // ========================================================
  // VARIANT COUNT
  // ========================================================

  const variantCountRows = await runQuery(
    connection,
    `
          SELECT
            COUNT(*) AS total

          FROM product_variants

          WHERE
            product_id = ?
            AND deleted_at IS NULL
        `,
    [productId],
  );

  const activeVariantCount = Number(variantCountRows[0]?.total || 0);

  // ========================================================
  // EXPLICIT VARIANT
  // ========================================================

  if (variantId) {
    const variantRows = await runQuery(
      connection,
      `
            SELECT
              id,
              product_id,

              sku,
              variant_name,

              price,
              sale_price,

              quantity,

              thumbnail,

              status,
              is_default

            FROM product_variants

            WHERE
              id = ?
              AND product_id = ?
              AND deleted_at IS NULL

            LIMIT 1

            FOR UPDATE
          `,
      [variantId, productId],
    );

    const variant = variantRows[0];

    if (!variant) {
      throw new Error(
        `Biến thể đã chọn của "${product.name}" không còn tồn tại.`,
      );
    }

    if (Number(variant.status) !== 1) {
      throw new Error(
        `Biến thể "${variant.variant_name}" hiện không khả dụng.`,
      );
    }

    const stock = Math.max(Number(variant.quantity || 0), 0);

    if (requestedQuantity > stock) {
      throw new Error(
        `Biến thể "${variant.variant_name}" chỉ còn ${stock} sản phẩm.`,
      );
    }

    const price = getFinalPrice({
      price: variant.price,

      sale_price: variant.sale_price,
    });

    const options = await getVariantOptionsSnapshot(connection, variantId);

    return {
      product_id: Number(product.id),

      variant_id: Number(variant.id),

      product_name: product.name,

      variant_name: variant.variant_name || null,

      sku: variant.sku || product.sku || null,

      product_image: variant.thumbnail || product.thumbnail || null,

      variant_options: options,

      quantity: requestedQuantity,

      price,

      total_price: price * requestedQuantity,

      stock_scope: "variant",

      available_stock: stock,
    };
  }

  // ========================================================
  // MULTIPLE VARIANT
  // ========================================================

  if (activeVariantCount > 1) {
    throw new Error(`Vui lòng chọn biến thể của sản phẩm "${product.name}".`);
  }

  // ========================================================
  // LEGACY - 1 VARIANT
  // ========================================================

  if (activeVariantCount === 1) {
    const onlyVariantRows = await runQuery(
      connection,
      `
            SELECT
              id,
              product_id,

              sku,
              variant_name,

              price,
              sale_price,

              quantity,

              thumbnail,

              status,
              is_default

            FROM product_variants

            WHERE
              product_id = ?
              AND deleted_at IS NULL

            ORDER BY
              is_default DESC,
              sort_order ASC,
              id ASC

            LIMIT 1

            FOR UPDATE
          `,
      [productId],
    );

    const variant = onlyVariantRows[0];

    if (variant && Number(variant.status) === 1) {
      const stock = Math.max(Number(variant.quantity || 0), 0);

      if (requestedQuantity > stock) {
        throw new Error(
          `Sản phẩm "${product.name}" chỉ còn ${stock} sản phẩm.`,
        );
      }

      const price = getFinalPrice({
        price: variant.price,

        sale_price: variant.sale_price,
      });

      const options = await getVariantOptionsSnapshot(connection, variant.id);

      return {
        product_id: Number(product.id),

        variant_id: Number(variant.id),

        product_name: product.name,

        variant_name: variant.variant_name || null,

        sku: variant.sku || product.sku || null,

        product_image: variant.thumbnail || product.thumbnail || null,

        variant_options: options,

        quantity: requestedQuantity,

        price,

        total_price: price * requestedQuantity,

        stock_scope: "variant",

        available_stock: stock,
      };
    }

    throw new Error(`Biến thể của "${product.name}" hiện không khả dụng.`);
  }

  // ========================================================
  // LEGACY PRODUCT
  // ========================================================

  const stock = Math.max(Number(product.quantity || 0), 0);

  if (requestedQuantity > stock) {
    throw new Error(`Sản phẩm "${product.name}" chỉ còn ${stock} sản phẩm.`);
  }

  const price = getFinalPrice({
    price: product.price,

    sale_price: product.sale_price,
  });

  return {
    product_id: Number(product.id),

    variant_id: null,

    product_name: product.name,

    variant_name: null,

    sku: product.sku || null,

    product_image: product.thumbnail || null,

    variant_options: [],

    quantity: requestedQuantity,

    price,

    total_price: price * requestedQuantity,

    stock_scope: "product",

    available_stock: stock,
  };
};

// ============================================================
// COUPON
// ============================================================

const calculateCouponDiscount = (coupon, subtotal) => {
  if (!coupon) {
    return 0;
  }

  const value = normalizeMoney(coupon.value);

  let discountAmount = 0;

  if (String(coupon.type).toLowerCase() === "percent") {
    discountAmount = Math.round((subtotal * value) / 100);
  } else if (String(coupon.type).toLowerCase() === "fixed") {
    discountAmount = value;
  }

  return Math.min(Math.max(discountAmount, 0), subtotal);
};

const resolveCouponForCheckout = async (
  connection,
  {
    couponCode,

    subtotal,
  },
) => {
  const normalizedCode = normalizeCouponCode(couponCode);

  if (!normalizedCode) {
    return {
      coupon: null,

      coupon_id: null,

      coupon_code: null,

      discount_amount: 0,
    };
  }

  const rows = await runQuery(
    connection,
    `
          SELECT
            id,
            code,
            type,
            value,
            min_order,
            start_date,
            end_date,
            quantity,
            used_count,
            status

          FROM coupons

          WHERE UPPER(code) = ?

          LIMIT 1

          FOR UPDATE
        `,
    [normalizedCode],
  );

  const coupon = rows[0];

  if (!coupon) {
    throw new Error("Mã giảm giá không tồn tại.");
  }

  if (Number(coupon.status) !== 1) {
    throw new Error("Mã giảm giá hiện đang tạm tắt.");
  }

  const today = getVietnamToday();

  const startDate = normalizeDateOnly(coupon.start_date);

  const endDate = normalizeDateOnly(coupon.end_date);

  if (startDate && today < startDate) {
    throw new Error(`Mã giảm giá chưa có hiệu lực. Bắt đầu từ ${startDate}.`);
  }

  if (endDate && today > endDate) {
    throw new Error("Mã giảm giá đã hết hạn.");
  }

  const quantity = Math.max(normalizeInt(coupon.quantity, 0), 0);

  const usedCount = Math.max(normalizeInt(coupon.used_count, 0), 0);

  if (quantity <= 0 || usedCount >= quantity) {
    throw new Error("Mã giảm giá đã hết lượt sử dụng.");
  }

  const minOrder = normalizeMoney(coupon.min_order);

  if (subtotal < minOrder) {
    throw new Error(
      `Đơn hàng tối thiểu để sử dụng mã "${coupon.code}" là ${Math.round(
        minOrder,
      ).toLocaleString("vi-VN")}đ.`,
    );
  }

  const type = String(coupon.type || "").toLowerCase();

  if (!["percent", "fixed"].includes(type)) {
    throw new Error("Loại mã giảm giá không hợp lệ.");
  }

  const discountAmount = calculateCouponDiscount(coupon, subtotal);

  return {
    coupon,

    coupon_id: Number(coupon.id),

    coupon_code: coupon.code,

    discount_amount: discountAmount,
  };
};

// ============================================================
// SHIPPING + GHN
// ============================================================

const resolveShippingForCheckout = async (
  connection,
  {
    provinceCode,

    districtId,

    wardCode,

    subtotal,

    discountAmount = 0,

    paymentMethod = "cod",
  },
) => {
  const normalizedProvinceCode = normalizeProvinceCode(provinceCode);

  const normalizedDistrictId = normalizeNullableInt(districtId);

  const normalizedWardCode = normalizeWardCode(wardCode);

  const normalizedSubtotal = normalizeMoney(subtotal);

  const normalizedDiscountAmount = normalizeMoney(discountAmount);

  const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);

  if (!normalizedProvinceCode) {
    throw new Error("Vui lòng chọn tỉnh / thành phố nhận hàng.");
  }

  if (!normalizedDistrictId) {
    throw new Error("Vui lòng chọn quận / huyện nhận hàng.");
  }

  if (!normalizedWardCode) {
    throw new Error("Vui lòng chọn phường / xã nhận hàng.");
  }

  if (normalizedSubtotal <= 0) {
    throw new Error("Giá trị đơn hàng không hợp lệ.");
  }

  // ========================================================
  // WEBSITE SHIPPING REGION
  // ========================================================

  const rows = await runQuery(
    connection,
    `
          SELECT
            id,

            province_code,
            province_name,

            ghn_province_id,

            shipping_fee,
            free_shipping_min,

            status

          FROM shipping_rates

          WHERE
            province_code = ?
            AND status = 1
            AND deleted_at IS NULL

          LIMIT 1

          FOR UPDATE
        `,
    [normalizedProvinceCode],
  );

  const shippingRate = rows[0];

  if (!shippingRate) {
    throw new Error("Khu vực này hiện chưa được hỗ trợ vận chuyển.");
  }

  const ghnProvinceId = normalizeNullableInt(shippingRate.ghn_province_id);

  if (!ghnProvinceId) {
    throw new Error(
      `Khu vực "${shippingRate.province_name}" chưa được ánh xạ với GHN.`,
    );
  }

  // ========================================================
  // DISTRICT
  // ========================================================

  const districts = await ghnService.getDistricts(ghnProvinceId);

  const district = (Array.isArray(districts) ? districts : []).find(
    (item) => Number(item?.DistrictID) === Number(normalizedDistrictId),
  );

  if (!district) {
    throw new Error("Quận / huyện không thuộc tỉnh / thành phố đã chọn.");
  }

  if (!isGhnItemActive(district)) {
    throw new Error("Quận / huyện này hiện không được GHN hỗ trợ giao hàng.");
  }

  // ========================================================
  // WARD
  // ========================================================

  const wards = await ghnService.getWards(normalizedDistrictId);

  const ward = (Array.isArray(wards) ? wards : []).find(
    (item) => String(item?.WardCode || "").trim() === normalizedWardCode,
  );

  if (!ward) {
    throw new Error("Phường / xã không thuộc quận / huyện đã chọn.");
  }

  if (!isGhnItemActive(ward)) {
    throw new Error("Phường / xã này hiện không được GHN hỗ trợ giao hàng.");
  }

  // ========================================================
  // COD VALUE
  // ========================================================

  const merchandiseAmount = Math.max(
    normalizedSubtotal - normalizedDiscountAmount,
    0,
  );

  const codValue = normalizedPaymentMethod === "cod" ? merchandiseAmount : 0;

  // ========================================================
  // GHN FEE
  // ========================================================

  const feeResult = await ghnService.calculateFee({
    toDistrictId: normalizedDistrictId,

    toWardCode: normalizedWardCode,

    insuranceValue: 0,

    codValue,
  });

  const ghnBaseFee = normalizeMoney(feeResult?.total);

  if (ghnBaseFee <= 0) {
    throw new Error("GHN không trả về phí vận chuyển hợp lệ.");
  }

  const selectedService = feeResult?.selected_service;

  if (!selectedService || !Number(selectedService.service_id)) {
    throw new Error("Không xác định được dịch vụ vận chuyển GHN.");
  }

  // ========================================================
  // FREE SHIPPING
  // ========================================================

  const freeShippingMin =
    shippingRate.free_shipping_min === null ||
    shippingRate.free_shipping_min === undefined
      ? null
      : normalizeMoney(shippingRate.free_shipping_min);

  const isFreeShipping =
    freeShippingMin !== null && normalizedSubtotal >= freeShippingMin;

  const shippingFee = isFreeShipping ? 0 : ghnBaseFee;

  // ========================================================
  // LEAD TIME
  // ========================================================

  let estimatedDelivery = null;

  try {
    const leadTimeResult = await ghnService.calculateLeadTime({
      toDistrictId: normalizedDistrictId,

      toWardCode: normalizedWardCode,
    });

    estimatedDelivery = normalizeGhnEstimatedDelivery(leadTimeResult?.leadtime);
  } catch (error) {
    console.warn(
      "[ORDER][GHN] Không lấy được thời gian giao dự kiến:",
      error?.message || error,
    );
  }

  return {
    shipping_rate_id: Number(shippingRate.id),

    shipping_provider: "ghn",

    shipping_ghn_province_id: Number(ghnProvinceId),

    shipping_province_code: shippingRate.province_code,

    shipping_province_name: shippingRate.province_name,

    shipping_district_id: Number(district.DistrictID),

    shipping_district_name: String(district.DistrictName || "").trim(),

    shipping_ward_code: String(ward.WardCode || "").trim(),

    shipping_ward_name: String(ward.WardName || "").trim(),

    shipping_service_id: Number(selectedService.service_id),

    shipping_service_type_id: Number(selectedService.service_type_id),

    shipping_base_fee: ghnBaseFee,

    shipping_fee: shippingFee,

    free_shipping_min: freeShippingMin,

    is_free_shipping: isFreeShipping,

    shipping_estimated_delivery: estimatedDelivery,
  };
};

// ============================================================
// DECREASE STOCK
// ============================================================

const decreaseCheckoutStock = async (
  connection,
  item,
  {
    orderId,

    orderCode,
  },
) => {
  const productRows = await runQuery(
    connection,
    `
          SELECT
            id,
            quantity

          FROM products

          WHERE
            id = ?
            AND deleted_at IS NULL

          LIMIT 1

          FOR UPDATE
        `,
    [item.product_id],
  );

  const product = productRows[0];

  if (!product) {
    throw new Error(`Sản phẩm "${item.product_name}" không còn tồn tại.`);
  }

  const productQuantityBefore = Math.max(Number(product.quantity || 0), 0);

  // ========================================================
  // VARIANT
  // ========================================================

  if (item.variant_id) {
    const variantRows = await runQuery(
      connection,
      `
            SELECT
              id,
              product_id,
              quantity

            FROM product_variants

            WHERE
              id = ?
              AND product_id = ?
              AND deleted_at IS NULL
              AND status = 1

            LIMIT 1

            FOR UPDATE
          `,
      [item.variant_id, item.product_id],
    );

    const variant = variantRows[0];

    if (!variant) {
      throw new Error(
        `Biến thể "${item.variant_name || item.product_name}" không còn khả dụng.`,
      );
    }

    const quantityBefore = Math.max(Number(variant.quantity || 0), 0);

    if (item.quantity > quantityBefore) {
      throw new Error(
        `Biến thể "${item.variant_name || item.product_name}" vừa thay đổi tồn kho. Vui lòng tải lại giỏ hàng.`,
      );
    }

    const result = await runQuery(
      connection,
      `
            UPDATE product_variants

            SET
              quantity = quantity - ?,
              updated_at = NOW()

            WHERE
              id = ?
              AND product_id = ?
              AND deleted_at IS NULL
              AND status = 1
              AND quantity >= ?
          `,
      [item.quantity, item.variant_id, item.product_id, item.quantity],
    );

    if (Number(result.affectedRows || 0) !== 1) {
      throw new Error(
        `Biến thể "${item.variant_name || item.product_name}" vừa thay đổi tồn kho. Vui lòng tải lại giỏ hàng.`,
      );
    }

    const quantityAfter = quantityBefore - Number(item.quantity);

    await ProductVariant.syncProductAggregate(connection, item.product_id);

    const productAfterRows = await runQuery(
      connection,
      `
            SELECT quantity

            FROM products

            WHERE id = ?

            LIMIT 1
          `,
      [item.product_id],
    );

    const productQuantityAfter = Math.max(
      Number(productAfterRows[0]?.quantity || 0),
      0,
    );

    await createStockLog(connection, {
      productId: item.product_id,

      variantId: item.variant_id,

      type: "export",

      quantity: item.quantity,

      quantityBefore,

      quantityAfter,

      productQuantityBefore,

      productQuantityAfter,

      referenceType: "order",

      referenceId: orderId,

      note: `Xuất kho cho đơn hàng ${orderCode}`,
    });

    return;
  }

  // ========================================================
  // LEGACY PRODUCT
  // ========================================================

  if (item.quantity > productQuantityBefore) {
    throw new Error(
      `Sản phẩm "${item.product_name}" vừa thay đổi tồn kho. Vui lòng tải lại giỏ hàng.`,
    );
  }

  const result = await runQuery(
    connection,
    `
          UPDATE products

          SET
            quantity = quantity - ?,
            updated_at = NOW()

          WHERE
            id = ?
            AND deleted_at IS NULL
            AND status = 1
            AND quantity >= ?
        `,
    [item.quantity, item.product_id, item.quantity],
  );

  if (Number(result.affectedRows || 0) !== 1) {
    throw new Error(
      `Sản phẩm "${item.product_name}" vừa thay đổi tồn kho. Vui lòng tải lại giỏ hàng.`,
    );
  }

  const quantityAfter = productQuantityBefore - Number(item.quantity);

  await createStockLog(connection, {
    productId: item.product_id,

    variantId: null,

    type: "export",

    quantity: item.quantity,

    quantityBefore: productQuantityBefore,

    quantityAfter,

    productQuantityBefore,

    productQuantityAfter: quantityAfter,

    referenceType: "order",

    referenceId: orderId,

    note: `Xuất kho cho đơn hàng ${orderCode}`,
  });
};

// ============================================================
// RESTORE STOCK
// ============================================================

const restoreOrderStock = async (connection, orderId) => {
  const orderRows = await runQuery(
    connection,
    `
          SELECT
            id,
            order_code,
            status,
            stock_restored_at

          FROM orders

          WHERE
            id = ?
            AND deleted_at IS NULL

          LIMIT 1

          FOR UPDATE
        `,
    [orderId],
  );

  const order = orderRows[0];

  if (!order) {
    throw new Error("Không tìm thấy đơn hàng");
  }

  if (order.stock_restored_at) {
    return {
      restored: false,

      already_restored: true,
    };
  }

  const items = await runQuery(
    connection,
    `
          SELECT
            id,
            product_id,
            variant_id,
            product_name,
            variant_name,
            sku,
            quantity

          FROM order_items

          WHERE
            order_id = ?
            AND deleted_at IS NULL

          ORDER BY id ASC

          FOR UPDATE
        `,
    [orderId],
  );

  const productsToSync = new Set();

  for (const item of items) {
    const productId = normalizeInt(item.product_id);

    const variantId = normalizeNullableInt(item.variant_id);

    const quantity = Math.max(normalizeInt(item.quantity, 0), 0);

    if (productId < 1 || quantity < 1) {
      continue;
    }

    const productRows = await runQuery(
      connection,
      `
            SELECT
              id,
              quantity

            FROM products

            WHERE id = ?

            LIMIT 1

            FOR UPDATE
          `,
      [productId],
    );

    const product = productRows[0] || null;

    const productQuantityBefore =
      product !== null ? Math.max(Number(product.quantity || 0), 0) : null;

    // ======================================================
    // VARIANT
    // ======================================================

    if (variantId) {
      const variantRows = await runQuery(
        connection,
        `
              SELECT
                id,
                product_id,
                quantity,
                deleted_at

              FROM product_variants

              WHERE
                id = ?
                AND product_id = ?

              LIMIT 1

              FOR UPDATE
            `,
        [variantId, productId],
      );

      const variant = variantRows[0];

      if (!variant) {
        continue;
      }

      const quantityBefore = Math.max(Number(variant.quantity || 0), 0);

      const result = await runQuery(
        connection,
        `
              UPDATE product_variants

              SET
                quantity = quantity + ?,
                updated_at = NOW()

              WHERE
                id = ?
                AND product_id = ?
            `,
        [quantity, variantId, productId],
      );

      if (Number(result.affectedRows || 0) !== 1) {
        continue;
      }

      const quantityAfter = quantityBefore + quantity;

      productsToSync.add(productId);

      await ProductVariant.syncProductAggregate(connection, productId);

      const productAfterRows = await runQuery(
        connection,
        `
              SELECT quantity

              FROM products

              WHERE id = ?

              LIMIT 1
            `,
        [productId],
      );

      const productQuantityAfter = productAfterRows[0]
        ? Math.max(Number(productAfterRows[0].quantity || 0), 0)
        : productQuantityBefore;

      await createStockLog(connection, {
        productId,

        variantId,

        type: "import",

        quantity,

        quantityBefore,

        quantityAfter,

        productQuantityBefore,

        productQuantityAfter,

        referenceType: "order_cancel",

        referenceId: orderId,

        note: `Hoàn kho do hủy đơn hàng ${order.order_code}`,
      });

      continue;
    }

    // ======================================================
    // PRODUCT
    // ======================================================

    if (!product) {
      continue;
    }

    const quantityBefore = productQuantityBefore;

    const result = await runQuery(
      connection,
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

    if (Number(result.affectedRows || 0) !== 1) {
      continue;
    }

    const quantityAfter = quantityBefore + quantity;

    await createStockLog(connection, {
      productId,

      variantId: null,

      type: "import",

      quantity,

      quantityBefore,

      quantityAfter,

      productQuantityBefore: quantityBefore,

      productQuantityAfter: quantityAfter,

      referenceType: "order_cancel",

      referenceId: orderId,

      note: `Hoàn kho do hủy đơn hàng ${order.order_code}`,
    });
  }

  for (const productId of productsToSync) {
    await ProductVariant.syncProductAggregate(connection, productId);
  }

  await runQuery(
    connection,
    `
        UPDATE orders

        SET
          stock_restored_at = NOW(),
          updated_at = NOW()

        WHERE
          id = ?
          AND stock_restored_at IS NULL
          AND deleted_at IS NULL
      `,
    [orderId],
  );

  return {
    restored: true,

    already_restored: false,
  };
};

// ============================================================
// RESTORE COUPON
// ============================================================

const restoreOrderCoupon = async (connection, orderId) => {
  const orderRows = await runQuery(
    connection,
    `
          SELECT
            id,
            coupon_id,
            coupon_code,
            coupon_restored_at

          FROM orders

          WHERE
            id = ?
            AND deleted_at IS NULL

          LIMIT 1

          FOR UPDATE
        `,
    [orderId],
  );

  const order = orderRows[0];

  if (!order) {
    throw new Error("Không tìm thấy đơn hàng");
  }

  if (!order.coupon_id) {
    return {
      restored: false,

      no_coupon: true,
    };
  }

  if (order.coupon_restored_at) {
    return {
      restored: false,

      already_restored: true,
    };
  }

  const couponRows = await runQuery(
    connection,
    `
          SELECT
            id,
            used_count

          FROM coupons

          WHERE id = ?

          LIMIT 1

          FOR UPDATE
        `,
    [order.coupon_id],
  );

  const coupon = couponRows[0];

  if (coupon) {
    await runQuery(
      connection,
      `
          UPDATE coupons

          SET
            used_count =
              CASE
                WHEN used_count > 0
                THEN used_count - 1
                ELSE 0
              END

          WHERE id = ?
        `,
      [order.coupon_id],
    );
  }

  await runQuery(
    connection,
    `
        UPDATE orders

        SET
          coupon_restored_at = NOW(),
          updated_at = NOW()

        WHERE
          id = ?
          AND coupon_restored_at IS NULL
          AND deleted_at IS NULL
      `,
    [orderId],
  );

  return {
    restored: Boolean(coupon),

    already_restored: false,
  };
};

// ============================================================
// CANCEL TRANSACTION
// ============================================================

const cancelAndRestoreStockInTransaction = async (
  connection,
  {
    orderId,

    reason = null,

    allowedStatuses = ["PENDING", "PROCESSING"],
  },
) => {
  const normalizedOrderId = normalizeInt(orderId);

  if (normalizedOrderId < 1) {
    throw new Error("Đơn hàng không hợp lệ");
  }

  const orderRows = await runQuery(
    connection,
    `
          SELECT
            id,
            status,
            stock_restored_at,
            coupon_restored_at

          FROM orders

          WHERE
            id = ?
            AND deleted_at IS NULL

          LIMIT 1

          FOR UPDATE
        `,
    [normalizedOrderId],
  );

  const order = orderRows[0];

  if (!order) {
    throw new Error("Không tìm thấy đơn hàng");
  }

  const currentStatus = String(order.status || "").toUpperCase();

  if (currentStatus === "CANCELLED") {
    await restoreOrderStock(connection, normalizedOrderId);

    await restoreOrderCoupon(connection, normalizedOrderId);

    return;
  }

  if (!allowedStatuses.includes(currentStatus)) {
    throw new Error(`Không thể hủy đơn hàng ở trạng thái ${currentStatus}`);
  }

  await restoreOrderStock(connection, normalizedOrderId);

  await restoreOrderCoupon(connection, normalizedOrderId);

  await runQuery(
    connection,
    `
        UPDATE orders

        SET
          status = 'CANCELLED',

          cancel_reason =
            CASE
              WHEN ? IS NOT NULL
                   AND ? <> ''
              THEN ?
              ELSE cancel_reason
            END,

          cancelled_at =
            COALESCE(
              cancelled_at,
              NOW()
            ),

          updated_at = NOW()

        WHERE
          id = ?
          AND deleted_at IS NULL
      `,
    [reason, reason, reason, normalizedOrderId],
  );
};

// ============================================================
// USER ORDER FILTER
// ============================================================

const buildUserOrderConditions = ({ userId, status, search }) => {
  const conditions = ["o.user_id = ?", "o.deleted_at IS NULL"];

  const params = [userId];

  if (status) {
    conditions.push("o.status = ?");

    params.push(status);
  }

  if (search) {
    const keyword = `%${search}%`;

    conditions.push(
      `
        (
          o.order_code LIKE ?
          OR o.shipping_name LIKE ?
          OR o.shipping_phone LIKE ?
          OR COALESCE(o.shipping_email, '') LIKE ?
          OR COALESCE(o.coupon_code, '') LIKE ?

          OR EXISTS (
            SELECT 1

            FROM order_items oi_search

            WHERE
              oi_search.order_id = o.id
              AND oi_search.deleted_at IS NULL

              AND (
                oi_search.product_name LIKE ?
                OR COALESCE(oi_search.variant_name, '') LIKE ?
                OR COALESCE(oi_search.sku, '') LIKE ?
              )
          )
        )
      `,
    );

    params.push(
      keyword,
      keyword,
      keyword,
      keyword,
      keyword,
      keyword,
      keyword,
      keyword,
    );
  }

  return {
    whereSql: conditions.join("\n AND "),

    params,
  };
};

// ============================================================
// INSERT ORDER HELPER
// ============================================================

const insertOrder = async (
  connection,
  {
    userId,

    orderCode,

    subtotal,

    discountAmount,

    couponResult,

    shippingResult,

    totalAmount,

    data,
  },
) => {
  const result = await runQuery(
    connection,
    `
        INSERT INTO orders
        (
          user_id,

          order_code,

          subtotal,

          shipping_fee,

          discount_amount,

          coupon_id,

          coupon_code,

          coupon_restored_at,

          shipping_rate_id,

          shipping_provider,

          shipping_ghn_province_id,

          shipping_province_code,

          shipping_province_name,

          shipping_district_id,

          shipping_district_name,

          shipping_ward_code,

          shipping_ward_name,

          shipping_service_id,

          shipping_service_type_id,

          shipping_base_fee,

          shipping_estimated_delivery,

          total_amount,

          shipping_name,

          shipping_phone,

          shipping_email,

          shipping_address,

          note,

          status,

          stock_restored_at,

          created_at,

          updated_at
        )

        VALUES
        (
          ?,

          ?,

          ?,

          ?,

          ?,

          ?,

          ?,

          NULL,

          ?,

          ?,

          ?,

          ?,

          ?,

          ?,

          ?,

          ?,

          ?,

          ?,

          ?,

          ?,

          ?,

          ?,

          ?,

          ?,

          ?,

          ?,

          ?,

          'PENDING',

          NULL,

          NOW(),

          NOW()
        )
      `,
    [
      userId,

      orderCode,

      subtotal,

      shippingResult.shipping_fee,

      discountAmount,

      couponResult.coupon_id,

      couponResult.coupon_code,

      shippingResult.shipping_rate_id,

      shippingResult.shipping_provider,

      shippingResult.shipping_ghn_province_id,

      shippingResult.shipping_province_code,

      shippingResult.shipping_province_name,

      shippingResult.shipping_district_id,

      shippingResult.shipping_district_name,

      shippingResult.shipping_ward_code,

      shippingResult.shipping_ward_name,

      shippingResult.shipping_service_id,

      shippingResult.shipping_service_type_id,

      shippingResult.shipping_base_fee,

      shippingResult.shipping_estimated_delivery,

      totalAmount,

      data.shipping_name,

      data.shipping_phone,

      data.shipping_email || null,

      data.shipping_address,

      data.note || null,
    ],
  );

  return Number(result.insertId);
};

// ============================================================
// ORDER MODEL
// ============================================================

const Order = {
  // ==========================================================
  // CART
  // ==========================================================

  async getCartWithItems(userId) {
    const cartRows = await query(
      `
          SELECT *

          FROM carts

          WHERE
            user_id = ?
            AND deleted_at IS NULL

          LIMIT 1
        `,
      [userId],
    );

    const cart = cartRows[0];

    if (!cart) {
      return {
        cart: null,

        items: [],
      };
    }

    const items = await query(
      `
          SELECT
            ci.id AS cart_item_id,

            ci.cart_id,

            ci.product_id,
            ci.variant_id,

            ci.quantity,

            ci.price AS cart_price,

            ci.total_price AS cart_total_price,

            p.name AS product_name,

            p.slug AS product_slug,

            p.thumbnail AS product_image,

            p.status AS product_status,

            pv.variant_name,

            pv.sku AS variant_sku,

            pv.thumbnail AS variant_thumbnail,

            pv.price AS variant_price,

            pv.sale_price AS variant_sale_price,

            pv.quantity AS variant_stock,

            pv.status AS variant_status

          FROM cart_items ci

          INNER JOIN products p
            ON p.id = ci.product_id

          LEFT JOIN product_variants pv
            ON pv.id = ci.variant_id

          WHERE
            ci.cart_id = ?
            AND ci.deleted_at IS NULL
            AND p.deleted_at IS NULL

          ORDER BY
            ci.id ASC
        `,
      [cart.id],
    );

    return {
      cart,

      items,
    };
  },

  // ==========================================================
  // CREATE FROM CART
  // ==========================================================

  async createFromCart(data) {
    const userId = normalizeInt(data.user_id);

    if (userId < 1) {
      throw new Error("Người dùng không hợp lệ");
    }

    const provinceCode = normalizeProvinceCode(
      data.province_code || data.shipping_province_code,
    );

    const shippingDistrictId = normalizeNullableInt(data.shipping_district_id);

    const shippingWardCode = normalizeWardCode(data.shipping_ward_code);

    const couponCode = normalizeCouponCode(data.coupon_code);

    if (!provinceCode) {
      throw new Error("Vui lòng chọn tỉnh / thành phố nhận hàng.");
    }

    if (!shippingDistrictId) {
      throw new Error("Vui lòng chọn quận / huyện nhận hàng.");
    }

    if (!shippingWardCode) {
      throw new Error("Vui lòng chọn phường / xã nhận hàng.");
    }

    const connection = await getTransactionConnection();

    let orderId = null;

    try {
      await connection.beginTransaction();

      // ======================================================
      // CART
      // ======================================================

      const cartRows = await runQuery(
        connection,
        `
            SELECT
              id,
              user_id

            FROM carts

            WHERE
              user_id = ?
              AND deleted_at IS NULL

            LIMIT 1

            FOR UPDATE
          `,
        [userId],
      );

      const cart = cartRows[0];

      if (!cart) {
        throw new Error("Giỏ hàng đang trống");
      }

      // ======================================================
      // CART ITEMS
      // ======================================================

      const cartItems = await runQuery(
        connection,
        `
            SELECT
              id,
              cart_id,
              product_id,
              variant_id,
              quantity,
              price,
              total_price

            FROM cart_items

            WHERE
              cart_id = ?
              AND deleted_at IS NULL

            ORDER BY id ASC

            FOR UPDATE
          `,
        [cart.id],
      );

      if (cartItems.length === 0) {
        throw new Error("Giỏ hàng đang trống");
      }

      const checkoutItems = [];

      for (const cartItem of cartItems) {
        const checkoutItem = await normalizeCartCheckoutItem(
          connection,
          cartItem,
        );

        checkoutItems.push(checkoutItem);
      }

      // ======================================================
      // SUBTOTAL
      // ======================================================

      const subtotal = checkoutItems.reduce(
        (sum, item) => sum + Number(item.total_price || 0),
        0,
      );

      if (subtotal <= 0) {
        throw new Error("Giá trị đơn hàng không hợp lệ.");
      }

      // ======================================================
      // COUPON
      // ======================================================

      const couponResult = await resolveCouponForCheckout(connection, {
        couponCode,

        subtotal,
      });

      const discountAmount = Number(couponResult.discount_amount || 0);

      // ======================================================
      // SHIPPING GHN
      // ======================================================

      const shippingResult = await resolveShippingForCheckout(connection, {
        provinceCode,

        districtId: shippingDistrictId,

        wardCode: shippingWardCode,

        subtotal,

        discountAmount,

        paymentMethod: data.payment_method,
      });

      const shippingFee = Number(shippingResult.shipping_fee || 0);

      const totalAmount = Math.max(subtotal + shippingFee - discountAmount, 0);

      const orderCode = generateOrderCode();

      // ======================================================
      // ORDER
      // ======================================================

      orderId = await insertOrder(connection, {
        userId,

        orderCode,

        subtotal,

        discountAmount,

        couponResult,

        shippingResult,

        totalAmount,

        data,
      });

      if (!orderId) {
        throw new Error("Không tạo được đơn hàng");
      }

      // ======================================================
      // COUPON COUNT
      // ======================================================

      if (couponResult.coupon_id) {
        const couponUpdate = await runQuery(
          connection,
          `
              UPDATE coupons

              SET
                used_count = used_count + 1

              WHERE
                id = ?
                AND status = 1
                AND used_count < quantity
            `,
          [couponResult.coupon_id],
        );

        if (Number(couponUpdate.affectedRows || 0) !== 1) {
          throw new Error(
            "Mã giảm giá vừa hết lượt sử dụng. Vui lòng chọn mã khác.",
          );
        }
      }

      // ======================================================
      // ITEMS + STOCK
      // ======================================================

      for (const item of checkoutItems) {
        await decreaseCheckoutStock(connection, item, {
          orderId,

          orderCode,
        });

        await runQuery(
          connection,
          `
            INSERT INTO order_items
            (
              order_id,

              product_id,
              variant_id,

              product_name,
              variant_name,

              sku,

              product_image,

              variant_options,

              price,
              quantity,
              total_price,

              created_at,
              updated_at
            )

            VALUES
            (
              ?,

              ?,
              ?,

              ?,
              ?,

              ?,

              ?,

              ?,

              ?,
              ?,
              ?,

              NOW(),
              NOW()
            )
          `,
          [
            orderId,

            item.product_id,

            item.variant_id,

            item.product_name,

            item.variant_name,

            item.sku,

            item.product_image,

            stringifyJson(item.variant_options),

            item.price,

            item.quantity,

            item.total_price,
          ],
        );
      }

      // ======================================================
      // PAYMENT
      // ======================================================

      await runQuery(
        connection,
        `
          INSERT INTO payments
          (
            order_id,

            payment_method,

            amount,

            transaction_code,

            paid_at,

            status,

            created_at,

            updated_at
          )

          VALUES
          (
            ?,

            ?,

            ?,

            NULL,

            NULL,

            0,

            NOW(),

            NOW()
          )
        `,
        [orderId, data.payment_method || "cod", totalAmount],
      );

      // ======================================================
      // CLEAR CART
      // ======================================================

      await runQuery(
        connection,
        `
          UPDATE cart_items

          SET
            deleted_at = NOW(),

            updated_at = NOW()

          WHERE
            cart_id = ?
            AND deleted_at IS NULL
        `,
        [cart.id],
      );

      await runQuery(
        connection,
        `
          UPDATE carts

          SET
            quantity = 0,

            total_price = 0,

            updated_at = NOW()

          WHERE id = ?
        `,
        [cart.id],
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }

    return this.getById(orderId);
  },

  // ==========================================================
  // GET BY ID
  // ==========================================================

  async getById(id) {
    const orderRows = await query(
      `
          SELECT
            o.*,

            p.payment_method,

            p.amount AS payment_amount,

            p.status AS payment_status,

            p.transaction_code,

            p.paid_at

          FROM orders o

          LEFT JOIN payments p
            ON p.id = (
              SELECT
                p2.id

              FROM payments p2

              WHERE
                p2.order_id = o.id
                AND p2.deleted_at IS NULL

              ORDER BY
                p2.id DESC

              LIMIT 1
            )

          WHERE
            o.id = ?
            AND o.deleted_at IS NULL

          LIMIT 1
        `,
      [id],
    );

    const order = orderRows[0];

    if (!order) {
      return null;
    }

    const items = await query(
      `
          SELECT
            id,

            order_id,

            product_id,

            variant_id,

            product_name,

            variant_name,

            sku,

            product_image,

            variant_options,

            price,

            quantity,

            total_price,

            created_at,

            updated_at

          FROM order_items

          WHERE
            order_id = ?
            AND deleted_at IS NULL

          ORDER BY
            id ASC
        `,
      [id],
    );

    return {
      ...order,

      id: Number(order.id),

      user_id: Number(order.user_id),

      subtotal: Number(order.subtotal || 0),

      shipping_fee: Number(order.shipping_fee || 0),

      shipping_base_fee: Number(order.shipping_base_fee || 0),

      shipping_ghn_province_id:
        order.shipping_ghn_province_id !== null &&
        order.shipping_ghn_province_id !== undefined
          ? Number(order.shipping_ghn_province_id)
          : null,

      shipping_district_id:
        order.shipping_district_id !== null &&
        order.shipping_district_id !== undefined
          ? Number(order.shipping_district_id)
          : null,

      shipping_service_id:
        order.shipping_service_id !== null &&
        order.shipping_service_id !== undefined
          ? Number(order.shipping_service_id)
          : null,

      shipping_service_type_id:
        order.shipping_service_type_id !== null &&
        order.shipping_service_type_id !== undefined
          ? Number(order.shipping_service_type_id)
          : null,

      discount_amount: Number(order.discount_amount || 0),

      coupon_id:
        order.coupon_id !== null && order.coupon_id !== undefined
          ? Number(order.coupon_id)
          : null,

      shipping_rate_id:
        order.shipping_rate_id !== null && order.shipping_rate_id !== undefined
          ? Number(order.shipping_rate_id)
          : null,

      total_amount: Number(order.total_amount || 0),

      payment_amount:
        order.payment_amount !== null && order.payment_amount !== undefined
          ? Number(order.payment_amount)
          : null,

      payment_status:
        order.payment_status !== null && order.payment_status !== undefined
          ? Number(order.payment_status)
          : null,

      items: items.map(normalizeOrderItem),
    };
  },

  // ==========================================================
  // USER ORDER DETAIL
  // ==========================================================

  async getUserOrderById({ userId, orderId }) {
    const orderRows = await query(
      `
          SELECT
            o.*,

            p.payment_method,

            p.amount AS payment_amount,

            p.status AS payment_status,

            p.transaction_code,

            p.paid_at

          FROM orders o

          LEFT JOIN payments p
            ON p.id = (
              SELECT
                p2.id

              FROM payments p2

              WHERE
                p2.order_id = o.id
                AND p2.deleted_at IS NULL

              ORDER BY
                p2.id DESC

              LIMIT 1
            )

          WHERE
            o.id = ?
            AND o.user_id = ?
            AND o.deleted_at IS NULL

          LIMIT 1
        `,
      [orderId, userId],
    );

    const order = orderRows[0];

    if (!order) {
      return null;
    }

    const fullOrder = await this.getById(orderId);

    return fullOrder;
  },

  // ==========================================================
  // USER ORDERS
  // ==========================================================

  async getUserOrders({
    userId,

    page = 1,

    limit = 10,

    status = "",

    search = "",
  }) {
    const safePage = Math.max(normalizeInt(page, 1), 1);

    const safeLimit = Math.min(Math.max(normalizeInt(limit, 10), 1), 50);

    const offset = (safePage - 1) * safeLimit;

    const { whereSql, params } = buildUserOrderConditions({
      userId,

      status,

      search,
    });

    const rows = await query(
      `
          SELECT
            o.id,

            o.user_id,

            o.order_code,

            o.subtotal,

            o.shipping_fee,

            o.shipping_base_fee,

            o.discount_amount,

            o.coupon_id,

            o.coupon_code,

            o.shipping_rate_id,

            o.shipping_provider,

            o.shipping_ghn_province_id,

            o.shipping_province_code,

            o.shipping_province_name,

            o.shipping_district_id,

            o.shipping_district_name,

            o.shipping_ward_code,

            o.shipping_ward_name,

            o.shipping_service_id,

            o.shipping_service_type_id,

            o.shipping_estimated_delivery,

            o.total_amount,

            o.shipping_name,

            o.shipping_phone,

            o.shipping_email,

            o.shipping_address,

            o.note,

            o.cancel_reason,

            o.cancelled_at,

            o.status,

            o.created_at,

            o.updated_at,

            p.payment_method,

            p.amount AS payment_amount,

            p.status AS payment_status,

            p.transaction_code,

            p.paid_at,

            COALESCE(
              item_summary.item_count,
              0
            ) AS item_count,

            COALESCE(
              item_summary.total_quantity,
              0
            ) AS total_quantity

          FROM orders o

          LEFT JOIN payments p
            ON p.id = (
              SELECT
                p2.id

              FROM payments p2

              WHERE
                p2.order_id = o.id
                AND p2.deleted_at IS NULL

              ORDER BY
                p2.id DESC

              LIMIT 1
            )

          LEFT JOIN (
            SELECT
              order_id,

              COUNT(*) AS item_count,

              SUM(quantity) AS total_quantity

            FROM order_items

            WHERE
              deleted_at IS NULL

            GROUP BY
              order_id
          ) AS item_summary
            ON item_summary.order_id = o.id

          WHERE
            ${whereSql}

          ORDER BY
            o.created_at DESC,
            o.id DESC

          LIMIT ${safeLimit}
          OFFSET ${offset}
        `,
      params,
    );

    return rows.map((item) => ({
      ...item,

      id: Number(item.id),

      user_id: Number(item.user_id),

      subtotal: Number(item.subtotal || 0),

      shipping_fee: Number(item.shipping_fee || 0),

      shipping_base_fee: Number(item.shipping_base_fee || 0),

      discount_amount: Number(item.discount_amount || 0),

      total_amount: Number(item.total_amount || 0),

      payment_amount:
        item.payment_amount !== null && item.payment_amount !== undefined
          ? Number(item.payment_amount)
          : null,

      payment_status:
        item.payment_status !== null && item.payment_status !== undefined
          ? Number(item.payment_status)
          : null,

      item_count: Number(item.item_count || 0),

      total_quantity: Number(item.total_quantity || 0),
    }));
  },

  // ==========================================================
  // COUNT
  // ==========================================================

  async countUserOrders({ userId, status = "", search = "" }) {
    const { whereSql, params } = buildUserOrderConditions({
      userId,

      status,

      search,
    });

    const rows = await query(
      `
          SELECT
            COUNT(*) AS total

          FROM orders o

          WHERE
            ${whereSql}
        `,
      params,
    );

    return normalizeInt(rows[0]?.total, 0);
  },

  // ==========================================================
  // ORDER CODE
  // ==========================================================

  async getByOrderCode(orderCode) {
    const rows = await query(
      `
          SELECT id

          FROM orders

          WHERE
            order_code = ?
            AND deleted_at IS NULL

          LIMIT 1
        `,
      [orderCode],
    );

    if (!rows[0]) {
      return null;
    }

    return this.getById(rows[0].id);
  },

  async getByUserId(userId) {
    return query(
      `
        SELECT *

        FROM orders

        WHERE
          user_id = ?
          AND deleted_at IS NULL

        ORDER BY id DESC
      `,
      [userId],
    );
  },

  // ==========================================================
  // UPDATE PAYMENT BY ORDER CODE
  // ==========================================================

  async updatePaymentStatusByOrderCode({
    order_code,

    payment_status,

    transaction_code = null,
  }) {
    const connection = await getTransactionConnection();

    let orderId = null;

    try {
      await connection.beginTransaction();

      const orderRows = await runQuery(
        connection,
        `
            SELECT
              id,
              status,
              stock_restored_at,
              coupon_restored_at

            FROM orders

            WHERE
              order_code = ?
              AND deleted_at IS NULL

            LIMIT 1

            FOR UPDATE
          `,
        [order_code],
      );

      const order = orderRows[0];

      if (!order) {
        await connection.rollback();

        return null;
      }

      orderId = Number(order.id);

      const paymentRows = await runQuery(
        connection,
        `
            SELECT
              id,
              status,
              transaction_code,
              paid_at

            FROM payments

            WHERE
              order_id = ?
              AND deleted_at IS NULL

            ORDER BY id DESC

            LIMIT 1

            FOR UPDATE
          `,
        [orderId],
      );

      const payment = paymentRows[0];

      if (!payment) {
        throw new Error("Không tìm thấy thông tin thanh toán");
      }

      const isPaid = Number(payment_status) === 1;

      if (isPaid) {
        if (String(order.status || "").toUpperCase() === "CANCELLED") {
          throw new Error("Đơn hàng đã bị hủy, không thể xác nhận thanh toán.");
        }

        await runQuery(
          connection,
          `
            UPDATE payments

            SET
              status = 1,

              transaction_code =
                COALESCE(
                  ?,
                  transaction_code
                ),

              paid_at =
                COALESCE(
                  paid_at,
                  NOW()
                ),

              updated_at = NOW()

            WHERE
              id = ?
              AND deleted_at IS NULL
          `,
          [transaction_code, payment.id],
        );

        await runQuery(
          connection,
          `
            UPDATE orders

            SET
              status =
                CASE
                  WHEN status = 'PENDING'
                  THEN 'PROCESSING'
                  ELSE status
                END,

              updated_at = NOW()

            WHERE
              id = ?
              AND deleted_at IS NULL
              AND status <> 'CANCELLED'
          `,
          [orderId],
        );

        await connection.commit();

        return this.getById(orderId);
      }

      if (Number(payment.status) === 1) {
        await connection.commit();

        return this.getById(orderId);
      }

      await runQuery(
        connection,
        `
          UPDATE payments

          SET
            status = 0,

            transaction_code =
              COALESCE(
                ?,
                transaction_code
              ),

            paid_at = NULL,

            updated_at = NOW()

          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
        [transaction_code, payment.id],
      );

      await cancelAndRestoreStockInTransaction(connection, {
        orderId,

        reason: "Thanh toán MoMo thất bại",

        allowedStatuses: ["PENDING"],
      });

      await connection.commit();

      return this.getById(orderId);
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }
  },

  // ==========================================================
  // UPDATE PAYMENT BY ORDER ID
  // ==========================================================

  async updatePaymentStatusByOrderId({
    order_id,

    payment_status,

    transaction_code = null,
  }) {
    const normalizedOrderId = normalizeInt(order_id);

    if (normalizedOrderId < 1) {
      throw new Error("Đơn hàng không hợp lệ.");
    }

    const connection = await getTransactionConnection();

    try {
      await connection.beginTransaction();

      const orderRows = await runQuery(
        connection,
        `
            SELECT
              id,
              status,
              stock_restored_at,
              coupon_restored_at

            FROM orders

            WHERE
              id = ?
              AND deleted_at IS NULL

            LIMIT 1

            FOR UPDATE
          `,
        [normalizedOrderId],
      );

      const order = orderRows[0];

      if (!order) {
        await connection.rollback();

        return null;
      }

      const paymentRows = await runQuery(
        connection,
        `
            SELECT
              id,
              status,
              transaction_code,
              paid_at

            FROM payments

            WHERE
              order_id = ?
              AND deleted_at IS NULL

            ORDER BY id DESC

            LIMIT 1

            FOR UPDATE
          `,
        [normalizedOrderId],
      );

      const payment = paymentRows[0];

      if (!payment) {
        throw new Error("Không tìm thấy thông tin thanh toán.");
      }

      const isPaid = Number(payment_status) === 1;

      if (isPaid) {
        if (String(order.status || "").toUpperCase() === "CANCELLED") {
          throw new Error("Đơn hàng đã bị hủy, không thể xác nhận thanh toán.");
        }

        await runQuery(
          connection,
          `
            UPDATE payments

            SET
              status = 1,

              transaction_code =
                COALESCE(
                  ?,
                  transaction_code
                ),

              paid_at =
                COALESCE(
                  paid_at,
                  NOW()
                ),

              updated_at = NOW()

            WHERE
              id = ?
              AND deleted_at IS NULL
          `,
          [transaction_code, payment.id],
        );

        await runQuery(
          connection,
          `
            UPDATE orders

            SET
              status =
                CASE
                  WHEN status = 'PENDING'
                  THEN 'PROCESSING'
                  ELSE status
                END,

              updated_at = NOW()

            WHERE
              id = ?
              AND deleted_at IS NULL
              AND status <> 'CANCELLED'
          `,
          [normalizedOrderId],
        );

        await connection.commit();

        return this.getById(normalizedOrderId);
      }

      if (Number(payment.status) === 1) {
        await connection.commit();

        return this.getById(normalizedOrderId);
      }

      await runQuery(
        connection,
        `
          UPDATE payments

          SET
            status = 0,

            transaction_code =
              COALESCE(
                ?,
                transaction_code
              ),

            paid_at = NULL,

            updated_at = NOW()

          WHERE
            id = ?
            AND deleted_at IS NULL
        `,
        [transaction_code, payment.id],
      );

      await cancelAndRestoreStockInTransaction(connection, {
        orderId: normalizedOrderId,

        reason: "Thanh toán thất bại",

        allowedStatuses: ["PENDING"],
      });

      await connection.commit();

      return this.getById(normalizedOrderId);
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }
  },

  // ==========================================================
  // CANCEL USER
  // ==========================================================

  async cancelByUser({ userId, orderId, reason }) {
    const normalizedUserId = normalizeInt(userId);

    const normalizedOrderId = normalizeInt(orderId);

    const normalizedReason = normalizeText(reason, 500);

    if (normalizedUserId < 1 || normalizedOrderId < 1) {
      throw new Error("Thông tin đơn hàng không hợp lệ");
    }

    if (!normalizedReason) {
      throw new Error("Vui lòng chọn lý do hủy đơn hàng");
    }

    const order = await this.getUserOrderById({
      userId: normalizedUserId,

      orderId: normalizedOrderId,
    });

    if (!order) {
      throw new Error("Không tìm thấy đơn hàng");
    }

    if (String(order.status || "").toUpperCase() !== "PENDING") {
      throw new Error("Chỉ đơn hàng đang chờ xác nhận mới được hủy");
    }

    if (Number(order.payment_status) === 1) {
      throw new Error("Đơn hàng đã thanh toán nên không thể hủy trực tiếp");
    }

    return this.cancelAndRestoreStock({
      orderId: normalizedOrderId,

      reason: normalizedReason,

      allowedStatuses: ["PENDING"],
    });
  },

  // ==========================================================
  // REORDER PREVIEW
  // ==========================================================

  async getReorderCheckoutPreview({ userId, orderId }) {
    const normalizedUserId = normalizeInt(userId);

    const normalizedOrderId = normalizeInt(orderId);

    if (normalizedUserId < 1 || normalizedOrderId < 1) {
      return null;
    }

    const sourceOrder = await this.getUserOrderById({
      userId: normalizedUserId,

      orderId: normalizedOrderId,
    });

    if (!sourceOrder) {
      return null;
    }

    if (String(sourceOrder.status || "").toUpperCase() !== "CANCELLED") {
      throw new Error("Chỉ đơn hàng đã hủy mới có thể mua lại");
    }

    const availableItems = [];

    const unavailableItems = [];

    for (const item of sourceOrder.items || []) {
      const productId = normalizeInt(item.product_id);

      const variantId = normalizeNullableInt(item.variant_id);

      const requestedQuantity = Math.max(normalizeInt(item.quantity, 0), 0);

      if (productId < 1 || requestedQuantity < 1) {
        continue;
      }

      const productRows = await query(
        `
            SELECT
              id,
              name,
              sku,
              thumbnail,
              price,
              sale_price,
              quantity,
              status

            FROM products

            WHERE
              id = ?
              AND deleted_at IS NULL

            LIMIT 1
          `,
        [productId],
      );

      const product = productRows[0];

      if (!product) {
        unavailableItems.push({
          product_id: productId,

          variant_id: variantId,

          product_name: item.product_name,

          variant_name: item.variant_name,

          requested_quantity: requestedQuantity,

          available_quantity: 0,

          reason: "Sản phẩm không còn tồn tại",
        });

        continue;
      }

      if (Number(product.status) !== 1) {
        unavailableItems.push({
          product_id: productId,

          variant_id: variantId,

          product_name: item.product_name,

          variant_name: item.variant_name,

          requested_quantity: requestedQuantity,

          available_quantity: 0,

          reason: "Sản phẩm hiện không khả dụng",
        });

        continue;
      }

      if (variantId) {
        const variantRows = await query(
          `
              SELECT
                id,
                product_id,
                sku,
                variant_name,
                price,
                sale_price,
                quantity,
                thumbnail,
                status

              FROM product_variants

              WHERE
                id = ?
                AND product_id = ?
                AND deleted_at IS NULL

              LIMIT 1
            `,
          [variantId, productId],
        );

        const variant = variantRows[0];

        if (!variant) {
          unavailableItems.push({
            product_id: productId,

            variant_id: variantId,

            product_name: item.product_name,

            variant_name: item.variant_name,

            requested_quantity: requestedQuantity,

            available_quantity: 0,

            reason: "Biến thể đã mua trước đây không còn tồn tại",
          });

          continue;
        }

        if (Number(variant.status) !== 1) {
          unavailableItems.push({
            product_id: productId,

            variant_id: variantId,

            product_name: product.name,

            variant_name: variant.variant_name,

            requested_quantity: requestedQuantity,

            available_quantity: 0,

            reason: "Biến thể hiện không khả dụng",
          });

          continue;
        }

        const stock = Math.max(Number(variant.quantity || 0), 0);

        if (stock <= 0) {
          unavailableItems.push({
            product_id: productId,

            variant_id: variantId,

            product_name: product.name,

            variant_name: variant.variant_name,

            requested_quantity: requestedQuantity,

            available_quantity: 0,

            reason: "Biến thể đã hết hàng",
          });

          continue;
        }

        const checkoutQuantity = Math.min(requestedQuantity, stock);

        const price = getFinalPrice({
          price: variant.price,

          sale_price: variant.sale_price,
        });

        const variantOptions = await getVariantOptionsSnapshot(db, variantId);

        availableItems.push({
          product_id: productId,

          variant_id: variantId,

          product_name: product.name,

          variant_name: variant.variant_name,

          sku: variant.sku,

          product_image:
            variant.thumbnail ||
            product.thumbnail ||
            item.product_image ||
            null,

          variant_options: variantOptions,

          requested_quantity: requestedQuantity,

          quantity: checkoutQuantity,

          product_stock: stock,

          price,

          final_price: price,

          total_price: price * checkoutQuantity,

          quantity_adjusted: checkoutQuantity < requestedQuantity,
        });

        if (checkoutQuantity < requestedQuantity) {
          unavailableItems.push({
            product_id: productId,

            variant_id: variantId,

            product_name: product.name,

            variant_name: variant.variant_name,

            requested_quantity: requestedQuantity,

            available_quantity: checkoutQuantity,

            reason: "Tồn kho biến thể hiện tại không đủ số lượng như đơn cũ",
          });
        }

        continue;
      }

      const stock = Math.max(Number(product.quantity || 0), 0);

      if (stock <= 0) {
        unavailableItems.push({
          product_id: productId,

          variant_id: null,

          product_name: product.name,

          requested_quantity: requestedQuantity,

          available_quantity: 0,

          reason: "Sản phẩm đã hết hàng",
        });

        continue;
      }

      const checkoutQuantity = Math.min(requestedQuantity, stock);

      const price = getFinalPrice({
        price: product.price,

        sale_price: product.sale_price,
      });

      availableItems.push({
        product_id: productId,

        variant_id: null,

        product_name: product.name,

        variant_name: null,

        sku: product.sku || item.sku || null,

        product_image: product.thumbnail || item.product_image || null,

        variant_options: [],

        requested_quantity: requestedQuantity,

        quantity: checkoutQuantity,

        product_stock: stock,

        price,

        final_price: price,

        total_price: price * checkoutQuantity,

        quantity_adjusted: checkoutQuantity < requestedQuantity,
      });

      if (checkoutQuantity < requestedQuantity) {
        unavailableItems.push({
          product_id: productId,

          variant_id: null,

          product_name: product.name,

          requested_quantity: requestedQuantity,

          available_quantity: checkoutQuantity,

          reason: "Tồn kho hiện tại không đủ số lượng như đơn cũ",
        });
      }
    }

    const subtotal = availableItems.reduce(
      (sum, item) => sum + Number(item.total_price || 0),
      0,
    );

    return {
      source_order: {
        id: sourceOrder.id,

        order_code: sourceOrder.order_code,

        status: sourceOrder.status,

        shipping_name: sourceOrder.shipping_name || "",

        shipping_phone: sourceOrder.shipping_phone || "",

        shipping_email: sourceOrder.shipping_email || "",

        shipping_address: sourceOrder.shipping_address || "",

        shipping_province_code: sourceOrder.shipping_province_code || "",

        shipping_province_name: sourceOrder.shipping_province_name || "",

        shipping_ghn_province_id: sourceOrder.shipping_ghn_province_id || null,

        shipping_district_id: sourceOrder.shipping_district_id || null,

        shipping_district_name: sourceOrder.shipping_district_name || "",

        shipping_ward_code: sourceOrder.shipping_ward_code || "",

        shipping_ward_name: sourceOrder.shipping_ward_name || "",

        note: sourceOrder.note || "",
      },

      items: availableItems,

      unavailable_items: unavailableItems,

      subtotal,
    };
  },

  // ==========================================================
  // CREATE REORDER
  // ==========================================================

  async createFromReorder(data) {
    const userId = normalizeInt(data.user_id);

    const sourceOrderId = normalizeInt(data.source_order_id);

    const provinceCode = normalizeProvinceCode(
      data.province_code || data.shipping_province_code,
    );

    const shippingDistrictId = normalizeNullableInt(data.shipping_district_id);

    const shippingWardCode = normalizeWardCode(data.shipping_ward_code);

    const couponCode = normalizeCouponCode(data.coupon_code);

    if (userId < 1 || sourceOrderId < 1) {
      throw new Error("Thông tin mua lại không hợp lệ");
    }

    if (!provinceCode) {
      throw new Error("Vui lòng chọn tỉnh / thành phố nhận hàng.");
    }

    if (!shippingDistrictId) {
      throw new Error("Vui lòng chọn quận / huyện nhận hàng.");
    }

    if (!shippingWardCode) {
      throw new Error("Vui lòng chọn phường / xã nhận hàng.");
    }

    const preview = await this.getReorderCheckoutPreview({
      userId,

      orderId: sourceOrderId,
    });

    if (!preview) {
      throw new Error("Không tìm thấy đơn hàng");
    }

    if (!Array.isArray(preview.items) || preview.items.length === 0) {
      throw new Error("Không có sản phẩm nào còn khả dụng để mua lại");
    }
    const connection = await getTransactionConnection();

    let newOrderId = null;

    try {
      await connection.beginTransaction();

      const sourceOrderRows = await runQuery(
        connection,
        `
            SELECT
              id,
              user_id,
              order_code,
              status

            FROM orders

            WHERE
              id = ?
              AND user_id = ?
              AND deleted_at IS NULL

            LIMIT 1

            FOR UPDATE
          `,
        [sourceOrderId, userId],
      );

      const sourceOrder = sourceOrderRows[0];

      if (!sourceOrder) {
        throw new Error("Không tìm thấy đơn hàng cần mua lại");
      }

      if (String(sourceOrder.status || "").toUpperCase() !== "CANCELLED") {
        throw new Error("Chỉ đơn hàng đã hủy mới có thể mua lại");
      }

      const checkoutItems = [];

      for (const previewItem of preview.items) {
        const normalized = await normalizeCartCheckoutItem(connection, {
          product_id: previewItem.product_id,

          variant_id: previewItem.variant_id,

          quantity: previewItem.quantity,
        });

        checkoutItems.push(normalized);
      }

      if (checkoutItems.length === 0) {
        throw new Error("Không có sản phẩm nào còn khả dụng để mua lại");
      }

      const subtotal = checkoutItems.reduce(
        (sum, item) => sum + Number(item.total_price || 0),
        0,
      );

      const couponResult = await resolveCouponForCheckout(connection, {
        couponCode,

        subtotal,
      });

      const discountAmount = Number(couponResult.discount_amount || 0);

      const shippingResult = await resolveShippingForCheckout(connection, {
        provinceCode,

        districtId: shippingDistrictId,

        wardCode: shippingWardCode,

        subtotal,

        discountAmount,

        paymentMethod: data.payment_method,
      });

      const shippingFee = Number(shippingResult.shipping_fee || 0);

      const totalAmount = Math.max(subtotal + shippingFee - discountAmount, 0);

      const orderCode = generateOrderCode();

      newOrderId = await insertOrder(connection, {
        userId,

        orderCode,

        subtotal,

        discountAmount,

        couponResult,

        shippingResult,

        totalAmount,

        data,
      });

      if (!newOrderId) {
        throw new Error("Không tạo được đơn mua lại");
      }

      if (couponResult.coupon_id) {
        const couponUpdate = await runQuery(
          connection,
          `
              UPDATE coupons

              SET
                used_count = used_count + 1

              WHERE
                id = ?
                AND status = 1
                AND used_count < quantity
            `,
          [couponResult.coupon_id],
        );

        if (Number(couponUpdate.affectedRows || 0) !== 1) {
          throw new Error(
            "Mã giảm giá vừa hết lượt sử dụng. Vui lòng chọn mã khác.",
          );
        }
      }

      for (const item of checkoutItems) {
        await decreaseCheckoutStock(connection, item, {
          orderId: newOrderId,

          orderCode,
        });

        await runQuery(
          connection,
          `
            INSERT INTO order_items
            (
              order_id,

              product_id,

              variant_id,

              product_name,

              variant_name,

              sku,

              product_image,

              variant_options,

              price,

              quantity,

              total_price,

              created_at,

              updated_at
            )

            VALUES
            (
              ?,

              ?,

              ?,

              ?,

              ?,

              ?,

              ?,

              ?,

              ?,

              ?,

              ?,

              NOW(),

              NOW()
            )
          `,
          [
            newOrderId,

            item.product_id,

            item.variant_id,

            item.product_name,

            item.variant_name,

            item.sku,

            item.product_image,

            stringifyJson(item.variant_options),

            item.price,

            item.quantity,

            item.total_price,
          ],
        );
      }

      await runQuery(
        connection,
        `
          INSERT INTO payments
          (
            order_id,

            payment_method,

            amount,

            transaction_code,

            paid_at,

            status,

            created_at,

            updated_at
          )

          VALUES
          (
            ?,

            ?,

            ?,

            NULL,

            NULL,

            0,

            NOW(),

            NOW()
          )
        `,
        [newOrderId, data.payment_method || "cod", totalAmount],
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }

    return this.getById(newOrderId);
  },

  // ==========================================================
  // BANK INFO
  // ==========================================================

  async getBankInfo(orderId) {
    const order = await this.getById(orderId);

    if (!order) {
      return null;
    }

    return {
      order,

      bank: {
        bank_name: process.env.BANK_NAME || "MB Bank",

        account_number: process.env.BANK_ACCOUNT_NUMBER || "0123456789",

        account_name: process.env.BANK_ACCOUNT_NAME || "BUILDPC",

        branch: process.env.BANK_BRANCH || "Can Tho",

        transfer_content: order.order_code,

        amount: order.total_amount,
      },
    };
  },

  // ==========================================================
  // CANCEL + RESTORE
  // ==========================================================

  async cancelAndRestoreStock({
    orderId,

    reason = null,

    allowedStatuses = ["PENDING", "PROCESSING"],
  }) {
    const normalizedOrderId = normalizeInt(orderId);

    if (normalizedOrderId < 1) {
      throw new Error("Đơn hàng không hợp lệ");
    }

    const connection = await getTransactionConnection();

    try {
      await connection.beginTransaction();

      await cancelAndRestoreStockInTransaction(connection, {
        orderId: normalizedOrderId,

        reason,

        allowedStatuses,
      });

      await connection.commit();
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }

    return this.getById(normalizedOrderId);
  },
};

module.exports = Order;
