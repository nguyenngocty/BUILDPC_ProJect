const PcPart = require("../../models/PcPart");

const normalizePayload = (body) => {
  const data = { ...body };

  ["type_id", "product_id", "is_visible"].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field) && data[field] !== "") {
      data[field] = Number(data[field]);
    }
  });

  if (Object.prototype.hasOwnProperty.call(data, "specifications")) {
    data.specifications = PcPart.normalizeSpecifications(data.specifications);
  }

  return data;
};

const validatePayload = async (data, isUpdate = false) => {
  if (!isUpdate || Object.prototype.hasOwnProperty.call(data, "type_id")) {
    if (!Number.isInteger(data.type_id) || data.type_id <= 0) return "type_id không hợp lệ";
    if (!(await PcPart.existsType(data.type_id))) return "Loại linh kiện không tồn tại";
  }

  if (!isUpdate || Object.prototype.hasOwnProperty.call(data, "product_id")) {
    if (!Number.isInteger(data.product_id) || data.product_id <= 0) return "product_id không hợp lệ";
    if (!(await PcPart.existsProduct(data.product_id))) return "Sản phẩm không tồn tại";
  }

  if (!isUpdate || Object.prototype.hasOwnProperty.call(data, "is_visible")) {
    if (![0, 1].includes(Number(data.is_visible))) return "is_visible phải là 0 hoặc 1";
  }

  if (Object.prototype.hasOwnProperty.call(data, "specifications") && data.specifications !== null) {
    if (typeof data.specifications === "string") {
      try {
        JSON.parse(data.specifications);
      } catch (error) {
        return "specifications phải là JSON hợp lệ";
      }
    }
  }

  return null;
};

exports.getAllPcParts = async (req, res, next) => {
  try {
    const result = await PcPart.getAll(req.query);

    res.json({
      success: true,
      message: "Lấy danh sách linh kiện thành công",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

exports.getPcPartById = async (req, res, next) => {
  try {
    const item = await PcPart.getById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: "Không tìm thấy linh kiện" });
    }

    res.json({ success: true, message: "Lấy chi tiết linh kiện thành công", data: item });
  } catch (error) {
    next(error);
  }
};

exports.createPcPart = async (req, res, next) => {
  try {
    const data = normalizePayload(req.body);
    const validationMessage = await validatePayload(data);

    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }

    const item = await PcPart.create({
      type_id: data.type_id,
      product_id: data.product_id,
      specifications: data.specifications || null,
      is_visible: data.is_visible === undefined ? 1 : Number(data.is_visible),
    });

    res.status(201).json({ success: true, message: "Thêm linh kiện thành công", data: item });
  } catch (error) {
    next(error);
  }
};

exports.updatePcPart = async (req, res, next) => {
  try {
    const current = await PcPart.getById(req.params.id);

    if (!current) {
      return res.status(404).json({ success: false, message: "Không tìm thấy linh kiện" });
    }

    const data = normalizePayload(req.body);
    const validationMessage = await validatePayload(data, true);

    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }

    const item = await PcPart.update(req.params.id, data);

    res.json({ success: true, message: "Cập nhật linh kiện thành công", data: item });
  } catch (error) {
    next(error);
  }
};

exports.deletePcPart = async (req, res, next) => {
  try {
    const current = await PcPart.getById(req.params.id);

    if (!current) {
      return res.status(404).json({ success: false, message: "Không tìm thấy linh kiện" });
    }

    await PcPart.remove(req.params.id);

    res.json({ success: true, message: "Xóa linh kiện thành công" });
  } catch (error) {
    next(error);
  }
};