const PcPartType = require("../../models/PcPartType");

// ============================================================
// GET BUILD PC PART TYPES
//
// GET /api/client/builds/part-types
//
// Trả về 8 nhóm linh kiện đang tồn tại:
// CPU
// MAINBOARD
// RAM
// VGA
// COOLING
// PSU
// STORAGE
// CASE
// ============================================================

exports.getPcPartTypes = async (req, res, next) => {
  try {
    const data = await PcPartType.getActive();

    const normalizedData = data.map((item) => ({
      ...item,

      id: Number(item.id),

      type_code: String(item.type_code || "")
        .trim()
        .toUpperCase(),

      type_name: item.type_name || "",
    }));

    return res.status(200).json({
      success: true,

      message: "Lấy danh sách nhóm linh kiện Build PC thành công",

      data: normalizedData,

      total: normalizedData.length,
    });
  } catch (error) {
    next(error);
  }
};
