import api from "../api";

const dashboardService = {
  async getSummary(range = "7d", signal) {
    const response = await api.get("/admin/dashboard/summary", {
      params: {
        range,
      },
      signal,
    });

    return response.data;
  },
};

export default dashboardService;