import axiosClient from "./axiosClient";

const API = "/admin/brands";

const brandService = {
  getAll() {
    return axiosClient.get(API);
  },
};

export default brandService;
