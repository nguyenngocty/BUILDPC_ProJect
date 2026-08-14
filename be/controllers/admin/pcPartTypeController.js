const PcPartType = require("../../models/PcPartType");

const normalizePayload = (body) => {
  const data = { ...body };

  if (Object.prototype.hasOwnProperty.call(data, "type_code") && data.type_code != null) {
    data.type_code = String(data.type_code).trim().toLowerCase();
  }

  if (Object.prototype.hasOwnProperty.call(data, "type_name") && data.type_name != null) {
    data.type_name = String(data.type_name).trim();
  }

  if (Object.prototype.hasOwnProperty.call(data, "description") && data.description === "") {
    data.description = null;
  }

  return data;
};

exports.getAllPcPartTypes = async (req, res, next) => {
  try {
    const result = await PcPartType.getAll(req.query);

    res.json({
      success: true,
      message: "Lấy danh sách loại linh kiện thành công",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

exports.getPcPartTypeById = async (req, res, next) => {
  try {
    const item = await PcPartType.getById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: "Không tìm thấy loại linh kiện" });
    }

    res.json({ success: true, message: "Lấy chi tiết loại linh kiện thành công", data: item });
  } catch (error) {
    next(error);
  }
};

exports.createPcPartType = async (req, res, next) => {
  try {
    const data = normalizePayload(req.body);

    if (!data.type_code || !data.type_code.trim()) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập mã loại linh kiện" });
    }

    if (!data.type_name || !data.type_name.trim()) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập tên loại linh kiện" });
    }

    const existing = await PcPartType.getByCode(data.type_code);
    if (existing) {
      return res.status(409).json({ success: false, message: "Mã loại linh kiện đã tồn tại" });
    }

    const item = await PcPartType.create({
      type_code: data.type_code,
      type_name: data.type_name,
      description: data.description || null,
    });

    res.status(201).json({ success: true, message: "Thêm loại linh kiện thành công", data: item });
  } catch (error) {
    next(error);
  }
};

exports.updatePcPartType = async (req, res, next) => {
  try {
    const current = await PcPartType.getById(req.params.id);

    if (!current) {
      return res.status(404).json({ success: false, message: "Không tìm thấy loại linh kiện" });
    }

    const data = normalizePayload(req.body);

    if (Object.prototype.hasOwnProperty.call(data, "type_code") && !data.type_code) {
      return res.status(400).json({ success: false, message: "Mã loại linh kiện không hợp lệ" });
    }

    if (Object.prototype.hasOwnProperty.call(data, "type_name") && !data.type_name) {
      return res.status(400).json({ success: false, message: "Tên loại linh kiện không hợp lệ" });
    }

    if (data.type_code) {
      const existing = await PcPartType.getByCode(data.type_code);
      if (existing && String(existing.id) !== String(req.params.id)) {
        return res.status(409).json({ success: false, message: "Mã loại linh kiện đã tồn tại" });
      }
    }

    const item = await PcPartType.update(req.params.id, data);

    res.json({ success: true, message: "Cập nhật loại linh kiện thành công", data: item });
  } catch (error) {
    next(error);
  }
};

exports.deletePcPartType = async (req, res, next) => {
  try {
    const current = await PcPartType.getById(req.params.id);

    if (!current) {
      return res.status(404).json({ success: false, message: "Không tìm thấy loại linh kiện" });
    }

    await PcPartType.remove(req.params.id);

    res.json({ success: true, message: "Xóa loại linh kiện thành công" });
  } catch (error) {
    next(error);
  }
};