export const ORDER_STATUS_OPTIONS = [
  {
    value: "",
    label: "Tất cả trạng thái",
  },
  {
    value: "PENDING",
    label: "Chờ xác nhận",
  },
  {
    value: "PROCESSING",
    label: "Đang xử lý",
  },
  {
    value: "SHIPPING",
    label: "Đang giao",
  },
  {
    value: "COMPLETED",
    label: "Hoàn thành",
  },
  {
    value: "CANCELLED",
    label: "Đã hủy",
  },
];

const ORDER_STATUS_META = {
  PENDING: {
    label: "Chờ xác nhận",
    className: "pending",
  },

  PROCESSING: {
    label: "Đang xử lý",
    className: "processing",
  },

  SHIPPING: {
    label: "Đang giao",
    className: "shipping",
  },

  COMPLETED: {
    label: "Hoàn thành",
    className: "completed",
  },

  CANCELLED: {
    label: "Đã hủy",
    className: "cancelled",
  },
};

const PAYMENT_METHOD_LABELS = {
  cod: "Thanh toán khi nhận hàng",
  bank: "Chuyển khoản ngân hàng",
  momo: "Ví MoMo",
};

export function getOrderStatusMeta(
  status
) {
  const normalized = String(
    status || ""
  )
    .trim()
    .toUpperCase();

  return (
    ORDER_STATUS_META[normalized] || {
      label:
        normalized ||
        "Không xác định",

      className:
        "unknown",
    }
  );
}

export function getPaymentMethodLabel(
  method
) {
  const normalized = String(
    method || ""
  )
    .trim()
    .toLowerCase();

  return (
    PAYMENT_METHOD_LABELS[normalized] ||
    "Chưa xác định"
  );
}

export function getPaymentStatusMeta(
  status
) {
  const paid =
    Number(status) === 1;

  return paid
    ? {
        label: "Đã thanh toán",
        className: "paid",
      }
    : {
        label: "Chưa thanh toán",
        className: "unpaid",
      };
}

export function formatOrderCurrency(
  value
) {
  const amount =
    Number(value || 0);

  return new Intl.NumberFormat(
    "vi-VN",
    {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }
  ).format(amount);
}

export function formatOrderDateTime(
  value
) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "--";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date);
}

export function normalizeOrderQuery(
  filters = {}
) {
  const page = Math.max(
    Number.parseInt(
      filters.page,
      10
    ) || 1,
    1
  );

  const limit = Math.min(
    Math.max(
      Number.parseInt(
        filters.limit,
        10
      ) || 10,
      1
    ),
    50
  );

  const status = String(
    filters.status || ""
  )
    .trim()
    .toUpperCase();

  const search = String(
    filters.search || ""
  )
    .trim()
    .slice(0, 100);

  return {
    page,
    limit,
    ...(status
      ? {
          status,
        }
      : {}),
    ...(search
      ? {
          search,
        }
      : {}),
  };
}

export function normalizeOrderListResponse(
  payload
) {
  const source =
    payload?.data &&
    !Array.isArray(payload.data)
      ? payload.data
      : payload;

  const orders = Array.isArray(
    source?.orders
  )
    ? source.orders
    : Array.isArray(source)
      ? source
      : [];

  const pagination =
    source?.pagination || {};

  return {
    orders,

    pagination: {
      page:
        Number(
          pagination.page
        ) || 1,

      limit:
        Number(
          pagination.limit
        ) || 10,

      totalItems:
        Number(
          pagination.totalItems
        ) || 0,

      totalPages:
        Number(
          pagination.totalPages
        ) || 0,

      hasPreviousPage:
        Boolean(
          pagination.hasPreviousPage
        ),

      hasNextPage:
        Boolean(
          pagination.hasNextPage
        ),
    },
  };
}

export function normalizeOrderDetailResponse(
  payload
) {
  const order =
    payload?.data &&
    !Array.isArray(payload.data)
      ? payload.data
      : payload;

  return {
    ...(order || {}),
    items:
      Array.isArray(order?.items)
        ? order.items
        : [],
  };
}

export function resolveOrderImageUrl(
  image
) {
  const source = String(
    image || ""
  ).trim();

  if (!source) {
    return "";
  }

  if (
    /^(https?:)?\/\//i.test(source) ||
    source.startsWith("data:") ||
    source.startsWith("blob:")
  ) {
    return source;
  }

  const apiUrl =
    process.env.REACT_APP_API_URL ||
    "http://localhost:5000/api";

  const serverUrl =
    apiUrl.replace(
      /\/api\/?$/i,
      ""
    );

  return `${serverUrl}/${source.replace(
    /^\/+/,
    ""
  )}`;
}