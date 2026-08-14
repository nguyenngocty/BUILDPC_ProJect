const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const Order = require("../models/Order");
const { pool } = require("../config/database");

async function main() {
  const orderCode = process.argv[2];
  const result = process.argv[3];

  if (!orderCode) {
    throw new Error(
      "Thiếu orderCode. Ví dụ: node scripts/testMomoCallback.js ORD123 fail",
    );
  }

  if (!["success", "fail"].includes(result)) {
    throw new Error('Trạng thái phải là "success" hoặc "fail".');
  }

  const paymentStatus = result === "success" ? 1 : 0;

  const order = await Order.updatePaymentStatusByOrderCode({
    order_code: orderCode,
    payment_status: paymentStatus,
    transaction_code:
      result === "success"
        ? `TEST_SUCCESS_${Date.now()}`
        : `TEST_FAIL_${Date.now()}`,
  });

  console.log("=== KẾT QUẢ ===");

  console.log({
    id: order?.id,
    order_code: order?.order_code,
    status: order?.status,
    payment_status: order?.payment_status,
    transaction_code: order?.transaction_code,
    stock_restored_at: order?.stock_restored_at,
    cancel_reason: order?.cancel_reason,
    cancelled_at: order?.cancelled_at,
  });
}

main()
  .catch((error) => {
    console.error("❌ TEST ERROR:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
