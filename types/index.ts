export interface LoginCredentials {
  username: string;
  password: string;
}

// FIX BUG-04: Tambah field `role` optional
// Backend sekarang mengembalikan role langsung di response login
// sehingga tidak perlu extra roundtrip GET /me hanya untuk dapat role
export interface AuthResponse {
  access_token: string;
  token_type: string;
  role?: string;   // ditambahkan — sesuai fix backend Token schema
  user?: User;     // tetap opsional untuk kompatibilitas ke depan
}

export interface User {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

export interface DashboardSummary {
  total_produk: number;
  total_data_penjualan: number;
  total_model_terlatih: number;
  avg_mape_persen: number;
  avg_akurasi_persen: number;
}

export interface Product {
  kode_produk: string;
  nama_produk: string;
  jumlah_data?: number;
  has_model?: boolean;
  last_data?: string;
}

export interface StockStatus {
  kode_produk: string;
  nama_produk: string;
  nama_supplier?: string;
  qty_terkini: number;
  stok_bulan_label?: string;
  qty_prediksi_bulan_depan: number;
  prediksi_bulan_label?: string;
  selisih: number;
  persentase_perubahan: number;
  status_urgensi: 'critical' | 'warning' | 'safe';
  rekomendasi: string;
  last_updated: string;
  mape?: number;
  rmse?: number;
}

export interface HistorisDataPoint {
  tanggal: string;
  jumlah_terjual: number;
}

export interface PrediksiDataPoint {
  tanggal: string;
  nilai_prediksi: number;
  confidence_lower: number;
  confidence_upper: number;
}

export interface ChartData {
  kode_produk: string;
  nama_produk: string;
  historis: HistorisDataPoint[];
  prediksi: PrediksiDataPoint[];
}

export interface PredictionInput {
  kode_produk: string;
  steps?: number;
  confidence_level?: number;
}

export interface PredictionResult {
  kode_produk: string;
  model_version: number;
  steps: number;
  confidence_level: number;
  predictions: PrediksiDataPoint[];
}

export interface PredictionHistory {
  id: number;
  kode_produk: string;
  tanggal_prediksi: string;
  nilai_prediksi: number;
  confidence_lower: number;
  confidence_upper: number;
  created_at: string;
}

export interface MLModel {
  kode_produk: string;
  version: number;
  rmse: number;
  mape: number;
  order?: { p: number; d: number; q: number } | null;
  trained_at: string;
}

export interface TrainModelInput {
  kode_produk: string;
  steps_eval?: number;
}

export interface TrainModelResult {
  kode_produk: string;
  version: number;
  order: {
    p: number;
    d: number;
    q: number;
  };
  n_observations: number;
  metrics: {
    rmse: number;
    mape: number;
  };
  pkl_path: string;
}

export interface PredictBulkInput {
  kode_produk_list: string[];
  steps?: number;
  confidence_level?: number;
}

export interface PredictionLimitItem {
  kode_produk: string;
  prediction_count: number;
  is_limit_reached: boolean;
}

export interface PredictionLimitResponse {
  success: boolean;
  prediction_limit: number;
  global_prediction_count: number;
  is_limit_reached: boolean;
  data: PredictionLimitItem[];
}

export interface PredictBulkItem {
  kode_produk: string;
  model_version?: number;
  steps?: number;
  confidence_level?: number;
  predictions: PrediksiDataPoint[] | null;
  error: string | null;
}

export interface PredictBulkResponse {
  success: boolean;
  prediction_count: number;
  is_limit_reached: boolean;
  data: PredictBulkItem[];
}

export interface UploadResponse {
  success: boolean;
  message: string;
}

export interface ChartComparisonItem {
  kode_produk: string;
  nama_produk: string;
  historis: HistorisDataPoint[];
  prediksi: PrediksiDataPoint[];
}

export interface ChartComparisonFilter {
  kode_produk: string;
  bulan_historis?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  total: number;
  page?: number;
  page_size?: number;
  data: T[];
}

export interface StockStatusFilter {
  limit?: number;
  page?: number;
  sort_by?: 'urgency' | 'qty' | 'nama';
  order?: 'asc' | 'desc';
  search?: string;
  supplier?: string;
}

export interface ChartFilter {
  kode_produk: string;
  bulan_historis?: number;
}

export interface PredictionHistoryFilter {
  kode_produk?: string;
  limit?: number;
}

export interface ApiError {
  detail: string;
  status_code: number;
  timestamp: string;
}