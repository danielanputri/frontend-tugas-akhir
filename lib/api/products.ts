import apiClient from "./axiosInstance";
import type { Product, PaginatedResponse } from "@/types";

export interface ProductFilter {
  search?: string;
  limit?: number;
}

export const getProducts = async (
  filter?: ProductFilter,
): Promise<PaginatedResponse<Product>> => {
  const params = new URLSearchParams();

  if (filter?.search) params.append("search", filter.search);
  if (filter?.limit) params.append("limit", String(filter.limit));

  const query = params.toString();
  const response = await apiClient.get<PaginatedResponse<Product>>(
    `/products${query ? `?${query}` : ""}`,
  );

  return response.data;
};

export const getProductsWithModels = async (): Promise<Product[]> => {
  const response = await getProducts({ limit: 100 });
  return response.data.filter((p) => p.has_model === true);
};
