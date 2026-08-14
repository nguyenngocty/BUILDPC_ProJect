import axios from "axios";

const LOCATION_API_URL =
  process.env.REACT_APP_LOCATION_API_URL ||
  "https://provinces.open-api.vn/api/v2";

const locationApi = axios.create({
  baseURL: LOCATION_API_URL,
  timeout: 15000,
});

let provinceCache = null;
const wardCache = new Map();

function sortByVietnameseName(items = []) {
  return [...items].sort((first, second) =>
    String(first?.name || "").localeCompare(
      String(second?.name || ""),
      "vi"
    )
  );
}

async function getProvinces() {
  if (provinceCache) {
    return provinceCache;
  }

  const response = await locationApi.get("/");
  const provinces = Array.isArray(response.data)
    ? response.data
    : [];

  provinceCache = sortByVietnameseName(
    provinces.map((province) => ({
      code: String(province.code),
      name: province.name,
      divisionType: province.division_type,
    }))
  );

  return provinceCache;
}

async function getWardsByProvince(provinceCode) {
  const normalizedCode = String(provinceCode || "").trim();

  if (!normalizedCode) {
    return [];
  }

  if (wardCache.has(normalizedCode)) {
    return wardCache.get(normalizedCode);
  }

  const response = await locationApi.get(
    `/p/${encodeURIComponent(normalizedCode)}`,
    {
      params: { depth: 2 },
    }
  );

  const wards = Array.isArray(response.data?.wards)
    ? response.data.wards
    : [];

  const normalizedWards = sortByVietnameseName(
    wards.map((ward) => ({
      code: String(ward.code),
      name: ward.name,
      provinceCode: String(
        ward.province_code || normalizedCode
      ),
      divisionType: ward.division_type,
    }))
  );

  wardCache.set(normalizedCode, normalizedWards);

  return normalizedWards;
}

function clearLocationCache() {
  provinceCache = null;
  wardCache.clear();
}

const locationService = {
  getProvinces,
  getWardsByProvince,
  clearLocationCache,
};

export default locationService;