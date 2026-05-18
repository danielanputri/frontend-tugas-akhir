"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { PredictionHistory } from "@/types";

interface Props {
  data: PredictionHistory[];
}

interface ChartPoint {
  label: string;
  interval: number;
}

const chartConfig = {
  interval: {
    label: "Interval Kepercayaan",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ErrorTrendChart({ data }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const textColor = isDark ? "#a1a1aa" : "#71717a";
  const refLabelColor = isDark ? "#d4d4d8" : "#52525b";

  const points: ChartPoint[] = data
  .filter((r) => r.confidence_upper != null && r.confidence_lower != null)
  .sort((a, b) =>                                          // ← tambah sort
    new Date(a.tanggal_prediksi).getTime() -
    new Date(b.tanggal_prediksi).getTime()
  )
  .slice(-30)
  .map((r) => ({
    label: new Date(r.tanggal_prediksi).toLocaleDateString("id-ID", {
      month: "short",
      year: "2-digit",
    }),
    interval:
      Math.round(
        (((r.confidence_upper! - r.confidence_lower!) /
          (r.nilai_prediksi || 1)) *
          100) *
          10
      ) / 10,
  }));

  if (points.length < 2) return null;

  const avgInterval =
    Math.round(
      (points.reduce((s, p) => s + p.interval, 0) / points.length) * 10
    ) / 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tren Ketidakpastian Model</CardTitle>
        <CardDescription>
          Lebar interval kepercayaan relatif (%) — semakin kecil, semakin
          akurat prediksi model.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6">
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <LineChart
            data={points}
            margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-border"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11, fill: textColor }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              width={44}
              tick={{ fontSize: 11, fill: textColor }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <ChartTooltip
              cursor={{
                stroke: "hsl(var(--border))",
                strokeWidth: 1,
                strokeDasharray: "4 2",
              }}
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => `Prediksi: ${String(label)}`}
                  formatter={(value) => [
                    `${Number(value).toFixed(1)}%`,
                    "Interval",
                  ]}
                  indicator="line"
                />
              }
            />
            <ReferenceLine
              y={avgInterval}
              stroke="var(--chart-2)"
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{
                value: `Rata-rata ${avgInterval}%`,
                position: "insideTopRight",
                fontSize: 10,
                fill: refLabelColor,
                dy: -6,
              }}
            />
            <Line
              type="monotone"
              dataKey="interval"
              stroke="var(--color-interval)"
              strokeWidth={2}
              dot={{
                r: 3.5,
                fill: "var(--color-interval)",
                strokeWidth: 0,
              }}
              activeDot={{
                r: 5.5,
                fill: "var(--color-interval)",
                stroke: "hsl(var(--background))",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
