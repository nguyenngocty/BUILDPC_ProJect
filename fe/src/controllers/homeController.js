import { products } from "../models/ProductModel";
import { categories } from "../models/CategoryModel";
import { builds } from "../models/BuildModel";

export function getHomeData() {
  return {
    products,
    categories,
    builds,
  };
}