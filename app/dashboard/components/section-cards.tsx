"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  PackageIcon,
  TrendingUpIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSummary } from "@/hooks/use-dashboard";

export function SectionCards() {
  const { data: summary, isLoading, error } = useDashboardSummary();

  if (isLoading) {
    return <SectionCardsSkeleton />;
  }

  if (error) {
    return (
      <div className="px-4 lg:px-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">
              Error Loading Dashboard
            </CardTitle>
            <CardDescription>
              Gagal memuat data dashboard. Silakan refresh halaman.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const avgAkurasiPersen = summary?.avg_akurasi_persen || 0;
  const avgMapePersen = summary?.avg_mape_persen || 0;

  return (
    <div className="*:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card lg:px-6">
      {/* Card 1: Total Produk */}
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Total Produk Dipantau</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {summary?.total_produk || 0}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              <PackageIcon className="size-3" />
              Aktif
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Total data: {summary?.total_data_penjualan || 0}
          </div>
          <div className="text-muted-foreground">Data penjualan tersimpan</div>
        </CardFooter>
      </Card>

      {/* Card 2: Model Terlatih */}
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Model AI Terlatih</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {summary?.total_model_terlatih || 0}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              <CheckCircle2Icon className="size-3" />
              Ready
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Siap untuk prediksi <CheckCircle2Icon className="size-4" />
          </div>
          <div className="text-muted-foreground">Model ARIMA terlatih</div>
        </CardFooter>
      </Card>

      {/* Card 3: Akurasi Model */}
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Akurasi Model AI</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {avgAkurasiPersen.toFixed(1)}%
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              <TrendingUpIcon className="size-3" />
              Baik
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            MAPE: {avgMapePersen.toFixed(2)}%
          </div>
          <div className="text-muted-foreground">
            Rata-rata dari semua model
          </div>
        </CardFooter>
      </Card>

      {/* Card 4: Data Penjualan */}
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Total Data Penjualan</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {summary?.total_data_penjualan?.toLocaleString() || 0}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              <TrendingUpIcon className="size-3" />
              Data
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Tersimpan di database
          </div>
          <div className="text-muted-foreground">Record penjualan historis</div>
        </CardFooter>
      </Card>
    </div>
  );
}

function SectionCardsSkeleton() {
  return (
    <div className="@xl/main:grid-cols-2 @5xl/main:grid-cols-4 grid grid-cols-1 gap-4 px-4 lg:px-6">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="@container/card">
          <CardHeader className="relative">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-24" />
            <div className="absolute right-4 top-4">
              <Skeleton className="h-6 w-16 rounded-lg" />
            </div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-32" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
