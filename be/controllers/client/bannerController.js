const Banner = require("../../models/Banner");

exports.getActiveBanners = async (req, res, next) => {
  try {
    const { position = "" } = req.query;

    const banners = await Banner.getActive(position);

    res.json({
      success: true,
      message: "Lấy danh sách banner client thành công",
      data: banners,
    });
  } catch (error) {
    next(error);
  }
};