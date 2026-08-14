const PcPart = require("../../models/PcPart");

exports.getPcParts = async (req, res, next) => {
  try {
    const result = await PcPart.getAll({ ...req.query, is_visible: req.query.is_visible || 1 });

    res.json({
      success: true,
      message: "Lấy danh sách linh kiện thành công",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

exports.getPcPartsByType = async (req, res, next) => {
  try {
    const data = await PcPart.getVisibleByType(req.params.typeId);

    res.json({
      success: true,
      message: "Lấy danh sách linh kiện theo loại thành công",
      data,
    });
  } catch (error) {
    next(error);
  }
};