class ProductModel {
  static normalize(products = []) {
    return products.map((item) => ({
      ...item,
      finalPrice:
        Number(item.sale_price) > 0
          ? Number(item.sale_price)
          : Number(item.price),

      priceText: Number(item.price).toLocaleString("vi-VN") + "đ",

      salePriceText:
        Number(item.sale_price) > 0
          ? Number(item.sale_price).toLocaleString("vi-VN") + "đ"
          : null,

      quantityText: item.quantity.toLocaleString("vi-VN"),

      soldText: item.sold.toLocaleString("vi-VN"),
    }));
  }
}

export default ProductModel;
