import {
  getOrderStatusMeta,
} from "../../../models/OrderModel";

function OrderStatusBadge({
  status,
}) {
  const meta =
    getOrderStatusMeta(status);

  return (
    <span
      className={`order-status-badge ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export default OrderStatusBadge;