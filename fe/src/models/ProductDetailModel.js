const productDetailModel = {
  id: 1,
  name: "Intel Core i7-14700K",
  brand: "Intel",

  price: "11.990.000đ",
  oldPrice: "13.490.000đ",
  discount: "1.500.000đ",

  rating: 4.5,
  reviewCount: 125,

  images: [
    "https://images.unsplash.com/photo-1587202372775-e229f172b9d7",
    "https://images.unsplash.com/photo-1555617981-dac3880eac6e",
    "https://images.unsplash.com/photo-1518770660439-4636190af475",
  ],

  benefits: [
    "Miễn phí giao hàng toàn quốc",
    "Bảo hành chính hãng 36 tháng",
    "Đổi trả trong 30 ngày",
  ],

  description: `
CPU Intel Core i7-14700K thuộc thế hệ Raptor Lake Refresh,
tối ưu hiệu năng đơn nhân và đa nhân, phù hợp gaming và workstation.
  `,

  specs: [
    { label: "Socket", value: "LGA 1700" },
    { label: "Số nhân", value: "20 cores" },
    { label: "Số luồng", value: "28 threads" },
    { label: "TDP", value: "125W" },
    { label: "Xung nhịp", value: "5.6GHz" },
  ],

  reviews: [
    {
      name: "Nguyễn A",
      rating: 5,
      comment: "Hiệu năng mạnh, chạy render rất ổn.",
    },
    {
      name: "Trần B",
      rating: 4,
      comment: "Giá hơi cao nhưng đáng tiền.",
    },
  ],
};

export default productDetailModel;

const relatedProducts = [
  {
    id: 2,
    name: "Intel Core i5-14600K",
    price: "7.990.000đ",
    image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7",
    brand: "Intel",
  },
  {
    id: 3,
    name: "AMD Ryzen 7 7800X3D",
    price: "10.490.000đ",
    image: "https://images.unsplash.com/photo-1555617981-dac3880eac6e",
    brand: "AMD",
  },
  {
    id: 4,
    name: "Intel Core i9-14900K",
    price: "14.990.000đ",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475",
    brand: "Intel",
  },
  {
    id: 5,
    name: "AMD Ryzen 5 7600X",
    price: "6.990.000đ",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
    brand: "AMD",
  },
];

export { relatedProducts };
