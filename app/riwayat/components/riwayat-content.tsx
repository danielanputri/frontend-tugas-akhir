"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarIcon, ClockIcon, SearchIcon, TrendingUpIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getPredictionHistory } from "@/lib/api/ml";
import { getModels } from "@/lib/api/ml";
// import dynamic from "next/dynamic";

// const ErrorTrendChart = dynamic(
//   () => import("./error-trend-chart").then((m) => ({ default: m.ErrorTrendChart })),
//   {
//     ssr: false,
//     loading: () => <Skeleton className="h-[220px] w-full rounded-xl" />,
//   }
// );


function formatBulanTahun(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

function formatTanggal(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAngka(v: number | null | undefined) {
  if (v == null) return "—";
  return Math.round(v).toLocaleString("id-ID");
}


// Kategori MAPE (konsisten dengan halaman Prediksi):
//   < 10%        → Sangat Tinggi (hijau)
//   10% – 20%   → Baik (biru)
//   20% – 50%   → Layak (kuning)
//   > 50%        → Rendah (merah)
function AccuracyBadge({ mape }: { mape: number | null }) {
  if (mape == null) return <span className="text-xs text-muted-foreground">—</span>;

  const cls =
    mape < 10  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
    mape < 20  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
    mape <= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                 "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", cls)}>
      {mape.toFixed(1)}%
    </span>
  );
}


interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  selectedProduct: string;
  onProductChange: (v: string) => void;
  products: string[];
}

function FilterBar({
  search, onSearchChange, selectedProduct, onProductChange, products,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-40">
        <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Cari kode / nama produk..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>

      <Select value={selectedProduct} onValueChange={onProductChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Semua Produk" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Produk</SelectItem>
          {products.map((p) => (
            <SelectItem key={p} value={p}>{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}


function SummaryStats({ total, avgInterval, latestDate }: {
  total: number;
  avgInterval: number | null;
  latestDate: string | null;
}) {
  const stats = [
    {
      icon: ClockIcon,
      label: "Total Riwayat",
      value: total.toLocaleString("id-ID"),
      suffix: "entri",
    },
    {
      icon: TrendingUpIcon,
      label: "Rata-rata Lebar Interval",
      value: avgInterval != null ? avgInterval.toFixed(1) : "—",
      suffix: avgInterval != null ? " unit" : "",
    },
    {
      icon: CalendarIcon,
      label: "Prediksi Terakhir",
      value: latestDate ? formatBulanTahun(latestDate) : "—",
      suffix: "",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((s) => (
        <Card key={s.label} className="py-4">
          <CardContent className="px-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="size-3.5" />
              <p className="text-xs">{s.label}</p>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {s.value}
              {s.suffix && (
                <span className="ml-1 text-sm font-normal text-muted-foreground">{s.suffix}</span>
              )}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


export function RiwayatContent() {
  const [search, setSearch] = React.useState("");
  const [selectedProduct, setSelectedProduct] = React.useState("all");
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedProduct]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["predictionHistory", selectedProduct],
    queryFn: () =>
      getPredictionHistory({
        kode_produk: selectedProduct === "all" ? undefined : selectedProduct,
        limit: 200,
      }),
    staleTime: 60_000,
  });

  const { data: modelsData } = useQuery({
    queryKey: ["models"],
    queryFn: getModels,
    staleTime: 5 * 60_000,
  });

  const rows = data?.data ?? [];

  const sortedRows = [...rows].sort(
  (a, b) =>
    new Date(a.tanggal_prediksi).getTime() -
    new Date(b.tanggal_prediksi).getTime()
);

  const productList = [
    ...new Set(modelsData?.data?.map((m) => m.kode_produk) ?? []),
  ];

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.kode_produk?.toLowerCase().includes(q) ?? false
    );
  });

  const intervals = filtered
    .map((r) => r.confidence_upper != null && r.confidence_lower != null ? (r.confidence_upper - r.confidence_lower) : null)
    .filter((v): v is number => v != null);

  const avgInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : null;

  const total = filtered.length;
  // tanggal_prediksi terbaru dari data yang sudah di-sort
  const latestDate = sortedRows[sortedRows.length - 1]?.tanggal_prediksi ?? null;

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-1 h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-12">
          <p className="font-medium text-destructive">Gagal memuat riwayat prediksi</p>
          <p className="text-sm text-muted-foreground">Pastikan backend aktif dan coba refresh halaman.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Riwayat Prediksi</h2>
        <p className="text-sm text-muted-foreground">
          Lihat semua hasil prediksi stok yang pernah dijalankan beserta nilai akurasi model.
        </p>
      </div>

      {/* Stats */}
      <SummaryStats
        total={total}
        avgInterval={avgInterval}
        latestDate={latestDate}
      />

      {/* Error trend chart (lazy loaded)
      {sortedRows.length > 0 && (
        <ErrorTrendChart data={sortedRows} />
      )} */}

      {/* Filter bar */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        selectedProduct={selectedProduct}
        onProductChange={setSelectedProduct}
        products={productList}
      />

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Riwayat</CardTitle>
              <CardDescription>
                Menampilkan {total === 0 ? 0 : Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, total)} - {Math.min(currentPage * ITEMS_PER_PAGE, total)} dari {total} entri
              </CardDescription>
            </div>
            {selectedProduct !== "all" && (
              <Badge variant="secondary">{selectedProduct}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Kode Produk</TableHead>
                  <TableHead>Bulan Prediksi</TableHead>
                  <TableHead className="text-right">Nilai Prediksi</TableHead>
                  <TableHead className="text-right">Batas Bawah</TableHead>
                  <TableHead className="text-right">Batas Atas</TableHead>
                  <TableHead className="text-center">Interval</TableHead>
                  <TableHead className="whitespace-nowrap text-muted-foreground">
                    Dibuat
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-12 text-center text-muted-foreground"
                    >
                      {rows.length === 0
                        ? "Belum ada riwayat prediksi. Jalankan prediksi terlebih dahulu."
                        : "Tidak ada data yang cocok dengan filter."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((row, index) => {
                    const actualIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                    const intervalWidth =
                      row.confidence_upper != null && row.confidence_lower != null
                        ? Math.round(row.confidence_upper - row.confidence_lower)
                        : null;
                    return (
                      <TableRow key={row.id} className="hover:bg-muted/30">
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {actualIndex}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-medium">
                          {row.kode_produk}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatBulanTahun(row.tanggal_prediksi)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatAngka(row.nilai_prediksi)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatAngka(row.confidence_lower)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatAngka(row.confidence_upper)}
                        </TableCell>
                        <TableCell className="text-center">
                          {intervalWidth != null ? (
                            <span className="text-xs text-muted-foreground">
                              ±{Math.round(intervalWidth / 2).toLocaleString("id-ID")}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {row.created_at ? formatTanggal(row.created_at) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-end space-x-4 p-4 border-t">
            <div className="text-sm text-muted-foreground">
              Halaman {currentPage} dari {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeftIcon className="mr-1 size-4" />
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Selanjutnya
                <ChevronRightIcon className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}