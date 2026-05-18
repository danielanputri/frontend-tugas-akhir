import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";
import { toast } from "sonner";

// BASE_URL sudah include /api agar cocok dengan prefix backend FastAPI
// .env.local: NEXT_PUBLIC_API_URL=http://localhost:8000/api
// fallback   : http://127.0.0.1:8000/api
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export const TOKEN_KEY = "auth_token";
export const ROLE_KEY = "user_role";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  // FIX BAD REQUEST: JANGAN set default Content-Type: application/json di sini.
  //
  // Axios 1.x behavior: setContentType(value, false) hanya akan set Content-Type
  // jika belum ada nilai sebelumnya. Karena instance ini sebelumnya punya default
  // Content-Type: application/json, maka saat loginAPI mengirim URLSearchParams
  // axios TIDAK bisa override ke application/x-www-form-urlencoded.
  //
  // Akibat: FastAPI menerima body sebagai JSON (bukan OAuth2 form) → 400 Bad Request.
  //
  // Solusi: biarkan axios auto-detect per-request:
  //   - URLSearchParams → otomatis set application/x-www-form-urlencoded
  //   - plain object    → otomatis set application/json
});

// ===== REQUEST INTERCEPTOR =====
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ===== RESPONSE INTERCEPTOR =====
apiClient.interceptors.response.use(
  (response) => response,

  (error: AxiosError<{ detail?: string | { msg: string }[] }>) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;

    const resolveMessage = (): string => {
      if (!detail) return error.message || "Terjadi kesalahan.";
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail)) return detail.map((d) => d.msg).join(", ");
      return "Terjadi kesalahan.";
    };

    const isLoginPage =
      typeof window !== "undefined" &&
      window.location.pathname.includes("/login");

    if (status === 401) {
      authHelpers.removeAll();
      if (typeof window !== "undefined" && !isLoginPage) {
        toast.error("Sesi Berakhir", {
          description:
            "Token tidak valid atau sudah kadaluarsa. Silakan login kembali.",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 1_500);
      }
      return Promise.reject(error);
    }

    if (status === 403) {
      toast.error("Akses Ditolak", { description: resolveMessage() });
      return Promise.reject(error);
    }

    if (status === 404) {
      return Promise.reject(error);
    }

    if (status === 409) {
      // Conflict errors (data duplikat, CSV_CONFLICT, XLSX_CONFLICT) ditangani
      // oleh handleTemplateError di masing-masing mutation onError.
      // Interceptor hanya meneruskan error agar onError bisa membuka dialog yang sesuai.
      return Promise.reject(error);
    }

    if (status === 422) {
      toast.error("Data Tidak Valid", { description: resolveMessage() });
      return Promise.reject(error);
    }

    if (status === 500) {
      toast.error("Server Error", {
        description:
          resolveMessage() ||
          "Terjadi kesalahan di server. Coba beberapa saat lagi.",
      });
      return Promise.reject(error);
    }

    if (!error.response && !isLoginPage) {
      toast.error("Koneksi Gagal", {
        description:
          "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      });
    }

    return Promise.reject(error);
  },
);

// ===== AUTH HELPERS =====
export const authHelpers = {
  setToken: (token: string) => {
    Cookies.set(TOKEN_KEY, token, {
      expires: 7,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  },

  getToken: (): string | undefined => {
    return Cookies.get(TOKEN_KEY);
  },

  removeToken: () => {
    Cookies.remove(TOKEN_KEY);
  },

  isAuthenticated: (): boolean => {
    return !!Cookies.get(TOKEN_KEY);
  },

  setRole: (role: string) => {
    Cookies.set(ROLE_KEY, role, {
      expires: 7,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  },

  getRole: (): string | undefined => {
    return Cookies.get(ROLE_KEY);
  },

  removeRole: () => {
    Cookies.remove(ROLE_KEY);
  },

  removeAll: () => {
    Cookies.remove(TOKEN_KEY);
    Cookies.remove(ROLE_KEY);
  },
};

export default apiClient;