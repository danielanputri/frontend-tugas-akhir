import apiClient from "./axiosInstance";
import type { UploadResponse } from "@/types";

export const uploadFile = async (
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<UploadResponse>(
    "/data/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          const percent = Math.round((event.loaded * 100) / event.total);
          onProgress(percent);
        }
      },
    },
  );

  return response.data;
};

export const downloadCsvTemplate = async (): Promise<void> => {
  const response = await apiClient.get("/data/template/csv", {
    responseType: "blob",
  });
  const url = URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "template_data_historis.csv";
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadXlsxTemplate = async (): Promise<void> => {
  const response = await apiClient.get("/data/template/xlsx", {
    responseType: "blob",
  });
  const url = URL.createObjectURL(
    new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "Template_Penjualan_Bulanan.xlsx";
  a.click();
  URL.revokeObjectURL(url);
};