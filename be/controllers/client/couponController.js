const Coupon = require(
  "../../models/Coupon",
);

const normalizeMoney = (value) => {
  const numberValue =
    Number(value);

  if (
    !Number.isFinite(
      numberValue,
    )
  ) {
    return 0;
  }

  return Math.max(
    numberValue,
    0,
  );
};

const normalizeDateOnly = (
  value,
) => {
  if (!value) {
    return null;
  }

  if (
    typeof value ===
    "string"
  ) {
    return value.slice(
      0,
      10,
    );
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    );

  return formatter.format(
    date,
  );
};

const getVietnamToday =
  () => {
    const formatter =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            "Asia/Ho_Chi_Minh",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        },
      );

    return formatter.format(
      new Date(),
    );
  };

const calculateDiscount = (
  coupon,
  subtotal,
) => {
  const value =
    normalizeMoney(
      coupon.value,
    );

  let discountAmount = 0;

  if (
    coupon.type ===
    "percent"
  ) {
    discountAmount =
      Math.round(
        (subtotal * value) /
        100,
      );
  } else if (
    coupon.type ===
    "fixed"
  ) {
    discountAmount =
      value;
  }

  return Math.min(
    discountAmount,
    subtotal,
  );
};

exports.getAvailableCoupons =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const subtotal =
        normalizeMoney(
          req.query
            ?.subtotal,
        );

      const coupons =
        await Coupon.getAvailableCandidates();

      const today =
        getVietnamToday();

      const data = coupons
        .filter(
          (coupon) => {
            const startDate =
              normalizeDateOnly(
                coupon.start_date,
              );

            const endDate =
              normalizeDateOnly(
                coupon.end_date,
              );

            if (
              startDate &&
              today <
              startDate
            ) {
              return false;
            }

            if (
              endDate &&
              today >
              endDate
            ) {
              return false;
            }

            return true;
          },
        )
        .map(
          (coupon) => {
            const value =
              normalizeMoney(
                coupon.value,
              );

            const minOrder =
              normalizeMoney(
                coupon.min_order,
              );

            const quantity =
              Number(
                coupon.quantity ||
                0,
              );

            const usedCount =
              Number(
                coupon.used_count ||
                0,
              );

            const eligible =
              subtotal > 0 &&
              subtotal >=
              minOrder;

            const discountAmount =
              eligible
                ? calculateDiscount(
                  coupon,
                  subtotal,
                )
                : 0;

            return {
              id:
                coupon.id,

              code:
                coupon.code,

              type:
                coupon.type,

              value,

              min_order:
                minOrder,

              start_date:
                normalizeDateOnly(
                  coupon.start_date,
                ),

              end_date:
                normalizeDateOnly(
                  coupon.end_date,
                ),

              quantity,

              used_count:
                usedCount,

              remaining:
                Math.max(
                  quantity -
                  usedCount,
                  0,
                ),

              eligible,

              amount_to_min_order:
                eligible
                  ? 0
                  : Math.max(
                    minOrder -
                    subtotal,
                    0,
                  ),

              discount_amount:
                discountAmount,
            };
          },
        );

      return res.json({
        success: true,

        message:
          "Lấy danh sách mã giảm giá khả dụng thành công",

        data,
      });
    } catch (error) {
      next(error);
    }
  };

exports.validateCoupon =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const code =
        String(
          req.body?.code ||
          "",
        )
          .trim()
          .toUpperCase();

      const subtotal =
        normalizeMoney(
          req.body
            ?.subtotal,
        );

      if (!code) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Vui lòng nhập mã giảm giá",
          });
      }

      if (subtotal <= 0) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Giỏ hàng không hợp lệ để áp dụng mã giảm giá",
          });
      }

      const coupon =
        await Coupon.getByCode(
          code,
        );

      if (!coupon) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Mã giảm giá không tồn tại",
          });
      }

      if (
        Number(
          coupon.status,
        ) !== 1
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Mã giảm giá hiện đang tạm tắt",
          });
      }

      const today =
        getVietnamToday();

      const startDate =
        normalizeDateOnly(
          coupon.start_date,
        );

      const endDate =
        normalizeDateOnly(
          coupon.end_date,
        );

      if (
        startDate &&
        today < startDate
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              `Mã giảm giá chưa có hiệu lực. Bắt đầu từ ${startDate}`,
          });
      }

      if (
        endDate &&
        today > endDate
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Mã giảm giá đã hết hạn",
          });
      }

      const quantity =
        Number(
          coupon.quantity ||
          0,
        );

      const usedCount =
        Number(
          coupon.used_count ||
          0,
        );

      if (
        quantity <= 0 ||
        usedCount >=
        quantity
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Mã giảm giá đã hết lượt sử dụng",
          });
      }

      const minOrder =
        normalizeMoney(
          coupon.min_order,
        );

      if (
        subtotal <
        minOrder
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              `Đơn hàng tối thiểu để dùng mã này là ${Math.round(
                minOrder,
              ).toLocaleString(
                "vi-VN",
              )}đ`,
          });
      }

      const value =
        normalizeMoney(
          coupon.value,
        );

      if (
        coupon.type !==
        "percent" &&
        coupon.type !==
        "fixed"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Loại mã giảm giá không hợp lệ",
          });
      }

      const discountAmount =
        calculateDiscount(
          coupon,
          subtotal,
        );

      const totalAfterDiscount =
        Math.max(
          subtotal -
          discountAmount,
          0,
        );

      return res.json({
        success: true,

        message:
          "Áp dụng mã giảm giá thành công",

        data: {
          id:
            coupon.id,

          code:
            coupon.code,

          type:
            coupon.type,

          value,

          min_order:
            minOrder,

          start_date:
            startDate,

          end_date:
            endDate,

          quantity,

          used_count:
            usedCount,

          remaining:
            Math.max(
              quantity -
              usedCount,
              0,
            ),

          subtotal,

          discount_amount:
            discountAmount,

          total_after_discount:
            totalAfterDiscount,
        },
      });
    } catch (error) {
      next(error);
    }
  };