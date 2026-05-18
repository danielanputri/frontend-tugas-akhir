"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";

import { useChartData } from "@/hooks/use-dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import apiClient from "@/lib/api/axiosInstance";
import type { PaginatedResponse, MLModel } from "@/types";

const chartConfig = {
  aktual: {
    label: "Penjualan Aktual",
    color: "var(--chart-1)",
  },
  prediksi: {
    label: "Prediksi Kebutuhan",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

function ChartSkeleton() {
  return (
    <Card className="@container/card">
      <CardHeader className="relative pb-4">
        <div className="flex flex-col gap-2 @[540px]/card:flex-row @[540px]/card:items-start @[540px]/card:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-[200px]" />
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <Skeleton className="h-[260px] w-full" />
      </CardContent>
    </Card>
  );
}

/**
 * Parse "YYYY-MM-DD" ke label bulan Indonesia tanpa konversi timezone browser.
 * Memisahkan tahun dan bulan secara manual untuk menghindari off-by-one
 * akibat UTC vs local time.
 */
function parseBulanLabel(tanggal: string): string {
  const [year, month] = tanggal.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
  });
}

export function ChartAreaInteractive() {
  const [selectedProduct, setSelectedProduct] = React.useState<string>("");

  // FIX BUG-8: tambah staleTime agar tidak refetch setiap mount
  const { data: modelsData, isLoading: isLoadingModels } = useQuery({
    queryKey: ["mlModels"],
    queryFn: async () => {
      const response =
        await apiClient.get<PaginatedResponse<MLModel>>("/ml/models");
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  React.useEffect(() => {
    if (modelsData?.data && modelsData.data.length > 0 && !selectedProduct) {
      setSelectedProduct(modelsData.data[0].kode_produk);
    }
  }, [modelsData, selectedProduct]);

  const { data: chartData, isLoading: isLoadingChart } = useChartData(
    { kode_produk: selectedProduct, bulan_historis: 12 },
    !!selectedProduct,
  );

  const isLoading = isLoadingModels || isLoadingChart;

  const transformedData = React.useMemo(() => {
    if (!chartData) return [];

    // ── FIX BUG-1: Sort historis ascending sebelum diproses ──────────────────
    const sortedHistoris = [...chartData.historis].sort((a, b) =>
      a.tanggal.localeCompare(b.tanggal),
    );

    // ── FIX BUG-2: Agregasi SUM per bulan di frontend sebagai safety net ──────
    // Backend sudah GROUP BY bulan (SUM), tapi jika ada edge case data mentah
    // yang lolos, kita tetap aggregate di sini.
    const historisMap = new Map<string, number>();
    for (const h of sortedHistoris) {
      const label = parseBulanLabel(h.tanggal);
      historisMap.set(label, (historisMap.get(label) ?? 0) + h.jumlah_terjual);
    }

    // Map sudah dalam insertion order yang kronologis karena sortedHistoris sudah di-sort
    const historisArr = Array.from(historisMap.entries()).map(
      ([bulan, aktual]) => ({
        bulan,
        aktual,
        prediksi: undefined as number | undefined,
      }),
    );

    // ── FIX BUG-4 & BUG-6: Backend sudah filter prediksi > last_historis_date.
    // Di sini kita hanya transform, tanpa perlu filter ulang.
    // Sort ascending untuk memastikan urutan benar.
    const sortedPrediksi = [...chartData.prediksi]
      .filter((p) => p.nilai_prediksi != null)
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    // ── FIX BUG-5: Deduplikasi bulan prediksi — ambil yang terakhir di array
    // (backend sudah mengembalikan hanya prediksi terbaru per bulan via subquery,
    // ini sebagai double safety).
    const prediksiMap = new Map<string, number>();
    for (const p of sortedPrediksi) {
      prediksiMap.set(parseBulanLabel(p.tanggal), p.nilai_prediksi!);
    }

    const prediksiArr = Array.from(prediksiMap.entries()).map(
      ([bulan, prediksi]) => ({
        bulan,
        aktual: undefined as number | undefined,
        prediksi,
      }),
    );

    // ── FIX BUG-3: Bridge — set nilai prediksi pada titik historis TERAKHIR ───
    // Tidak menambah row baru (yang menyebabkan duplikat label di X-axis),
    // melainkan memodifikasi in-place agar kedua garis tersambung mulus.
    if (historisArr.length > 0 && prediksiArr.length > 0) {
      historisArr[historisArr.length - 1].prediksi =
        historisArr[historisArr.length - 1].aktual;
    }

    return [...historisArr, ...prediksiArr];
  }, [chartData]);

  // FIX BUG-7: isMobile dihapus (tidak pernah dipakai)

  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (!chartData || transformedData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Tren Penjualan &amp; Prediksi Stok</CardTitle>
          <CardDescription>
            Pilih produk untuk melihat grafik penjualan dan prediksi
          </CardDescription>
        </CardHeader>
        <CardContent className="flex h-[260px] items-center justify-center text-muted-foreground">
          {modelsData?.data && modelsData.data.length === 0
            ? "Belum ada model terlatih. Silakan latih model terlebih dahulu."
            : "Pilih produk untuk melihat grafik"}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <CardHeader className="relative pb-4">
        <div className="flex flex-col gap-2 @[540px]/card:flex-row @[540px]/card:items-start @[540px]/card:justify-between">
          <div>
            <CardTitle>Tren Penjualan &amp; Prediksi Stok</CardTitle>
            <CardDescription>
              {chartData.nama_produk} — Historis &amp; Prediksi AI
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 @[540px]/card:items-end">
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-full @[540px]/card:w-[200px]">
                <SelectValue placeholder="Pilih Produk" />
              </SelectTrigger>
              <SelectContent>
                {modelsData?.data?.map((model) => (
                  <SelectItem key={model.kode_produk} value={model.kode_produk}>
                    {model.kode_produk}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="absolute right-4 top-4 @[540px]/card:relative @[540px]/card:right-auto @[540px]/card:top-auto @[540px]/card:mt-2">
          <span className="inline-flex h-8 items-center rounded-md border border-border bg-muted/40 px-3 text-sm font-medium text-muted-foreground">
            12 Bulan
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[260px] w-full"
        >
          <AreaChart data={transformedData} margin={{ left: 0, right: 8 }}>
            <defs>
              <linearGradient id="fillAktual" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-aktual)"
                  stopOpacity={0.9}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-aktual)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillPrediksi" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-prediksi)"
                  stopOpacity={0.7}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-prediksi)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="bulan"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
              }
              width={40}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => String(label)}
                  formatter={(value, name) => [
                    `${Number(value).toLocaleString("id-ID")} unit`,
                    name === "aktual"
                      ? "Penjualan Aktual"
                      : "Prediksi Kebutuhan",
                  ]}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="aktual"
              type="monotone"
              fill="url(#fillAktual)"
              stroke="var(--color-aktual)"
              strokeWidth={2}
              connectNulls={false}
            />
            <Area
              dataKey="prediksi"
              type="monotone"
              fill="url(#fillPrediksi)"
              stroke="var(--color-prediksi)"
              strokeWidth={2}
              strokeDasharray="5 4"
              connectNulls={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}