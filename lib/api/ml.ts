import apiClient from "./axiosInstance";
import type {
  MLModel,
  PredictBulkInput,
  PredictBulkResponse,
  PredictionResult,
  PredictionHistory,
  PredictionHistoryFilter,
  PredictionLimitResponse,
  TrainModelInput,
  TrainModelResult,
  ApiResponse,
  PaginatedResponse,
} from "@/types";

export const trainModel = async (
  input: TrainModelInput,
): Promise<ApiResponse<TrainModelResult>> => {
  const response = await apiClient.post<ApiResponse<TrainModelResult>>(
    "/ml/train",
    input,
  );
  return response.data;
};

export const trainAll = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    "/ml/train-all",
  );
  return response.data;
};

export const retrainAll = async (): Promise<{
  success: boolean;
  message: string;
  data: {
    total: number;
    success_count: number;
    failed_count: number;
    results: TrainModelResult[];
    failed: { kode_produk: string; error: string }[];
  };
}> => {
  const response = await apiClient.post("/ml/retrain-all");
  return response.data;
};

export const trainAllSync = async (): Promise<{
  success: boolean;
  message: string;
  data: { success: string[]; failed: { kode_produk: string; error: string }[] };
}> => {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
    data: { success: string[]; failed: { kode_produk: string; error: string }[] };
  }>("/ml/train-all-sync");
  return response.data;
};

export const getModels = async (): Promise<PaginatedResponse<MLModel>> => {
  const response =
    await apiClient.get<PaginatedResponse<MLModel>>("/ml/models");
  return response.data;
};

export const predictSingle = async (
  kode_produk: string,
  steps = 1,
  confidence_level = 0.95,
): Promise<ApiResponse<PredictionResult>> => {
  const params = new URLSearchParams({
    steps: String(steps),
    confidence_level: String(confidence_level),
  });

  const response = await apiClient.get<ApiResponse<PredictionResult>>(
    `/ml/predict/${encodeURIComponent(kode_produk)}?${params.toString()}`,
  );
  return response.data;
};

export const predictBulk = async (
  input: PredictBulkInput,
): Promise<PredictBulkResponse> => {
  const response = await apiClient.post<PredictBulkResponse>(
    "/ml/predict-bulk",
    input,
  );
  return response.data;
};

export const getPredictionHistory = async (
  filter?: PredictionHistoryFilter,
): Promise<PaginatedResponse<PredictionHistory>> => {
  const params = new URLSearchParams();
  if (filter?.kode_produk) params.append("kode_produk", filter.kode_produk);
  if (filter?.limit) params.append("limit", String(filter.limit));

  const query = params.toString();
  const response = await apiClient.get<PaginatedResponse<PredictionHistory>>(
    `/ml/history${query ? `?${query}` : ""}`,
  );
  return response.data;
};

export const getPredictionLimits = async (): Promise<PredictionLimitResponse> => {
  const response = await apiClient.get<PredictionLimitResponse>("/ml/prediction-limit");
  return response.data;
};
