const PcPartType = require("../../models/PcPartType");

const normalizePayload = (body = {}) => {
  const data = { ...body };

  if (
    Object.prototype.hasOwnProperty.call(data, "type_code") &&
    data.type_code != null
  ) {
    data.type_code = String(data.type_code).trim().toUpperCase();
  }

  if (
    Object.prototype.hasOwnProperty.call(data, "type_name") &&
    data.type_name != null
  ) {
    data.type_name = String(data.type_name).trim();
  }

  if (Object.prototype.hasOwnProperty.call(data, "description")) {
    if (data.description === "" || data.description === null) {
      data.description = null;
    } else {
      data.description = String(data.description).trim();
    }
  }

  return data;
};

// ============================================================
// GET ALL
// ============================================================

exports.getAllPcPartTypes = async (req, res, next) => {
  try {
    const result = await PcPartType.getAll(req.query);

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách loại linh kiện thành công",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET ACTIVE
// ============================================================

exports.getActivePcPartTypes = async (req, res, next) => {
  try {
    const data = await PcPartType.getActive();

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách loại linh kiện đang hoạt động thành công",
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET BY ID
// ============================================================

exports.getPcPartTypeById = async (req, res, next) => {
  try {
    const item = await PcPartType.getById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy loại linh kiện",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết loại linh kiện thành công",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// CREATE
// ============================================================

exports.createPcPartType = async (req, res, next) => {
  try {
    const data = normalizePayload(req.body);

    if (!data.type_code) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập mã loại linh kiện",
      });
    }

    if (!data.type_name) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập tên loại linh kiện",
      });
    }

    const existing = await PcPartType.getByCode(data.type_code);

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Mã loại linh kiện đã tồn tại",
      });
    }

    const item = await PcPartType.create({
      type_code: data.type_code,
      type_name: data.type_name,
      description: data.description || null,
    });

    return res.status(201).json({
      success: true,
      message: "Thêm loại linh kiện thành công",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE
// ============================================================

exports.updatePcPartType = async (req, res, next) => {
  try {
    const current = await PcPartType.getById(req.params.id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy loại linh kiện",
      });
    }

    const data = normalizePayload(req.body);

    if (
      Object.prototype.hasOwnProperty.call(data, "type_code") &&
      !data.type_code
    ) {
      return res.status(400).json({
        success: false,
        message: "Mã loại linh kiện không hợp lệ",
      });
    }

    if (
      Object.prototype.hasOwnProperty.call(data, "type_name") &&
      !data.type_name
    ) {
      return res.status(400).json({
        success: false,
        message: "Tên loại linh kiện không hợp lệ",
      });
    }

    if (data.type_code) {
      const existing = await PcPartType.getByCode(data.type_code);

      if (existing && String(existing.id) !== String(req.params.id)) {
        return res.status(409).json({
          success: false,
          message: "Mã loại linh kiện đã tồn tại",
        });
      }
    }

    const item = await PcPartType.update(req.params.id, data);

    return res.status(200).json({
      success: true,
      message: "Cập nhật loại linh kiện thành công",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE
// ============================================================

exports.deletePcPartType = async (req, res, next) => {
  try {
    const current = await PcPartType.getById(req.params.id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy loại linh kiện",
      });
    }

    await PcPartType.remove(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Xóa loại linh kiện thành công",
    });
  } catch (error) {
    next(error);
  }
};
