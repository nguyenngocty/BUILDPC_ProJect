import productDetailModel, {
  relatedProducts,
} from "../models/ProductDetailModel";

export const getProductDetail = () => {
  return productDetailModel;
};

export const getRelatedProducts = () => {
  return relatedProducts;
};
