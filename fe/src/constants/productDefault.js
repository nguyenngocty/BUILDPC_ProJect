export const createEmptySpecification = () => ({
  spec_key: "",
  spec_value: "",
});

export const createEmptyOptionValue = () => ({
  value: "",
  label: "",
  color_code: null,
  sort_order: 0,
});

export const createEmptyProductOption = () => ({
  name: "",
  code: "",
  display_type: "button",
  sort_order: 0,
  values: [createEmptyOptionValue()],
});

export const createEmptyVariant = () => ({
  id: null,

  sku: "",

  variant_name: "",

  price: "",

  sale_price: "",

  quantity: 0,

  thumbnail: null,

  status: 1,

  is_default: 0,

  sort_order: 0,

  values: {},

  images: [],
});

export const defaultProduct = {
  name: "",

  sku: "",

  category_id: "",

  brand_id: "",

  price: "",

  sale_price: "",

  quantity: 0,

  status: 1,

  socket: "",

  ram_type: "",

  short_description: "",

  description: "",

  thumbnail: null,

  gallery: [],

  specifications: [],

  options: [],

  variants: [],

  has_variants: false,
};

export const createDefaultProduct = () => ({
  ...defaultProduct,

  gallery: [],

  specifications: [],

  options: [],

  variants: [],
});
