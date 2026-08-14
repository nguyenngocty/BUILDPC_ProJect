const ShippingRate = require("../../models/ShippingRate");

// ======================================================
// HELPERS
// ======================================================

const normalizeMoney = (value) => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  return Math.max(numberValue, 0);
};

const normalizeProvinceCode = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase();
};

// ======================================================
// GET ACTIVE SHIPPING RATES
// GET /client/shipping/rates
//
// Dùng cho Checkout:
// lấy danh sách tỉnh / thành phố đang hoạt động.
// ======================================================

exports.getActiveShippingRates = async (
  req,
  res,
  next,
) => {
  try {
    const shippingRates =
      await ShippingRate.getActiveList();

    const data = shippingRates.map(
      (item) => ({
        id: item.id,

        province_code:
          item.province_code,

        province_name:
          item.province_name,

        shipping_fee: normalizeMoney(
          item.shipping_fee,
        ),

        free_shipping_min:
          item.free_shipping_min ===
            null ||
          item.free_shipping_min ===
            undefined
            ? null
            : normalizeMoney(
                item.free_shipping_min,
              ),
      }),
    );

    return res.json({
      success: true,

      message:
        "Lấy danh sách khu vực vận chuyển thành công",

      data,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// CALCULATE SHIPPING
// POST /client/shipping/calculate
//
// Body:
// {
//   "province_code": "CAN_THO",
//   "subtotal": 1950000
// }
// ======================================================

exports.calculateShippingFee = async (
  req,
  res,
  next,
) => {
  try {
    const provinceCode =
      normalizeProvinceCode(
        req.body?.province_code,
      );

    const subtotal = normalizeMoney(
      req.body?.subtotal,
    );

    // ==================================================
    // VALIDATE PROVINCE
    // ==================================================
    if (!provinceCode) {
      return res.status(400).json({
        success: false,

        message:
          "Vui lòng chọn tỉnh / thành phố nhận hàng",
      });
    }

    // ==================================================
    // VALIDATE SUBTOTAL
    // ==================================================
    if (subtotal <= 0) {
      return res.status(400).json({
        success: false,

        message:
          "Giá trị giỏ hàng không hợp lệ",
      });
    }

    // ==================================================
    // FIND ACTIVE SHIPPING RATE
    // ==================================================
    const shippingRate =
      await ShippingRate.getActiveByProvinceCode(
        provinceCode,
      );

    if (!shippingRate) {
      return res.status(404).json({
        success: false,

        message:
          "Khu vực này hiện chưa được hỗ trợ vận chuyển",
      });
    }

    // ==================================================
    // SHIPPING INFORMATION
    // ==================================================
    const baseShippingFee =
      normalizeMoney(
        shippingRate.shipping_fee,
      );

    const freeShippingMin =
      shippingRate.free_shipping_min ===
        null ||
      shippingRate.free_shipping_min ===
        undefined
        ? null
        : normalizeMoney(
            shippingRate.free_shipping_min,
          );

    // ==================================================
    // FREE SHIPPING
    // ==================================================
    let shippingFee =
      baseShippingFee;

    let isFreeShipping = false;

    if (
      freeShippingMin !== null &&
      subtotal >= freeShippingMin
    ) {
      shippingFee = 0;
      isFreeShipping = true;
    }

    // ==================================================
    // AMOUNT LEFT TO FREE SHIPPING
    // ==================================================
    let amountToFreeShipping = null;

    if (
      freeShippingMin !== null &&
      subtotal < freeShippingMin
    ) {
      amountToFreeShipping =
        Math.max(
          freeShippingMin - subtotal,
          0,
        );
    }

    // ==================================================
    // RESPONSE
    // ==================================================
    return res.json({
      success: true,

      message:
        "Tính phí vận chuyển thành công",

      data: {
        id:
          shippingRate.id,

        province_code:
          shippingRate.province_code,

        province_name:
          shippingRate.province_name,

        subtotal,

        base_shipping_fee:
          baseShippingFee,

        shipping_fee:
          shippingFee,

        free_shipping_min:
          freeShippingMin,

        is_free_shipping:
          isFreeShipping,

        amount_to_free_shipping:
          amountToFreeShipping,
      },
    });
  } catch (error) {
    next(error);
  }
};