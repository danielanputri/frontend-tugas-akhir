"use client";

import React, { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  BrainCircuitIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  CloudUploadIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  RefreshCwIcon,
  SearchIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { uploadFile, downloadCsvTemplate, downloadXlsxTemplate } from "@/lib/api/data";
import {
  getModels,
  getPredictionLimits,
  predictBulk,
  retrainAll,
} from "@/lib/api/ml";
import { getProducts } from "@/lib/api/products";
import { useAuth } from "@/hooks/use-auth";
import type { PredictBulkItem, TrainModelResult } from "@/types";

interface UploadedFile {
  file: File;
  id: string;
}

type Trend = "naik" | "turun" | "stabil";

interface PredictionRow {
  no: number;
  kode_produk: string;
  nama_produk: string;
  steps: { label: string; value: number }[];
  mape: number;
  rmse: number;
  order: { p: number; d: number; q: number } | null;
  prediction_error?: string;
  trend: Trend;
}

type ProcessStep =
  | "idle"
  | "uploading"
  | "fetching_models"
  | "predicting"
  | "done";

const STEP_LABELS: Record<ProcessStep, string> = {
  idle: "",
  uploading: "Mengunggah file...",
  fetching_models: "Mengambil daftar model...",
  predicting: "Menjalankan prediksi AI...",
  done: "Selesai",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isCsvFile(file: File): boolean {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return ext === ".csv" || file.type === "text/csv" || file.type === "application/csv";
}

function isXlsxFile(file: File): boolean {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return (
    ext === ".xlsx" ||
    ext === ".xls" ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel"
  );
}

function toMonthLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    month: "short",
    year: "numeric",
  });
}

function deriveTrend(values: number[]): Trend {
  if (values.length < 2) return "stabil";
  const first = values[0];
  const last = values[values.length - 1];
  const threshold = first * 0.05;
  if (last - first > threshold) return "naik";
  if (first - last > threshold) return "turun";
  return "stabil";
}

/**
 * Mengekstrak pesan error yang berguna dari AxiosError maupun Error biasa.
 * Menangani kasus di mana backend mengembalikan detail sebagai string,
 * object { message }, atau object { detail } — termasuk status 409.
 */
function resolveAxiosMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosErr = error as { response?: { data?: unknown; status?: number } };
    const data = axiosErr.response?.data;
    if (typeof data === "string" && data) return data;
    if (typeof data === "object" && data !== null) {
      const d = data as Record<string, unknown>;
      // detail bisa berupa string langsung
      if (typeof d.detail === "string" && d.detail) return d.detail;
      // detail bisa berupa object { message, error_code, ... }
      if (typeof d.detail === "object" && d.detail !== null) {
        const det = d.detail as Record<string, unknown>;
        if (typeof det.message === "string" && det.message) return det.message;
      }
      if (typeof d.message === "string" && d.message) return d.message;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function mapToPredictionRow(
  item: PredictBulkItem,
  index: number,
  prodMap: Map<string, string>,
  mapeMap: Map<string, number>,
  rmseMap: Map<string, number>,
  orderMap: Map<string, { p: number; d: number; q: number } | null>,
): PredictionRow {
  const predictions = item.predictions ?? [];
  const predictionValues = predictions.map((p) => p.nilai_prediksi);
  return {
    no: index + 1,
    kode_produk: item.kode_produk,
    nama_produk: prodMap.get(item.kode_produk) ?? item.kode_produk,
    steps: predictions.slice(0, 1).map((p) => ({
      label: toMonthLabel(p.tanggal),
      value: p.nilai_prediksi,
    })),
    mape: mapeMap.get(item.kode_produk) ?? 0,
    rmse: rmseMap.get(item.kode_produk) ?? 0,
    order: orderMap.get(item.kode_produk) ?? null,
    prediction_error: item.error ?? undefined,
    trend: deriveTrend(predictionValues),
  };
}

function TrendBadge({ trend }: { trend: Trend }) {
  if (trend === "naik") {
    return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
        <TrendingUpIcon className="size-3" />
        Naik
      </Badge>
    );
  }
  if (trend === "turun") {
    return (
      <Badge className="gap-1 bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">
        <TrendingDownIcon className="size-3" />
        Turun
      </Badge>
    );
  }
  return (
    <Badge className="bg-muted text-muted-foreground hover:bg-muted">
      Stabil
    </Badge>
  );
}

// ─── MAPE Category Helper (single source of truth) ───────────────────────────
// Kategori sesuai literatur:
//   Sangat Tinggi : MAPE < 10%   → hijau
//   Baik          : 10% – 20%   → biru
//   Layak         : 20% – 50%   → kuning
//   Rendah        : > 50%       → merah
function getMapeCategory(mape: number): {
  label: string;
  className: string;
} {
  if (mape < 10)  return { label: "Sangat Tinggi", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
  if (mape < 20)  return { label: "Baik",          className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
  if (mape <= 50) return { label: "Layak",         className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
  return           { label: "Rendah",             className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
}

function MapeBadge({ value }: { value: number }) {
  const cat = getMapeCategory(value);
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", cat.className)}>
      {value.toFixed(1)}%
    </span>
  );
}

interface RetrainEvalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: TrainModelResult | null;
}

function RetrainEvalDialog({ open, onOpenChange, result }: RetrainEvalDialogProps) {
  if (!result) return null;
  const { metrics, order, version, kode_produk, n_observations } = result;

  const metricRows = [
    {
      label: "RMSE",
      value: metrics.rmse.toFixed(2),
      desc: "Root Mean Square Error",
    },
    {
      label: "MAPE",
      value: `${metrics.mape.toFixed(2)}%`,
      desc: "Mean Absolute Percentage Error",
      // highlight mengikuti getMapeCategory: <10 good, <20 info, <=50 warn, >50 bad
      highlight: metrics.mape < 10 ? "good" : metrics.mape < 20 ? "info" : metrics.mape <= 50 ? "warn" : "bad",
    },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2Icon className="size-5 text-emerald-500" />
            Model Berhasil Dilatih Ulang!
          </DialogTitle>
          <DialogDescription>
            Semua model berhasil dilatih ulang. Batas prediksi telah direset ke 0.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Model Info */}
          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
            <div className="grid grid-cols-2 gap-y-1 text-muted-foreground">
              <span>Kode Produk</span>
              <span className="font-mono font-medium text-foreground">{kode_produk}</span>
              <span>Versi Model</span>
              <span className="font-medium text-foreground">v{version}</span>
              <span>Order ARIMA</span>
              <span className="font-medium text-foreground">({order.p}, {order.d}, {order.q})</span>
              <span>Data Historis</span>
              <span className="font-medium text-foreground">{n_observations} bulan</span>
            </div>
          </div>

          {/* Metrics */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Metrik Evaluasi</p>
            {metricRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-lg border px-4 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.desc}</p>
                </div>
                <span
                  className={cn(
                    "text-lg font-bold tabular-nums",
                    row.label === "MAPE" && row.highlight === "good" && "text-emerald-600",
                    row.label === "MAPE" && row.highlight === "info" && "text-blue-600",
                    row.label === "MAPE" && row.highlight === "warn" && "text-amber-600",
                    row.label === "MAPE" && row.highlight === "bad" && "text-red-600",
                  )}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Tutup & Mulai Prediksi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Template mismatch warning dialog ────────────────────────────────────────

type TemplateErrorCode = "INVALID_TEMPLATE" | "CSV_CONFLICT" | "CSV_INSUFFICIENT_DATA" | "XLSX_CONFLICT";

interface InvalidTemplateState {
  open: boolean;
  errorCode: TemplateErrorCode | null;
  templateType: "csv" | "xlsx" | null;
  message: string;
  products?: { kode: string; nama: string; bulan: string }[];
}

function InvalidTemplateDialog({
  state,
  onClose,
}: {
  state: InvalidTemplateState;
  onClose: () => void;
}) {
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      if (state.templateType === "csv") {
        await downloadCsvTemplate();
      } else {
        await downloadXlsxTemplate();
      }
    } catch {
      toast.error("Unduh Template Gagal", {
        description: "Tidak dapat mengunduh template. Pastikan koneksi internet aktif dan coba lagi.",
      });
    } finally {
      setDownloading(false);
    }
  };

  // ── Derive dialog content based on error code ──────────────────────────────
  const isConflict      = state.errorCode === "CSV_CONFLICT";
  const isInsufficient  = state.errorCode === "CSV_INSUFFICIENT_DATA";
  const isFormatError   = state.errorCode === "INVALID_TEMPLATE";
  const isXlsxConflict  = state.errorCode === "XLSX_CONFLICT";

  const dialogTitle = isConflict
    ? "CSV Tidak Diizinkan — Data Sudah Ada"
    : isInsufficient
    ? "Data CSV Tidak Mencukupi"
    : isXlsxConflict
    ? "Data XLSX Sudah Ada di Database"
    : "Format File Tidak Sesuai";

  const dialogDesc = isConflict
    ? "Upload CSV hanya diperbolehkan untuk inisialisasi pertama kali, sebelum ada data atau model di database."
    : isInsufficient
    ? "Setiap produk dalam CSV harus memiliki minimal 18 bulan data historis untuk melatih model ARIMA."
    : isXlsxConflict
    ? "Data penjualan untuk bulan yang sama sudah tersimpan di database. Upload dibatalkan untuk mencegah duplikasi."
    : "File yang Anda upload tidak cocok dengan template yang diharapkan sistem.";

  const showDownload = isFormatError && !!state.templateType;

  const templateLabel = state.templateType === "csv"
    ? "Template CSV (Data Historis)"
    : "Template Excel (Data Bulanan)";

  const templateDesc = state.templateType === "csv"
    ? "File .csv dengan kolom: Periode, Supplier, Kode Article, Nama Article, Qty"
    : "File .xlsx dengan header laporan: Laporan Penjualan Per Supplier, info Supplier, Periode Tanggal, lalu data produk";

  const borderColor = isConflict || isXlsxConflict
    ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
    : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300";

  const titleColor = isConflict || isXlsxConflict
    ? "text-red-600 dark:text-red-400"
    : "text-amber-600 dark:text-amber-400";

  return (
    <Dialog open={state.open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={cn("flex items-center gap-2", titleColor)}>
            <AlertTriangleIcon className="size-5" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>{dialogDesc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Error detail */}
          <div className={cn("rounded-lg border px-4 py-3 text-sm", borderColor)}>
            <p className="font-medium mb-1">Detail:</p>
            <p className="leading-relaxed">{state.message}</p>
          </div>

          {/* XLSX conflict: daftar produk duplikat */}
          {isXlsxConflict && state.products && state.products.length > 0 && (
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
              <p className="font-medium text-foreground mb-2">
                Produk yang sudah ada ({state.products.length}):
              </p>
              <ul className="space-y-1 max-h-36 overflow-y-auto">
                {state.products.map((p, i) => (
                  <li key={i} className="flex items-start justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-mono shrink-0">{p.kode}</span>
                    <span className="truncate flex-1 text-right">{p.bulan}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* XLSX conflict hint */}
          {isXlsxConflict && (
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Jika data bulan ini memang perlu diperbarui, hubungi administrator untuk menghapus data lama terlebih dahulu, lalu upload ulang.
            </div>
          )}

          {/* Template download — only for format errors */}
          {showDownload && (
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
              <p className="font-medium text-foreground mb-1">{templateLabel}</p>
              <p className="text-muted-foreground text-xs leading-relaxed">{templateDesc}</p>
            </div>
          )}

          {/* Conflict hint */}
          {isConflict && (
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Untuk menambah data penjualan bulanan, gunakan upload file <strong>Excel (.xlsx)</strong> di panel kiri.
            </div>
          )}

          {/* Insufficient data hint */}
          {isInsufficient && (
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Pastikan CSV mencakup data dari <strong>minimal 18 bulan</strong> yang berbeda untuk setiap produk sebelum upload.
            </div>
          )}

          <div className="flex flex-col gap-2">
            {showDownload && (
              <Button onClick={handleDownload} disabled={downloading} className="w-full gap-2">
                {downloading
                  ? <RefreshCwIcon className="size-4 animate-spin" />
                  : <DownloadIcon className="size-4" />}
                {downloading ? "Mengunduh..." : `Unduh ${templateLabel}`}
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface FileUploadProps {
  xlsxFile: UploadedFile | null;
  onXlsxChange: (f: UploadedFile | null) => void;
  onProcess: () => void;
  isProcessing: boolean;
  progress: number;
  processStep: ProcessStep;
  isLimitReached: boolean;
  predictionCount: number;
  predictionLimit: number;
  isAdmin: boolean;
  isRetraining: boolean;
  onRetrain: () => void;
  onCreateModel: () => void;
}

function DropZone({
  label,
  sublabel,
  accept,
  disabled,
  onFiles,
  file,
  onRemove,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  inputRef,
  accentColor = "primary",
}: {
  label: string;
  sublabel: string;
  accept: string;
  disabled: boolean;
  onFiles: (fl: FileList | null) => void;
  file: UploadedFile | null;
  onRemove: () => void;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  accentColor?: "primary" | "amber";
}) {
  const accent = accentColor === "amber"
    ? { border: "border-amber-400 dark:border-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", icon: "text-amber-600 dark:text-amber-400", iconBg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400" }
    : { border: "border-primary", bg: "bg-primary/5", icon: "text-primary", iconBg: "bg-primary/10", text: "text-primary" };

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
          disabled
            ? "cursor-not-allowed border-muted opacity-50"
            : isDragging
            ? cn("cursor-pointer", accent.border, accent.bg)
            : "cursor-pointer border-border hover:border-muted-foreground/40 hover:bg-muted/30",
        )}
      >
        <div className={cn("flex size-11 items-center justify-center rounded-full", accent.iconBg)}>
          <FileSpreadsheetIcon className={cn("size-6", accent.icon)} />
        </div>
        <div>
          <p className="text-sm font-medium">
            {disabled ? label + " (tidak tersedia)" : (
              <>Seret file atau <span className={cn("underline underline-offset-2", accent.text)}>klik untuk memilih</span></>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {file && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5">
          <FileSpreadsheetIcon className="size-4 shrink-0 text-emerald-600" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{file.file.name}</span>
            <span className="text-xs text-muted-foreground">{formatBytes(file.file.size)}</span>
          </div>
          <CheckCircle2Icon className="size-4 shrink-0 text-emerald-500" />
          <button
            type="button"
            aria-label="Hapus file"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="ml-1 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function FileUploadSection({
  xlsxFile,
  onXlsxChange,
  onProcess,
  isProcessing,
  progress,
  processStep,
  isLimitReached,
  predictionCount,
  predictionLimit,
  isAdmin,
  isRetraining,
  onRetrain,
  onCreateModel,
}: FileUploadProps) {
  const [xlsxDragging, setXlsxDragging] = useState(false);
  const [xlsxError, setXlsxError] = useState<string | null>(null);
  const xlsxInputRef = useRef<HTMLInputElement>(null);

  const handleXlsx = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    setXlsxError(null);
    const file = Array.from(incoming)[0];
    if (!file) return;
    if (!isXlsxFile(file)) {
      setXlsxError(`"${file.name}" bukan file Excel. Gunakan .xlsx atau .xls.`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setXlsxError("File melebihi batas 10 MB.");
      return;
    }
    onXlsxChange({ file, id: `${file.name}-${Date.now()}` });
  }, [onXlsxChange]);

  const anyBusy = isProcessing || isRetraining;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CloudUploadIcon className="size-5 text-primary" />
              Upload Data Penjualan
            </CardTitle>
            <CardDescription className="mt-1">
              Upload laporan bulanan (.xlsx) untuk prediksi, atau data historis (.csv) untuk inisialisasi pertama kali.
            </CardDescription>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-xs text-muted-foreground">Sisa Prediksi</span>
            <p className={cn("text-2xl font-bold tabular-nums leading-none", isLimitReached ? "text-destructive" : "text-primary")}>
              {Math.max(0, predictionLimit - predictionCount)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">/ {predictionLimit}</span>
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {isLimitReached && (
          <Alert variant="destructive">
            <AlertTriangleIcon className="size-4" />
            <AlertTitle>Batas Prediksi Tercapai — Latih Ulang Diperlukan</AlertTitle>
            <AlertDescription>
              Anda telah melakukan <strong>{predictionCount} dari {predictionLimit} prediksi</strong> yang diizinkan.
              Sebelum dapat memprediksi lagi, model harus dilatih ulang menggunakan tombol <strong>Latih Ulang Model</strong>.
              {!isAdmin && <span className="block mt-1 font-medium">Hubungi administrator untuk melakukan pelatihan ulang model.</span>}
            </AlertDescription>
          </Alert>
        )}

        {/* XLSX upload — single panel */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Data Penjualan Bulanan</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">.xlsx</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Upload laporan penjualan bulanan dari supplier. Data tersimpan otomatis dan prediksi bulan berikutnya ditampilkan.
          </p>
          <DropZone
            label="Upload file Excel bulanan"
            sublabel="Format: Laporan Penjualan Per Supplier · Maks. 10 MB"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            disabled={isLimitReached || anyBusy}
            onFiles={handleXlsx}
            file={xlsxFile}
            onRemove={() => { onXlsxChange(null); setXlsxError(null); }}
            isDragging={xlsxDragging}
            onDragOver={(e) => { e.preventDefault(); if (!isLimitReached && !anyBusy) setXlsxDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setXlsxDragging(false); }}
            onDrop={(e) => { e.preventDefault(); setXlsxDragging(false); if (!isLimitReached && !anyBusy) handleXlsx(e.dataTransfer.files); }}
            inputRef={xlsxInputRef}
            accentColor="primary"
          />
          {xlsxError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircleIcon className="size-3 shrink-0" />{xlsxError}
            </div>
          )}
        </div>

        {/* Progress bar */}
        {isProcessing && (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <RefreshCwIcon className="size-3 animate-spin" />
                {STEP_LABELS[processStep]}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Actions: Latih Ulang + Buat Model (left) | Hapus + Proses Prediksi (right) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left group */}
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <Button
                id="btn-latih-ulang"
                variant="outline"
                onClick={() => onRetrain()}
                disabled={anyBusy}
                className={cn(
                  "gap-2 border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-950/30",
                  isRetraining && "opacity-70",
                )}
              >
                <BrainCircuitIcon className={cn("size-4", isRetraining && "animate-spin")} />
                {isRetraining ? "Melatih Ulang..." : "Latih Ulang Model"}
              </Button>
            )}
            {isAdmin && (
              <Button
                id="btn-buat-model"
                variant="outline"
                onClick={onCreateModel}
                disabled={anyBusy}
                className="gap-2"
              >
                <FileSpreadsheetIcon className="size-4" />
                Buat Model
              </Button>
            )}
          </div>

          {/* Right group */}
          <div className="flex items-center gap-2">
            {xlsxFile && !anyBusy && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { onXlsxChange(null); setXlsxError(null); }}
                className="text-muted-foreground"
              >
                Hapus
              </Button>
            )}
            <Button
              id="btn-proses-prediksi"
              onClick={onProcess}
              disabled={!xlsxFile || anyBusy || isLimitReached}
              className="gap-2"
            >
              <CloudUploadIcon className="size-4" />
              {isProcessing ? STEP_LABELS[processStep] : "Proses Prediksi"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCards({ data }: { data: PredictionRow[] }) {
  const successRows = data.filter((r) => !r.prediction_error);
  const failedRows = data.filter((r) => !!r.prediction_error);
  const avgMape =
    successRows.length > 0
      ? successRows.reduce((s, r) => s + r.mape, 0) / successRows.length
      : 0;
  const naikCount = successRows.filter((r) => r.trend === "naik").length;
  const turunCount = successRows.filter((r) => r.trend === "turun").length;

  const stats = [
    { label: "Produk Diproses", value: successRows.length, suffix: "SKU", color: undefined as string | undefined },
    { label: "Rata-rata MAPE", value: avgMape.toFixed(1), suffix: "%", color: undefined },
    { label: "Tren Naik", value: naikCount, suffix: "SKU", color: "text-emerald-600" },
    { label: "Tren Turun", value: turunCount, suffix: "SKU", color: "text-red-500" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="py-4">
          <CardContent className="px-5">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={cn("mt-1 text-2xl font-semibold tabular-nums", s.color)}>
              {s.value}
              <span className="ml-1 text-sm font-normal text-muted-foreground">{s.suffix}</span>
            </p>
          </CardContent>
        </Card>
      ))}

      {failedRows.length > 0 && (
        <Card className="col-span-2 border-destructive/30 bg-destructive/5 py-4 sm:col-span-4">
          <CardContent className="px-5">
            <p className="text-xs font-medium text-destructive">
              {failedRows.length} produk gagal diprediksi (tidak ada model terlatih)
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {failedRows.map((r) => r.kode_produk).join(", ")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const STEP_COLORS = [
  "text-blue-700 dark:text-blue-400",
  "text-violet-700 dark:text-violet-400",
  "text-indigo-700 dark:text-indigo-400",
] as const;

function PredictionTable({ data }: { data: PredictionRow[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"nama_produk" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Dynamic column label from first row with data (MMM YYYY format)
  const predLabel =
    data.find((r) => r.steps.length > 0)?.steps[0]?.label ?? "Prediksi";

  const filtered = data
    .filter((row) => {
      const q = search.toLowerCase();
      return (
        row.nama_produk.toLowerCase().includes(q) ||
        row.kode_produk.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (!sortKey) return 0;
      const mult = sortDir === "asc" ? 1 : -1;
      return mult * a.nama_produk.localeCompare(b.nama_produk, "id");
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hasil Prediksi Stok</CardTitle>
        <CardDescription>
          Prediksi kebutuhan stok bulan berikutnya berdasarkan model ARIMA yang sudah dilatih.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-4 pb-3 pt-2">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama produk atau kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-b-xl">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12 text-center">No.</TableHead>
                <TableHead className="whitespace-nowrap">Kode Produk</TableHead>
                <TableHead>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="inline-flex cursor-pointer items-center gap-1 outline-none hover:text-foreground">
                        Nama Produk
                        <ChevronDownIcon
                          className={cn(
                            "size-3 transition-colors",
                            sortKey === "nama_produk" && "text-primary",
                          )}
                        />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuRadioGroup
                        value={sortKey === "nama_produk" ? sortDir : ""}
                        onValueChange={(v) => {
                          setSortKey("nama_produk");
                          setSortDir(v as "asc" | "desc");
                        }}
                      >
                        <DropdownMenuRadioItem value="asc">A → Z</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="desc">Z → A</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableHead>
                <TableHead className="whitespace-nowrap text-right text-primary">
                  {predLabel}
                </TableHead>
                <TableHead className="text-right">MAPE</TableHead>
                <TableHead className="text-right">RMSE</TableHead>
                <TableHead className="text-center">Orde (PDQ)</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Tidak ada data yang cocok dengan pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow
                    key={row.kode_produk}
                    className={cn(
                      "hover:bg-muted/30",
                      row.prediction_error && "bg-destructive/5 opacity-70",
                    )}
                  >
                    <TableCell className="text-center text-muted-foreground">
                      {row.no}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {row.kode_produk}
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.nama_produk}
                      {row.prediction_error && (
                        <p className="mt-0.5 text-xs text-destructive">
                          {row.prediction_error}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-primary">
                      {row.steps[0]
                        ? Math.round(row.steps[0].value).toLocaleString("id-ID")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.mape > 0 ? (
                        <MapeBadge value={row.mape} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {row.rmse > 0 ? row.rmse.toFixed(2) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {row.order
                        ? `(${row.order.p},${row.order.d},${row.order.q})`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function PrediksiContent() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const [xlsxFile, setXlsxFile] = useState<UploadedFile | null>(null);
  const [progress, setProgress] = useState(0);
  const [processStep, setProcessStep] = useState<ProcessStep>("idle");
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);
  const [hasResult, setHasResult] = useState(false);

  const [evalOpen, setEvalOpen] = useState(false);
  const [evalResult, setEvalResult] = useState<TrainModelResult | null>(null);
  const [invalidTemplate, setInvalidTemplate] = useState<InvalidTemplateState>({
    open: false,
    errorCode: null,
    templateType: null,
    message: "",
  });
  const [retrainConfirmOpen, setRetrainConfirmOpen] = React.useState(false);
  const [createModelOpen, setCreateModelOpen] = React.useState(false);
  const [csvFile, setCsvFile] = React.useState<UploadedFile | null>(null);
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvDragging, setCsvDragging] = React.useState(false);
  const csvInputRef = React.useRef<HTMLInputElement>(null);
  const isProcessing = processStep !== "idle" && processStep !== "done";
  const { data: limitData, isError: isLimitError } = useQuery({
    queryKey: ["predictionLimits"],
    queryFn: getPredictionLimits,
    enabled: true,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  React.useEffect(() => {
    if (isLimitError) {
      toast.error("Gagal Memuat Batas Prediksi", {
        description: "Tidak dapat mengambil informasi batas prediksi dari server.",
      });
    }
  }, [isLimitError]);

  const isLimitReached = limitData?.is_limit_reached ?? false;
  const predictionCount = limitData?.global_prediction_count ?? 0;
  const predictionLimit = limitData?.prediction_limit ?? 3;
  const handleTemplateError = React.useCallback((error: unknown, fallbackType: "csv" | "xlsx") => {
    if (typeof error === "object" && error !== null && "response" in error) {
      const axiosErr = error as {
        response?: { data?: { detail?: { error_code?: string; template_type?: string; message?: string; products?: { kode: string; nama: string; bulan: string }[] } } };
      };
      const detail = axiosErr.response?.data?.detail;
      if (!detail?.error_code) return false;

      if (detail.error_code === "INVALID_TEMPLATE") {
        setInvalidTemplate({
          open: true,
          errorCode: "INVALID_TEMPLATE",
          templateType: (detail.template_type as "csv" | "xlsx") ?? fallbackType,
          message: detail.message ?? "Format file tidak sesuai template.",
        });
        return true;
      }
      if (detail.error_code === "CSV_CONFLICT") {
        setInvalidTemplate({
          open: true,
          errorCode: "CSV_CONFLICT",
          templateType: "csv",
          message: detail.message ?? "Model untuk produk ini sudah ada.",
        });
        return true;
      }
      if (detail.error_code === "CSV_INSUFFICIENT_DATA") {
        setInvalidTemplate({
          open: true,
          errorCode: "CSV_INSUFFICIENT_DATA",
          templateType: "csv",
          message: detail.message ?? "Data CSV kurang dari 18 bulan.",
        });
        return true;
      }
      if (detail.error_code === "CONFLICT") {
        setInvalidTemplate({
          open: true,
          errorCode: "XLSX_CONFLICT",
          templateType: "xlsx",
          message: detail.message ?? "Data untuk bulan ini sudah tersimpan di database.",
          products: detail.products ?? [],
        });
        return true;
      }
    }
    return false;
  }, []);

  const retrainMutation = useMutation({
    mutationFn: async () => {
      return await retrainAll();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["predictionLimits"] });
      queryClient.invalidateQueries({ queryKey: ["models"] });
      const successCount = data.data?.success_count ?? 0;
      const failedCount  = data.data?.failed_count  ?? 0;
      if (successCount > 0) {
        toast.success("Latih ulang selesai!", {
          description: `${successCount} model berhasil dilatih ulang${failedCount > 0 ? `, ${failedCount} gagal` : ""}. Batas prediksi direset.`,
        });
      } else {
        toast.warning("Latih ulang selesai dengan peringatan", { description: data.message });
      }
    },
    onError: (error: unknown) => {
      const message = resolveAxiosMessage(error, "Gagal melatih ulang model.");
      toast.error("Latih Ulang Gagal", { description: message });
    },
  });

  const csvUploadMutation = useMutation({
    mutationFn: async (fileToUpload: UploadedFile) => {
      return await uploadFile(fileToUpload.file, () => {});
    },
    onSuccess: () => {
      setCsvFile(null);
      setCreateModelOpen(false);
      toast.success("Data historis berhasil diunggah!", {
        description: "Data tersimpan di database. Anda sekarang bisa melatih model.",
      });
    },
    onError: (error: unknown) => {
      // Tutup dialog Buat Model terlebih dahulu agar InvalidTemplateDialog
      // tidak tertimpa oleh overlay dialog yang masih terbuka
      setCreateModelOpen(false);
      if (handleTemplateError(error, "csv")) return;
      const message = resolveAxiosMessage(error, "Gagal mengunggah data historis.");
      toast.error("Upload Gagal", { description: message });
    },
  });

  const processMutation = useMutation({
    mutationFn: async () => {
      if (!xlsxFile) throw new Error("Tidak ada file Excel yang dipilih.");
      const file = xlsxFile.file;

      setProcessStep("uploading");
      setProgress(5);
      await uploadFile(file, (pct) => setProgress(5 + pct * 0.25));
      toast.success("File berhasil diunggah", {
        description: `${file.name} telah diproses oleh server.`,
      });

      setProcessStep("fetching_models");
      setProgress(35);
      const [modelsResponse, productsResponse] = await Promise.all([
        getModels(),
        getProducts({ limit: 100 }),
      ]);
      setProgress(60);

      const models = modelsResponse.data ?? [];
      const products = productsResponse.data ?? [];

      if (models.length === 0) {
        throw new Error(
          "Belum ada model yang dilatih. Silakan latih model terlebih dahulu.",
        );
      }

      const mapeMap = new Map<string, number>(
        models.map((m) => [m.kode_produk, m.mape]),
      );
      const rmseMap = new Map<string, number>(
        models.map((m) => [m.kode_produk, m.rmse]),
      );
      const orderMap = new Map<string, { p: number; d: number; q: number } | null>(
        models.map((m) => [m.kode_produk, m.order ?? null]),
      );
      const prodMap = new Map<string, string>(
        products.map((p) => [p.kode_produk, p.nama_produk]),
      );
      const kodeProdukList = models.map((m) => m.kode_produk);

      setProcessStep("predicting");
      setProgress(65);
      const bulkResult = await predictBulk({
        kode_produk_list: kodeProdukList,
        steps: 1,
        confidence_level: 0.95,
      });
      setProgress(95);

      queryClient.invalidateQueries({ queryKey: ["predictionLimits"] });

      const rows: PredictionRow[] = bulkResult.data.map((item, i) =>
        mapToPredictionRow(item, i, prodMap, mapeMap, rmseMap, orderMap),
      );
      setProgress(100);
      return rows;
    },

    onSuccess: (rows) => {
      setPredictions(rows);
      setHasResult(true);
      setProcessStep("done");

      const successCount = rows.filter((r) => !r.prediction_error).length;
      const failCount = rows.filter((r) => !!r.prediction_error).length;

      toast.success("Prediksi selesai!", {
        description:
          failCount > 0
            ? `${successCount} produk berhasil, ${failCount} produk gagal (tidak ada model).`
            : `${successCount} produk berhasil diprediksi.`,
      });
    },

    onError: (error: unknown) => {
      setProcessStep("idle");
      setProgress(0);

      // Dialog khusus untuk error template/duplikat yang dikenali backend
      if (handleTemplateError(error, "xlsx")) return;

      // Fallback: tampilkan toast dengan pesan yang berguna
      const message = resolveAxiosMessage(error, "Terjadi kesalahan tak terduga.");
      toast.error("Proses gagal", { description: message });
    },
  });

  const handleProcess = () => {
    if (!xlsxFile || isLimitReached) return;
    setHasResult(false);
    setPredictions([]);
    setProgress(0);
    setProcessStep("idle");
    processMutation.mutate();
  };

  const handleRetrain = () => {
    if (!isAdmin) return;
    setRetrainConfirmOpen(true);
  };

  const handleRetrainConfirmed = () => {
    setRetrainConfirmOpen(false);
    retrainMutation.mutate();
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Prediksi Stok Barang
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload data penjualan, lalu lihat prediksi stok bulan berikutnya
          menggunakan model ARIMA yang telah dilatih.
        </p>
      </div>

      <FileUploadSection
        xlsxFile={xlsxFile}
        onXlsxChange={setXlsxFile}
        onProcess={handleProcess}
        isProcessing={isProcessing}
        progress={Math.min(progress, 100)}
        processStep={processStep}
        isLimitReached={isLimitReached}
        predictionCount={predictionCount}
        predictionLimit={predictionLimit}
        isAdmin={isAdmin}
        isRetraining={retrainMutation.isPending}
        onRetrain={handleRetrain}
        onCreateModel={() => setCreateModelOpen(true)}
      />

      {hasResult && predictions.length > 0 && (
        <>
          <SummaryCards data={predictions} />
          <PredictionTable data={predictions} />
        </>
      )}

      {!hasResult && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          <FileSpreadsheetIcon className="size-12 opacity-30" />
          <p className="text-sm">
            Upload file dan klik <strong>Proses Prediksi</strong> untuk melihat
            hasil prediksi stok.
          </p>
        </div>
      )}

      {/* Buat Model Dialog — CSV upload for new products (admin only) */}
      <Dialog open={createModelOpen} onOpenChange={(v) => !csvUploadMutation.isPending && (setCreateModelOpen(v), !v && (setCsvFile(null), setCsvError(null)))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheetIcon className="size-5 text-amber-600" />
              Buat Model — Upload CSV Data Historis
            </DialogTitle>
            <DialogDescription>
              Upload file CSV data historis untuk produk baru. CSV harus mencakup minimal 18 bulan data dan belum ada data produk tersebut di database.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-1">
            <div
              role="button"
              tabIndex={csvUploadMutation.isPending ? -1 : 0}
              aria-label="Upload CSV"
              aria-disabled={csvUploadMutation.isPending}
              onClick={() => !csvUploadMutation.isPending && csvInputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && !csvUploadMutation.isPending && csvInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); if (!csvUploadMutation.isPending) setCsvDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setCsvDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                setCsvDragging(false);
                if (csvUploadMutation.isPending) return;
                const f = e.dataTransfer.files?.[0];
                if (!f) return;
                if (!isCsvFile(f)) { setCsvError(`"${f.name}" bukan file CSV.`); return; }
                if (f.size > 50 * 1024 * 1024) { setCsvError("File melebihi batas 50 MB."); return; }
                setCsvError(null);
                setCsvFile({ file: f, id: `${f.name}-${Date.now()}` });
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
                csvUploadMutation.isPending
                  ? "cursor-not-allowed border-muted opacity-50"
                  : csvDragging
                  ? "cursor-pointer border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/30"
                  : "cursor-pointer border-border hover:border-muted-foreground/40 hover:bg-muted/30",
              )}
            >
              <div className="flex size-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <FileSpreadsheetIcon className="size-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Seret file atau{" "}
                  <span className="underline underline-offset-2 text-amber-700 dark:text-amber-400">klik untuk memilih</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Kolom: Periode, Supplier, Kode Article, Nama Article, Qty · Maks. 50 MB
                </p>
              </div>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv,application/csv"
                className="hidden"
                disabled={csvUploadMutation.isPending}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (!isCsvFile(f)) { setCsvError(`"${f.name}" bukan file CSV.`); return; }
                  if (f.size > 50 * 1024 * 1024) { setCsvError("File melebihi batas 50 MB."); return; }
                  setCsvError(null);
                  setCsvFile({ file: f, id: `${f.name}-${Date.now()}` });
                }}
              />
            </div>

            {csvFile && (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5">
                <FileSpreadsheetIcon className="size-4 shrink-0 text-emerald-600" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{csvFile.file.name}</span>
                  <span className="text-xs text-muted-foreground">{formatBytes(csvFile.file.size)}</span>
                </div>
                <CheckCircle2Icon className="size-4 shrink-0 text-emerald-500" />
                {!csvUploadMutation.isPending && (
                  <button
                    type="button"
                    onClick={() => { setCsvFile(null); setCsvError(null); }}
                    className="ml-1 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <XIcon className="size-4" />
                  </button>
                )}
              </div>
            )}

            {csvError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircleIcon className="size-3 shrink-0" />{csvError}
              </div>
            )}

            {csvUploadMutation.isPending && (
              <div className="flex items-center justify-center gap-2 rounded-lg border bg-primary/5 border-primary/20 px-4 py-3 text-sm text-primary font-medium">
                <RefreshCwIcon className="size-4 animate-spin" />
                Mengunggah data historis...
              </div>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2"
                onClick={() => { if (csvFile && isAdmin) csvUploadMutation.mutate(csvFile); }}
                disabled={!csvFile || csvUploadMutation.isPending}
              >
                {csvUploadMutation.isPending
                  ? <><RefreshCwIcon className="size-4 animate-spin" /> Mengunggah...</>
                  : <><CloudUploadIcon className="size-4" /> Upload Data Historis</>}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setCreateModelOpen(false); setCsvFile(null); setCsvError(null); }}
                disabled={csvUploadMutation.isPending}
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Retrain Confirmation Dialog */}
      <Dialog open={retrainConfirmOpen} onOpenChange={(v) => !retrainMutation.isPending && setRetrainConfirmOpen(v)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuitIcon className="size-5 text-amber-600" />
              Latih Ulang Semua Model?
            </DialogTitle>
            <DialogDescription>
              Semua model ARIMA akan dilatih ulang menggunakan seluruh data penjualan yang tersimpan di database.
              Setelah selesai, batas prediksi akan direset ke 0.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              <p className="font-medium">Informasi:</p>
              <p className="mt-1">Proses ini membutuhkan waktu beberapa menit tergantung jumlah produk. Jangan tutup halaman selama proses berlangsung.</p>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleRetrainConfirmed}
                disabled={retrainMutation.isPending}
              >
                {retrainMutation.isPending
                  ? <><RefreshCwIcon className="size-4 animate-spin" /> Melatih Ulang...</>
                  : <><BrainCircuitIcon className="size-4" /> Ya, Latih Ulang</>}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setRetrainConfirmOpen(false)} disabled={retrainMutation.isPending}>
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invalid Template Warning Dialog */}
      <InvalidTemplateDialog
        state={invalidTemplate}
        onClose={() => setInvalidTemplate((s) => ({ ...s, open: false }))}
      />

      {/* Retrain Evaluation Dialog */}
      <RetrainEvalDialog
        open={evalOpen}
        onOpenChange={setEvalOpen}
        result={evalResult}
      />
    </>
  );
}