'use client';

import { useEffect, useState } from 'react';
import {
  SearchIcon,
  ChevronDownIcon,
  FilterXIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useStockStatus, useSuppliers } from '@/hooks/use-dashboard';
import { cn } from '@/lib/utils';


function getMapeClassName(mape: number): string {
  if (mape < 10)  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (mape < 20)  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (mape <= 50) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
}

function normalizeSupplierValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 'all';
  const withoutPrefix = trimmed.replace(/^supplier\s*:\s*/i, '').trim();
  const duplicated = withoutPrefix.match(/^(.*?)\s+supplier\s*:\s*(.*?)$/i);
  if (duplicated) {
    const right = duplicated[2]?.trim();
    const left = duplicated[1]?.trim();
    return right || left || 'all';
  }
  return withoutPrefix;
}

export function DataTableIntegrated() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialSearch = searchParams.get('search') || '';
  const selectedSupplier = normalizeSupplierValue(
    searchParams.get('supplier') || 'all',
  );

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<'urgency' | 'qty' | 'nama'>('urgency');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: suppliersData } = useSuppliers();
  const suppliers = Array.from(
    new Set(
      (suppliersData || [])
        .map(normalizeSupplierValue)
        .filter((s) => s && s !== 'all'),
    ),
  );

  const { data, isLoading, error } = useStockStatus({
    limit,
    page,
    sort_by: sortBy,
    order,
    search: debouncedSearch || undefined,
    supplier: selectedSupplier !== 'all' ? selectedSupplier : undefined,
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (selectedSupplier !== 'all') params.set('supplier', selectedSupplier);
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}`);
  }, [debouncedSearch, selectedSupplier, pathname, router]);

  const filteredData = data?.data || [];

  // Header dinamis berdasarkan bulan data stok dan prediksi
  const firstItem = filteredData.find(
    (item: any) => item.prediksi_bulan_label || item.stok_bulan_label,
  );
  const stokBulanHeader = firstItem?.stok_bulan_label
    ? `Stok Saat Ini (${firstItem.stok_bulan_label})`
    : 'Stok Saat Ini';
  const prediksiHeader = firstItem?.prediksi_bulan_label
    ? `Prediksi ${firstItem.prediksi_bulan_label}`
    : 'Prediksi Bulan Depan';

  if (isLoading) return <TableSkeleton />;

  if (error) {
    return (
      <Card className='@container/card'>
        <CardHeader className='relative pb-4'>
          <CardTitle>Status Stok Real-time</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex h-[260px] items-center justify-center text-muted-foreground'>
            Gagal memuat data. Silakan refresh halaman.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='@container/card'>
      <CardHeader className='relative pb-4'>
        <div className='flex flex-col gap-2 @[540px]/card:flex-row @[540px]/card:items-start @[540px]/card:justify-between'>
          <div>
            <CardTitle>Status Stok Real-time</CardTitle>
            <CardDescription>
              {data?.total || 0} produk dipantau — {filteredData.length} ditampilkan
            </CardDescription>
          </div>
          <div className='flex flex-col gap-2 @[540px]/card:items-end'>
            <div className='flex gap-2'>
              <div className='relative w-full @[540px]/card:w-64'>
                <SearchIcon className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Cari nama / kode produk...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className='pl-8'
                />
              </div>
              <Select
                value={selectedSupplier}
                onValueChange={(val) => {
                  const norm = normalizeSupplierValue(val);
                  const params = new URLSearchParams(searchParams);
                  if (norm !== 'all') params.set('supplier', norm);
                  else params.delete('supplier');
                  router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`);
                  setPage(1);
                }}
              >
                <SelectTrigger className='w-[180px] bg-background'>
                  <SelectValue placeholder='Semua Supplier' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Semua Supplier</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s} value={s} className='truncate max-w-[250px]'>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' size='default'>
                    Sort <ChevronDownIcon className='ml-1 h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuRadioGroup
                    value={sortBy}
                    onValueChange={(v: any) => setSortBy(v)}
                  >
                    <DropdownMenuRadioItem value='urgency'>Urgensi</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value='qty'>Qty</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value='nama'>Nama</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className='px-2 pt-4 sm:px-6 sm:pt-6'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='whitespace-nowrap'>Kode Produk</TableHead>
                <TableHead>Nama Produk</TableHead>
                <TableHead className='text-right whitespace-nowrap'>{stokBulanHeader}</TableHead>
                <TableHead className='text-right whitespace-nowrap'>{prediksiHeader}</TableHead>
                <TableHead className='text-right whitespace-nowrap'>Selisih</TableHead>
                <TableHead className='text-right'>MAPE</TableHead>
                <TableHead className='text-right'>RMSE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-48 text-center pt-16 pb-16'>
                    <div className='flex flex-col items-center justify-center space-y-3'>
                      <div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted'>
                        <FilterXIcon className='h-6 w-6 text-muted-foreground' />
                      </div>
                      <div className='space-y-1'>
                        <p className='font-medium text-foreground'>Data Tidak Ditemukan</p>
                        <p className='text-sm text-muted-foreground max-w-sm mx-auto'>
                          {search || selectedSupplier !== 'all'
                            ? 'Kombinasi pencarian dan filter tidak menghasilkan data.'
                            : 'Belum ada data stok yang disinkronisasi.'}
                        </p>
                      </div>
                      {(search || selectedSupplier !== 'all') && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            setSearch('');
                            router.replace(pathname);
                          }}
                          className='mt-2'
                        >
                          Reset Filter
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => {
                  const pct = item.persentase_perubahan ?? null;
                  const isUp = pct != null && pct > 0;
                  const isDown = pct != null && pct < 0;

                  return (
                    <TableRow key={item.kode_produk}>
                      <TableCell className='font-mono text-xs'>{item.kode_produk}</TableCell>
                      <TableCell className='font-medium'>{item.nama_produk}</TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {item.qty_terkini.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className='text-right tabular-nums'>
                        {item.qty_prediksi_bulan_depan.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className='text-right'>
                        {pct != null ? (
                          <div className='inline-flex flex-col items-end gap-0.5'>
                            <span
                              className={cn(
                                'inline-flex items-center gap-0.5 text-xs font-medium',
                                isUp && 'text-emerald-600 dark:text-emerald-400',
                                isDown && 'text-red-600 dark:text-red-400',
                                !isUp && !isDown && 'text-muted-foreground',
                              )}
                            >
                              {isUp && <TrendingUpIcon className='size-3' />}
                              {isDown && <TrendingDownIcon className='size-3' />}
                              {isUp ? '+' : ''}{pct.toFixed(1)}%
                            </span>
                            <span className='text-[11px] tabular-nums text-muted-foreground'>
                              {item.selisih > 0 ? '+' : ''}
                              {item.selisih.toLocaleString('id-ID', { maximumFractionDigits: 0 })} unit
                            </span>
                          </div>
                        ) : (
                          <span className='text-xs text-muted-foreground'>—</span>
                        )}
                      </TableCell>
                      <TableCell className='text-right'>
                        {item.mape != null ? (
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                              getMapeClassName(item.mape),
                            )}
                          >
                            {item.mape.toFixed(1)}%
                          </span>
                        ) : (
                          <span className='text-xs text-muted-foreground'>—</span>
                        )}
                      </TableCell>
                      <TableCell className='text-right tabular-nums text-sm'>
                        {item.rmse != null
                          ? item.rmse.toFixed(2)
                          : <span className='text-xs text-muted-foreground'>—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {data && data.total > limit && (
          <div className='mt-4 flex items-center justify-between'>
            <div className='text-sm text-muted-foreground'>
              Menampilkan {(page - 1) * limit + 1} s.d.{' '}
              {Math.min(page * limit, data.total)} dari {data.total} produk
            </div>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Sebelumnya
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setPage((p) => p + 1)}
                disabled={page * limit >= data.total}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card className='@container/card'>
      <CardHeader className='relative pb-4'>
        <div className='flex flex-col gap-2 @[540px]/card:flex-row @[540px]/card:items-start @[540px]/card:justify-between'>
          <div className='space-y-2'>
            <Skeleton className='h-6 w-48' />
            <Skeleton className='h-4 w-64' />
          </div>
          <Skeleton className='h-10 w-64' />
        </div>
      </CardHeader>
      <CardContent className='px-2 sm:px-6'>
        <div className='space-y-2'>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className='h-16 w-full' />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}