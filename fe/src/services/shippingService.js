import api from "./api";

const shippingService = {
    // =====================================================
    // ADMIN
    // =====================================================

    // GET /api/admin/shipping-rates
    // Lấy danh sách phí vận chuyển cho Admin
    getAll: (params = {}) => {
        return api.get("/admin/shipping-rates", {
            params,
        });
    },

    // GET /api/admin/shipping-rates/:id
    // Lấy chi tiết một khu vực
    getById: (id) => {
        return api.get(
            `/admin/shipping-rates/${id}`,
        );
    },

    // POST /api/admin/shipping-rates
    // Thêm khu vực vận chuyển mới
    create: (data) => {
        return api.post(
            "/admin/shipping-rates",
            data,
        );
    },

    // PATCH /api/admin/shipping-rates/:id
    // Cập nhật phí vận chuyển
    update: (id, data) => {
        return api.patch(
            `/admin/shipping-rates/${id}`,
            data,
        );
    },

    // PATCH /api/admin/shipping-rates/:id/status
    // Bật / tắt khu vực vận chuyển
    updateStatus: (id, status) => {
        return api.patch(
            `/admin/shipping-rates/${id}/status`,
            {
                status,
            },
        );
    },

    // DELETE /api/admin/shipping-rates/:id
    // Xóa mềm khu vực vận chuyển
    remove: (id) => {
        return api.delete(
            `/admin/shipping-rates/${id}`,
        );
    },

    // =====================================================
    // CLIENT
    // =====================================================

    // GET /api/client/shipping/rates
    // Checkout dùng để lấy danh sách tỉnh/thành
    // đang được Admin bật
    getActiveRates: () => {
        return api.get(
            "/client/shipping/rates",
        );
    },

    // POST /api/client/shipping/calculate
    // Tính phí vận chuyển theo tỉnh/thành + subtotal
    calculate: ({
        province_code,
        subtotal,
    }) => {
        return api.post(
            "/client/shipping/calculate",
            {
                province_code,
                subtotal,
            },
        );
    },
};

export default shippingService;