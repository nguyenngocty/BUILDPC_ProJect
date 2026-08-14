const https = require("https");

const LOCATION_API_URL =
  process.env.LOCATION_API_URL ||
  "https://provinces.open-api.vn/api/v2/";

const CACHE_TTL = 24 * 60 * 60 * 1000;
const provinceCache = new Map();

function normalizeLocationName(value) {
  return String(value || "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi");
}

function isValidLocationCode(value) {
  return /^\d{1,10}$/.test(
    String(value || "").trim()
  );
}

function isValidLocationName(value) {
  const name = String(value || "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");

  if (name.length < 2 || name.length > 150) {
    return false;
  }

  /*
    Từ chối ký tự điều khiển. Vẫn cho phép tiếng Việt,
    dấu nháy, dấu gạch ngang và tên có chữ số.
  */
  return !/[\u0000-\u001F\u007F]/.test(name);
}

function buildApiUrl(relativePath) {
  const baseUrl = LOCATION_API_URL.endsWith("/")
    ? LOCATION_API_URL
    : `${LOCATION_API_URL}/`;

  const safePath = String(relativePath || "")
    .replace(/^\/+/, "");

  return new URL(safePath, baseUrl);
}

function requestJson(relativePath) {
  const url = buildApiUrl(relativePath);

  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "DATN-Profile-Service/1.0",
        },
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => {
          chunks.push(chunk);
        });

        response.on("end", () => {
          const body = Buffer.concat(chunks).toString(
            "utf8"
          );

          if (
            response.statusCode < 200 ||
            response.statusCode >= 300
          ) {
            const error = new Error(
              `Dịch vụ địa chỉ trả về mã ${response.statusCode}.`
            );

            error.code =
              "LOCATION_SERVICE_UNAVAILABLE";

            error.statusCode =
              response.statusCode;

            error.requestUrl = url.toString();

            reject(error);
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch (parseError) {
            const error = new Error(
              "Không thể đọc dữ liệu địa chỉ hành chính."
            );

            error.code =
              "LOCATION_SERVICE_UNAVAILABLE";

            error.requestUrl = url.toString();
            error.cause = parseError;

            reject(error);
          }
        });
      }
    );

    request.setTimeout(10000, () => {
      const timeoutError = new Error(
        "Dịch vụ địa chỉ phản hồi quá chậm."
      );

      timeoutError.code =
        "LOCATION_SERVICE_UNAVAILABLE";

      timeoutError.requestUrl = url.toString();

      request.destroy(timeoutError);
    });

    request.on("error", (requestError) => {
      if (
        requestError.code ===
        "LOCATION_SERVICE_UNAVAILABLE"
      ) {
        reject(requestError);
        return;
      }

      const error = new Error(
        "Không thể kết nối dịch vụ địa chỉ hành chính."
      );

      error.code =
        "LOCATION_SERVICE_UNAVAILABLE";

      error.requestUrl = url.toString();
      error.cause = requestError;

      reject(error);
    });
  });
}

async function getWardsByProvince(provinceCode) {
  const response = await requestJson(
    `w/?p=${encodeURIComponent(provinceCode)}`
  );

  return Array.isArray(response)
    ? response
    : [];
}

async function getProvinceWithWards(provinceCode) {
  const normalizedCode = String(
    provinceCode || ""
  ).trim();

  const cached = provinceCache.get(normalizedCode);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const province = await requestJson(
    `p/${encodeURIComponent(
      normalizedCode
    )}?depth=2`
  );

  if (!province) {
    return null;
  }

  let wards = Array.isArray(province.wards)
    ? province.wards
    : [];

  /*
    Dự phòng khi endpoint chi tiết tỉnh không trả wards.
  */
  if (wards.length === 0) {
    wards = await getWardsByProvince(
      normalizedCode
    );
  }

  const normalizedProvince = {
    ...province,
    wards,
  };

  provinceCache.set(normalizedCode, {
    data: normalizedProvince,
    expiresAt: Date.now() + CACHE_TTL,
  });

  return normalizedProvince;
}

function validateBasicAddress({
  provinceCode,
  provinceName,
  wardCode,
  wardName,
}) {
  const normalizedProvinceCode = String(
    provinceCode || ""
  ).trim();

  const normalizedProvinceName = String(
    provinceName || ""
  )
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");

  const normalizedWardCode = String(
    wardCode || ""
  ).trim();

  const normalizedWardName = String(
    wardName || ""
  )
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");

  if (
    !isValidLocationCode(normalizedProvinceCode)
  ) {
    return {
      valid: false,
      message:
        "Mã Tỉnh/Thành phố không hợp lệ.",
    };
  }

  if (
    !isValidLocationName(normalizedProvinceName)
  ) {
    return {
      valid: false,
      message:
        "Tên Tỉnh/Thành phố không hợp lệ.",
    };
  }

  if (!isValidLocationCode(normalizedWardCode)) {
    return {
      valid: false,
      message:
        "Mã Phường/Xã không hợp lệ.",
    };
  }

  if (!isValidLocationName(normalizedWardName)) {
    return {
      valid: false,
      message:
        "Tên Phường/Xã không hợp lệ.",
    };
  }

  return {
    valid: true,
    provinceCode: normalizedProvinceCode,
    provinceName: normalizedProvinceName,
    wardCode: normalizedWardCode,
    wardName: normalizedWardName,
  };
}

async function validateAdministrativeAddress({
  provinceCode,
  provinceName,
  wardCode,
  wardName,
}) {
  const basicResult = validateBasicAddress({
    provinceCode,
    provinceName,
    wardCode,
    wardName,
  });

  if (!basicResult.valid) {
    return basicResult;
  }

  try {
    const province = await getProvinceWithWards(
      basicResult.provinceCode
    );

    if (
      !province ||
      String(province.code) !==
        basicResult.provinceCode
    ) {
      return {
        valid: false,
        message:
          "Tỉnh/Thành phố đã chọn không tồn tại.",
      };
    }

    if (
      normalizeLocationName(province.name) !==
      normalizeLocationName(
        basicResult.provinceName
      )
    ) {
      return {
        valid: false,
        message:
          "Tên Tỉnh/Thành phố không khớp với mã đã chọn.",
      };
    }

    const wards = Array.isArray(province.wards)
      ? province.wards
      : [];

    const ward = wards.find(
      (item) =>
        String(item.code) ===
        basicResult.wardCode
    );

    if (!ward) {
      return {
        valid: false,
        message:
          "Phường/Xã không tồn tại hoặc không thuộc Tỉnh/Thành phố đã chọn.",
      };
    }

    if (
      normalizeLocationName(ward.name) !==
      normalizeLocationName(
        basicResult.wardName
      )
    ) {
      return {
        valid: false,
        message:
          "Tên Phường/Xã không khớp với mã đã chọn.",
      };
    }

    return {
      valid: true,
      verified: true,
      provinceCode: String(province.code),
      provinceName: province.name,
      wardCode: String(ward.code),
      wardName: ward.name,
    };
  } catch (error) {
    /*
      Không khóa chức năng lưu hồ sơ chỉ vì API bên thứ ba
      tạm thời lỗi. Các trường vẫn đã được backend kiểm tra
      bắt buộc, độ dài và định dạng mã/tên ở phía trên.
    */
    console.warn(
      "[location] Không thể xác minh trực tuyến, dùng validation dự phòng:",
      {
        message: error?.message,
        code: error?.code,
        statusCode: error?.statusCode,
        requestUrl: error?.requestUrl,
      }
    );

    return {
      ...basicResult,
      verified: false,
    };
  }
}

module.exports = {
  validateAdministrativeAddress,
};