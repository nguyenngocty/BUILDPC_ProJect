const PcPartType = require("../../models/PcPartType");

exports.getPcPartTypes = async (req, res, next) => {
  try {
    const data = await PcPartType.getActive();

    res.json({
      success: true,
      message: "Lấy danh sách loại linh kiện thành công",
      data,
    });
  } catch (error) {
    next(error);
  }
};