"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const ChartAreaInteractiveLazy = dynamic(
  () =>
    import("@/app/dashboard/components/chart-area-interactive").then(
      (m) => ({ default: m.ChartAreaInteractive })
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[360px] w-full rounded-xl" />,
  }
);
