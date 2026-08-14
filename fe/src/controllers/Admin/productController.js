import ProductModel from "../../models/Admin/ProductModel";
import { getProducts } from "../../services/productService";

export const fetchProducts = async (params) => {
  const response = await getProducts(params);

  return {
    products: ProductModel.normalize(response.data),
    pagination: response.pagination,
  };
};