'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getDashboardSummary,
  getChartData,
  getStockStatus,
  getSuppliers,
} from '@/lib/api/dashboard';
import type { ChartFilter, StockStatusFilter } from '@/types';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: ['dashboardSuppliers'],
    queryFn: getSuppliers,
    staleTime: 5 * 60 * 1000,
  });
}

export function useChartData(filter: ChartFilter, enabled: boolean = true) {
  return useQuery({
    queryKey: ['chartData', filter],
    queryFn: () => getChartData(filter),
    enabled: enabled && !!filter.kode_produk,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStockStatus(filter?: StockStatusFilter) {
  return useQuery({
    queryKey: ['stockStatus', filter],
    queryFn: () => getStockStatus(filter),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}