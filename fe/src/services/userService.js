import api from "./api";

const userService = {
  async getUsers(params = {}, signal) {
    const response = await api.get("/admin/users", { params, signal });
    return response.data;
  },
  async getUserById(userId, signal) {
    const response = await api.get(`/admin/users/${userId}`, { signal });
    return response.data;
  },
  async createUser(payload) {
    const response = await api.post("/admin/users", payload);
    return response.data;
  },
  async updateUser(userId, payload) {
    const response = await api.put(`/admin/users/${userId}`, payload);
    return response.data;
  },
  async updateRole(userId, role) {
    const response = await api.patch(`/admin/users/${userId}/role`, { role });
    return response.data;
  },
  async updateStatus(userId, status) {
    const response = await api.patch(`/admin/users/${userId}/status`, { status });
    return response.data;
  },
  async deleteUser(userId) {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },
};

export default userService;