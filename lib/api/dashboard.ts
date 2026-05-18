import apiClient from "./axiosInstance";
import type {
  DashboardSummary,
  ChartData,
  ChartFilter,
  StockStatus,
  StockStatusFilter,
  ChartComparisonItem,
  ChartComparisonFilter,
  ApiResponse,
  PaginatedResponse,
} from "@/types";

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const response =
    await apiClient.get<ApiResponse<DashboardSummary>>("/dashboard/summary");
  return response.data.data;
};

export const getSuppliers = async (): Promise<string[]> => {
  const response = await apiClient.get<ApiResponse<string[]>>("/dashboard/suppliers");
  return response.data.data;
};

export const getChartData = async (filter: ChartFilter): Promise<ChartData> => {
  const params = new URLSearchParams();
  params.append("kode_produk", filter.kode_produk);

  if (filter.bulan_historis) {
    params.append("bulan_historis", String(filter.bulan_historis));
  }

  const response = await apiClient.get<ApiResponse<ChartData>>(
    `/dashboard/chart?${params.toString()}`,
  );

  return response.data.data;
};

/**
 * Urgency logic (backend-computed):
 *  - critical : qty_terkini < 50 % of prediction
 *  - warning  : 50 % ≤ qty_terkini < 80 % of prediction
 *  - safe     : qty_terkini ≥ 80 % of prediction
 */
export const getStockStatus = async (
  filter?: StockStatusFilter,
): Promise<PaginatedResponse<StockStatus>> => {
  const params = new URLSearchParams();

  if (filter?.limit) params.append("limit", String(filter.limit));
  if (filter?.page) params.append("page", String(filter.page));
  if (filter?.sort_by) params.append("sort_by", filter.sort_by);
  if (filter?.order) params.append("order", filter.order);
  if (filter?.search) params.append("search", filter.search);
  if (filter?.supplier) params.append("supplier", filter.supplier);

  const query = params.toString();
  const response = await apiClient.get<PaginatedResponse<StockStatus>>(
    `/dashboard/stock-status${query ? `?${query}` : ""}`,
  );

  return response.data;
};

export const getChartComparison = async (
  filter: ChartComparisonFilter,
): Promise<ChartComparisonItem[]> => {
  const params = new URLSearchParams();
  params.append("kode_produk", filter.kode_produk);

  if (filter.bulan_historis) {
    params.append("bulan_historis", String(filter.bulan_historis));
  }

  const response = await apiClient.get<ApiResponse<ChartComparisonItem[]>>(
    `/dashboard/chart-comparison?${params.toString()}`,
  );

  return response.data.data;
};
