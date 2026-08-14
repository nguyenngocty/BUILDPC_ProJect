const Banner = require("../../models/Banner");

const getUploadedImagePath = (req) => {
  if (!req.file) return null;
  return `/uploads/banners/${req.file.filename}`;
};

const emptyToNull = (value) => {
  if (value === undefined || value === null) return null;

  const text = String(value).trim();

  return text === "" ? null : text;
};

const normalizePosition = (value = "HOME") => {
  const position = String(value || "HOME").toUpperCase();

  if (["HOME", "BLOG"].includes(position)) {
    return position;
  }

  return "HOME";
};

const isInvalidDateRange = (startAt, endAt) => {
  if (!startAt || !endAt) return false;
  return new Date(startAt).getTime() > new Date(endAt).getTime();
};

const isInvalidLink = (link) => {
  if (!link) return false;

  return !(
    link.startsWith("/") ||
    link.startsWith("http://") ||
    link.startsWith("https://")
  );
};

const normalizeOverlayOpacity = (value) => {
  if (value === undefined || value === null || value === "") return 0.65;

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return 0.65;
  if (numberValue < 0) return 0;
  if (numberValue > 1) return 1;

  return numberValue;
};

const buildBannerData = (req, imageUrl = null) => {
  return {
    position: normalizePosition(req.body.position),

    title: emptyToNull(req.body.title),
    subtitle: emptyToNull(req.body.subtitle),
    description: emptyToNull(req.body.description),
    badge_text: emptyToNull(req.body.badge_text),

    image_url: imageUrl || emptyToNull(req.body.image_url),
    link_url: emptyToNull(req.body.link_url),

    primary_button_text: emptyToNull(req.body.primary_button_text),
    secondary_button_text: emptyToNull(req.body.secondary_button_text),

    text_color: emptyToNull(req.body.text_color),
    highlight_color: emptyToNull(req.body.highlight_color),
    overlay_opacity: normalizeOverlayOpacity(req.body.overlay_opacity),

    display_order: req.body.display_order,
    start_at: emptyToNull(req.body.start_at),
    end_at: emptyToNull(req.body.end_at),
    status: req.body.status,
  };
};

const validateBannerData = (data, isCreate = true) => {
  if (!["HOME", "BLOG"].includes(normalizePosition(data.position))) {
    return "Vị trí hiển thị không hợp lệ";
  }

  if (!data.title) {
    return "Vui lòng nhập tiêu đề banner";
  }

  if (data.title.length < 3) {
    return "Tiêu đề banner phải có ít nhất 3 ký tự";
  }

  if (isCreate && !data.image_url) {
    return "Vui lòng tải ảnh banner hoặc truyền image_url";
  }

  if (isInvalidLink(data.link_url)) {
    return "Liên kết banner phải bắt đầu bằng / hoặc http:// hoặc https://";
  }

  if (isInvalidDateRange(data.start_at, data.end_at)) {
    return "Thời gian bắt đầu không được lớn hơn thời gian kết thúc";
  }

  return null;
};

exports.getBanners = async (req, res, next) => {
  try {
    const result = await Banner.getAll(req.query);

    res.json({
      success: true,
      message: "Lấy danh sách banner thành công",
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

exports.getBannerById = async (req, res, next) => {
  try {
    const banner = await Banner.getById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy banner",
      });
    }

    res.json({
      success: true,
      message: "Lấy chi tiết banner thành công",
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

exports.createBanner = async (req, res, next) => {
  try {
    const imageUrl = getUploadedImagePath(req);
    const data = buildBannerData(req, imageUrl);

    const errorMessage = validateBannerData(data, true);

    if (errorMessage) {
      return res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }

    const banner = await Banner.create(data);

    res.status(201).json({
      success: true,
      message: "Thêm banner thành công",
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateBanner = async (req, res, next) => {
  try {
    const currentBanner = await Banner.getById(req.params.id);

    if (!currentBanner) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy banner",
      });
    }

    const uploadedImageUrl = getUploadedImagePath(req);
    const updateData = buildBannerData(req, uploadedImageUrl);

    if (!uploadedImageUrl && !req.body.image_url) {
      delete updateData.image_url;
    }

    const mergedData = {
      ...currentBanner,
      ...updateData,
      image_url: updateData.image_url || currentBanner.image_url,
    };

    const errorMessage = validateBannerData(mergedData, false);

    if (errorMessage) {
      return res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }

    const banner = await Banner.update(req.params.id, updateData);

    res.json({
      success: true,
      message: "Cập nhật banner thành công",
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.getById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy banner",
      });
    }

    await Banner.remove(req.params.id);

    res.json({
      success: true,
      message: "Xóa banner thành công",
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleBannerStatus = async (req, res, next) => {
  try {
    const banner = await Banner.getById(req.params.id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy banner",
      });
    }

    const updatedBanner = await Banner.update(req.params.id, {
      status: Number(banner.status) === 1 ? 0 : 1,
    });

    res.json({
      success: true,
      message:
        Number(updatedBanner.status) === 1 ? "Đã bật banner" : "Đã tắt banner",
      data: updatedBanner,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateBannerSortOrder = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "items phải là mảng [{ id, display_order }]",
      });
    }

    await Banner.updateSortOrder(items);

    res.json({
      success: true,
      message: "Sắp xếp banner thành công",
    });
  } catch (error) {
    next(error);
  }
};