const ShippingRate = require("../../models/ShippingRate");

// ======================================================
// HELPERS
// ======================================================

const hasOwn = (object, key) => {
  return Object.prototype.hasOwnProperty.call(
    object,
    key,
  );
};

const normalizeProvinceCode = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
};

const normalizeProvinceName = (value) => {
  return String(value || "").trim();
};

const normalizeMoney = (
  value,
  defaultValue = 0,
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return defaultValue;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : defaultValue;
};

const normalizeStatus = (
  value,
  defaultValue = 1,
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return defaultValue;
  }

  return Number(value);
};

// ======================================================
// NORMALIZE PAYLOAD
// ======================================================

const normalizeShippingRatePayload = (
  body = {},
  { partial = false } = {},
) => {
  const data = {};

  // -----------------------------
  // PROVINCE CODE
  // -----------------------------
  if (
    !partial ||
    hasOwn(body, "province_code")
  ) {
    data.province_code =
      normalizeProvinceCode(
        body.province_code,
      );
  }

  // -----------------------------
  // PROVINCE NAME
  // -----------------------------
  if (
    !partial ||
    hasOwn(body, "province_name")
  ) {
    data.province_name =
      normalizeProvinceName(
        body.province_name,
      );
  }

  // -----------------------------
  // SHIPPING FEE
  // -----------------------------
  if (
    !partial ||
    hasOwn(body, "shipping_fee")
  ) {
    data.shipping_fee =
      normalizeMoney(
        body.shipping_fee,
        0,
      );
  }

  // -----------------------------
  // FREE SHIPPING MIN
  // -----------------------------
  if (
    !partial ||
    hasOwn(
      body,
      "free_shipping_min",
    )
  ) {
    if (
      body.free_shipping_min === null ||
      body.free_shipping_min ===
        undefined ||
      body.free_shipping_min === ""
    ) {
      data.free_shipping_min = null;
    } else {
      data.free_shipping_min =
        normalizeMoney(
          body.free_shipping_min,
          0,
        );
    }
  }

  // -----------------------------
  // STATUS
  // -----------------------------
  if (
    !partial ||
    hasOwn(body, "status")
  ) {
    data.status =
      normalizeStatus(
        body.status,
        1,
      );
  }

  return data;
};

// ======================================================
// VALIDATION
// ======================================================

const validateShippingRate = (
  data,
  { partial = false } = {},
) => {
  const errors = [];

  // ====================================================
  // PROVINCE CODE
  // ====================================================
  if (
    !partial ||
    hasOwn(data, "province_code")
  ) {
    if (!data.province_code) {
      errors.push(
        "Mã tỉnh/thành không được để trống",
      );
    } else {
      const codeRegex =
        /^[A-Z0-9_]+$/;

      if (
        !codeRegex.test(
          data.province_code,
        )
      ) {
        errors.push(
          "Mã tỉnh/thành chỉ được chứa chữ in hoa, số và dấu gạch dưới",
        );
      }

      if (
        data.province_code.length >
        50
      ) {
        errors.push(
          "Mã tỉnh/thành không được vượt quá 50 ký tự",
        );
      }
    }
  }

  // ====================================================
  // PROVINCE NAME
  // ====================================================
  if (
    !partial ||
    hasOwn(data, "province_name")
  ) {
    if (!data.province_name) {
      errors.push(
        "Tên tỉnh/thành không được để trống",
      );
    } else if (
      data.province_name.length >
      150
    ) {
      errors.push(
        "Tên tỉnh/thành không được vượt quá 150 ký tự",
      );
    }
  }

  // ====================================================
  // SHIPPING FEE
  // ====================================================
  if (
    !partial ||
    hasOwn(data, "shipping_fee")
  ) {
    if (
      !Number.isFinite(
        Number(data.shipping_fee),
      )
    ) {
      errors.push(
        "Phí vận chuyển không hợp lệ",
      );
    } else if (
      Number(data.shipping_fee) < 0
    ) {
      errors.push(
        "Phí vận chuyển không được nhỏ hơn 0",
      );
    }
  }

  // ====================================================
  // FREE SHIPPING MIN
  // ====================================================
  if (
    hasOwn(
      data,
      "free_shipping_min",
    ) &&
    data.free_shipping_min !== null
  ) {
    if (
      !Number.isFinite(
        Number(
          data.free_shipping_min,
        ),
      )
    ) {
      errors.push(
        "Mức miễn phí vận chuyển không hợp lệ",
      );
    } else if (
      Number(
        data.free_shipping_min,
      ) < 0
    ) {
      errors.push(
        "Mức miễn phí vận chuyển không được nhỏ hơn 0",
      );
    }
  }

  // ====================================================
  // STATUS
  // ====================================================
  if (
    !partial ||
    hasOwn(data, "status")
  ) {
    if (
      ![0, 1].includes(
        Number(data.status),
      )
    ) {
      errors.push(
        "Trạng thái chỉ được là 0 hoặc 1",
      );
    }
  }

  return errors;
};

// ======================================================
// GET ALL
// GET /admin/shipping-rates
// ======================================================

exports.getAllShippingRates = async (
  req,
  res,
  next,
) => {
  try {
    const result =
      await ShippingRate.getAll({
        keyword:
          req.query.keyword || "",

        status:
          req.query.status ?? "",

        page:
          req.query.page || 1,

        limit:
          req.query.limit || 10,
      });

    return res.json({
      success: true,
      message:
        "Lấy danh sách phí vận chuyển thành công",
      data: result.data,
      pagination:
        result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// GET BY ID
// GET /admin/shipping-rates/:id
// ======================================================

exports.getShippingRateById = async (
  req,
  res,
  next,
) => {
  try {
    const shippingRate =
      await ShippingRate.getById(
        req.params.id,
      );

    if (!shippingRate) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy khu vực vận chuyển",
      });
    }

    return res.json({
      success: true,
      data: shippingRate,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// CREATE
// POST /admin/shipping-rates
// ======================================================

exports.createShippingRate = async (
  req,
  res,
  next,
) => {
  try {
    const data =
      normalizeShippingRatePayload(
        req.body,
      );

    // -----------------------------
    // VALIDATE
    // -----------------------------
    const errors =
      validateShippingRate(data);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors,
      });
    }

    // -----------------------------
    // CHECK DUPLICATE CODE
    // -----------------------------
    const existing =
      await ShippingRate.getByProvinceCodeIncludingDeleted(
        data.province_code,
      );

    if (existing) {
      // Nếu đã tồn tại và chưa bị xóa
      if (!existing.deleted_at) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "Mã tỉnh/thành này đã tồn tại",
          });
      }

      // Nếu record trước đó đã bị xóa mềm
      // thì khôi phục lại record thay vì INSERT
      // để tránh lỗi UNIQUE province_code.
      await ShippingRate.restore(
        existing.id,
      );

      const restored =
        await ShippingRate.update(
          existing.id,
          data,
        );

      return res.status(201).json({
        success: true,
        message:
          "Thêm khu vực vận chuyển thành công",
        data: restored,
      });
    }

    // -----------------------------
    // CREATE
    // -----------------------------
    const created =
      await ShippingRate.create(
        data,
      );

    return res.status(201).json({
      success: true,
      message:
        "Thêm khu vực vận chuyển thành công",
      data: created,
    });
  } catch (error) {
    // MySQL duplicate key fallback
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message:
          "Mã tỉnh/thành này đã tồn tại",
      });
    }

    next(error);
  }
};

// ======================================================
// UPDATE
// PATCH /admin/shipping-rates/:id
// ======================================================

exports.updateShippingRate = async (
  req,
  res,
  next,
) => {
  try {
    // -----------------------------
    // CHECK EXIST
    // -----------------------------
    const current =
      await ShippingRate.getById(
        req.params.id,
      );

    if (!current) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy khu vực vận chuyển",
      });
    }

    // -----------------------------
    // NORMALIZE
    // -----------------------------
    const data =
      normalizeShippingRatePayload(
        req.body,
        {
          partial: true,
        },
      );

    if (
      Object.keys(data).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Không có dữ liệu để cập nhật",
      });
    }

    // -----------------------------
    // VALIDATE
    // -----------------------------
    const errors =
      validateShippingRate(
        data,
        {
          partial: true,
        },
      );

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors,
      });
    }

    // -----------------------------
    // CHECK DUPLICATE CODE
    // -----------------------------
    if (
      hasOwn(
        data,
        "province_code",
      )
    ) {
      const duplicate =
        await ShippingRate.getByProvinceCodeIncludingDeleted(
          data.province_code,
        );

      if (
        duplicate &&
        Number(duplicate.id) !==
          Number(current.id)
      ) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              "Mã tỉnh/thành này đã được sử dụng",
          });
      }
    }

    // -----------------------------
    // UPDATE
    // -----------------------------
    const updated =
      await ShippingRate.update(
        req.params.id,
        data,
      );

    return res.json({
      success: true,
      message:
        "Cập nhật phí vận chuyển thành công",
      data: updated,
    });
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message:
          "Mã tỉnh/thành này đã tồn tại",
      });
    }

    next(error);
  }
};

// ======================================================
// UPDATE STATUS
// PATCH /admin/shipping-rates/:id/status
// ======================================================

exports.updateShippingRateStatus =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const current =
        await ShippingRate.getById(
          req.params.id,
        );

      if (!current) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Không tìm thấy khu vực vận chuyển",
          });
      }

      const status = Number(
        req.body?.status,
      );

      if (
        ![0, 1].includes(status)
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Trạng thái chỉ được là 0 hoặc 1",
          });
      }

      const updated =
        await ShippingRate.updateStatus(
          req.params.id,
          status,
        );

      return res.json({
        success: true,

        message:
          status === 1
            ? "Đã bật khu vực vận chuyển"
            : "Đã tắt khu vực vận chuyển",

        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

// ======================================================
// DELETE
// DELETE /admin/shipping-rates/:id
// ======================================================

exports.deleteShippingRate = async (
  req,
  res,
  next,
) => {
  try {
    const current =
      await ShippingRate.getById(
        req.params.id,
      );

    if (!current) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy khu vực vận chuyển",
      });
    }

    await ShippingRate.remove(
      req.params.id,
    );

    return res.json({
      success: true,
      message:
        "Xóa khu vực vận chuyển thành công",
    });
  } catch (error) {
    next(error);
  }
};