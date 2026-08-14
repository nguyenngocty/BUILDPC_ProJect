import orderService from "../services/orderService";

import {
  normalizeOrderDetailResponse,
  normalizeOrderListResponse,
  normalizeOrderQuery,
} from "../models/OrderModel";

const getErrorMessage = (
  error,
  fallback
) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const normalizeOrderId = (id) => {
  const orderId =
    Number.parseInt(id, 10);

  if (
    Number.isNaN(orderId) ||
    orderId < 1
  ) {
    throw new Error(
      "Mã đơn hàng không hợp lệ."
    );
  }

  return orderId;
};

export async function getClientOrders(
  filters = {}
) {
  try {
    const params =
      normalizeOrderQuery(filters);

    const response =
      await orderService.getClientOrders(
        params
      );

    return normalizeOrderListResponse(
      response.data?.data ||
        response.data
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Không thể tải danh sách đơn hàng."
      )
    );
  }
}

export async function getClientOrderById(
  id
) {
  const orderId =
    normalizeOrderId(id);

  try {
    const response =
      await orderService.getClientOrderById(
        orderId
      );

    return normalizeOrderDetailResponse(
      response.data?.data ||
        response.data
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Không thể tải chi tiết đơn hàng."
      )
    );
  }
}

export async function cancelClientOrder(
  id,
  reason
) {
  const orderId =
    normalizeOrderId(id);

  const normalizedReason =
    String(reason || "")
      .trim()
      .slice(0, 500);

  if (!normalizedReason) {
    throw new Error(
      "Vui lòng nhập lý do hủy đơn hàng."
    );
  }

  try {
    const response =
      await orderService.cancelClientOrder(
        orderId,
        normalizedReason
      );

    return {
      message:
        response.data?.message ||
        "Hủy đơn hàng thành công.",

      order:
        normalizeOrderDetailResponse(
          response.data?.data ||
            {}
        ),
    };
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Không thể hủy đơn hàng."
      )
    );
  }
}

export async function getReorderCheckout(
  id
) {
  const orderId =
    normalizeOrderId(id);

  try {
    const response =
      await orderService.getReorderCheckout(
        orderId
      );

    return (
      response.data?.data ||
      response.data ||
      {}
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Không thể tải thông tin mua lại."
      )
    );
  }
}

export async function createReorderCheckout(
  id,
  data
) {
  const orderId =
    normalizeOrderId(id);

  try {
    const response =
      await orderService.createReorderCheckout(
        orderId,
        data
      );

    return {
      message:
        response.data?.message ||
        "Đặt lại đơn hàng thành công.",

      data:
        response.data?.data ||
        {},
    };
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Không thể đặt lại đơn hàng."
      )
    );
  }
}