'use client';

import { useState } from 'react';
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  MinusCircleIcon,
  SearchIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';

type Status = 'kritis' | 'peringatan' | 'aman';
type Trend = 'naik' | 'turun' | 'stabil';

interface StokItem {
  barcode: string;
  namaBarang: string;
  kategori: string;
  stokSaatIni: number;
  threshold: number;
  prediksiApril: number;
  trend: Trend;
  status: Status;
}

const stokKritis: StokItem[] = [
  {
    barcode: '8998866401055',
    namaBarang: 'Teh Botol Sosro 450ml',
    kategori: 'Minuman',
    stokSaatIni: 12,
    threshold: 50,
    prediksiApril: 165,
    trend: 'turun',
    status: 'kritis',
  },
  {
    barcode: '8992775143700',
    namaBarang: 'Indomie Goreng Spesial 85g',
    kategori: 'Makanan',
    stokSaatIni: 18,
    threshold: 100,
    prediksiApril: 210,
    trend: 'naik',
    status: 'kritis',
  },
  {
    barcode: '8999909010001',
    namaBarang: 'Chitato Sapi Panggang 68g',
    kategori: 'Snack',
    stokSaatIni: 24,
    threshold: 60,
    prediksiApril: 80,
    trend: 'turun',
    status: 'kritis',
  },
  {
    barcode: '8991101007507',
    namaBarang: 'Energen Sereal Cokelat 30g',
    kategori: 'Makanan',
    stokSaatIni: 35,
    threshold: 80,
    prediksiApril: 200,
    trend: 'turun',
    status: 'peringatan',
  },
  {
    barcode: '8850006513209',
    namaBarang: 'Milo Activ-Go Coklat 400g',
    kategori: 'Minuman',
    stokSaatIni: 35,
    threshold: 70,
    prediksiApril: 42,
    trend: 'stabil',
    status: 'peringatan',
  },
  {
    barcode: '8901030865374',
    namaBarang: 'Lifebuoy Sabun Cair 450ml',
    kategori: 'Perawatan',
    stokSaatIni: 78,
    threshold: 100,
    prediksiApril: 90,
    trend: 'naik',
    status: 'peringatan',
  },
  {
    barcode: '8998866320046',
    namaBarang: 'Aqua Air Mineral 600ml',
    kategori: 'Minuman',
    stokSaatIni: 480,
    threshold: 200,
    prediksiApril: 520,
    trend: 'stabil',
    status: 'aman',
  },
  {
    barcode: '8886300000123',
    namaBarang: 'Mie Sedaap Kuah Ayam Bawang',
    kategori: 'Makanan',
    stokSaatIni: 320,
    threshold: 150,
    prediksiApril: 350,
    trend: 'naik',
    status: 'aman',
  },
];

function StatusBadge({ status }: { status: Status }) {
  if (status === 'kritis') {
    return (
      <Badge className='gap-1 bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400'>
        <AlertTriangleIcon className='size-3' />
        Kritis
      </Badge>
    );
  }
  if (status === 'peringatan') {
    return (
      <Badge className='gap-1 bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400'>
        <MinusCircleIcon className='size-3' />
        Peringatan
      </Badge>
    );
  }
  return (
    <Badge className='gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'>
      <CheckCircle2Icon className='size-3' />
      Aman
    </Badge>
  );
}

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === 'naik')
    return <TrendingUpIcon className='inline size-4 text-emerald-500' />;
  if (trend === 'turun')
    return <TrendingDownIcon className='inline size-4 text-red-500' />;
  return <MinusCircleIcon className='inline size-4 text-muted-foreground' />;
}

function StockBar({ value, threshold }: { value: number; threshold: number }) {
  const pct = Math.min((value / threshold) * 100, 100);
  const color =
    pct <= 30 ? 'bg-red-500' : pct <= 60 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className='flex items-center gap-2'>
      <div className='h-1.5 w-16 rounded-full bg-muted'>
        <div
          className={cn('h-1.5 rounded-full transition-all', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className='tabular-nums text-xs'>{value}</span>
    </div>
  );
}

export function DataTable() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    kategori: 'all',
    trend: 'all',
    status: 'all',
  });
  const [sort, setSort] = useState<{
    key: 'namaBarang' | 'stokSaatIni' | null;
    dir: 'asc' | 'desc';
  }>({ key: null, dir: 'asc' });

  const toggleSort = (key: 'namaBarang' | 'stokSaatIni', dir: 'asc' | 'desc') =>
    setSort((s) =>
      s.key === key && s.dir === dir ? { key: null, dir: 'asc' } : { key, dir },
    );

  const filteredData = stokKritis
    .filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        item.namaBarang.toLowerCase().includes(q) ||
        item.barcode.includes(q) ||
        item.kategori.toLowerCase().includes(q);
      const matchesKategori =
        filters.kategori === 'all' || item.kategori === filters.kategori;
      const matchesTrend =
        filters.trend === 'all' || item.trend === filters.trend;
      const matchesStatus =
        filters.status === 'all' || item.status === filters.status;
      return matchesSearch && matchesKategori && matchesTrend && matchesStatus;
    })
    .sort((a, b) => {
      if (!sort.key) return 0;
      const mult = sort.dir === 'asc' ? 1 : -1;
      if (sort.key === 'namaBarang')
        return mult * a.namaBarang.localeCompare(b.namaBarang, 'id');
      return mult * (a.stokSaatIni - b.stokSaatIni);
    });

  const kritis = filteredData.filter((i) => i.status === 'kritis').length;
  const peringatan = filteredData.filter(
    (i) => i.status === 'peringatan',
  ).length;

  return (
    <div className='px-4 lg:px-6'>
      <Card>
        <CardHeader className='flex flex-row items-start justify-between gap-4'>
          <div>
            <CardTitle>Ringkasan Status Stok</CardTitle>
            <CardDescription>
              Daftar SKU berdasarkan tingkat urgensi stok dan prediksi kebutuhan
              bulan depan.
            </CardDescription>
          </div>
          <div className='flex shrink-0 gap-2'>
            <Badge className='gap-1 bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400'>
              <AlertTriangleIcon className='size-3' />
              {kritis} Kritis
            </Badge>
            <Badge className='gap-1 bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400'>
              <MinusCircleIcon className='size-3' />
              {peringatan} Peringatan
            </Badge>
          </div>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='px-4 pb-3 pt-2'>
            <div className='relative'>
              <SearchIcon className='absolute left-2.5 top-2.5 size-4 text-muted-foreground' />
              <Input
                placeholder='Cari nama barang, barcode, atau kategori…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='pl-8'
              />
            </div>
          </div>
          <div className='overflow-x-auto rounded-b-xl'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/50'>
                  <TableHead>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className='inline-flex cursor-pointer items-center gap-1 outline-none hover:text-foreground'>
                          Nama Barang
                          <ChevronDownIcon
                            className={cn(
                              'size-3 transition-colors',
                              sort.key === 'namaBarang' && 'text-primary',
                            )}
                          />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='start'>
                        <DropdownMenuRadioGroup
                          value={sort.key === 'namaBarang' ? sort.dir : ''}
                          onValueChange={(v) =>
                            toggleSort('namaBarang', v as 'asc' | 'desc')
                          }
                        >
                          <DropdownMenuRadioItem value='asc'>
                            A → Z
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value='desc'>
                            Z → A
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableHead>
                  <TableHead>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className='inline-flex cursor-pointer items-center gap-1 outline-none hover:text-foreground'>
                          Kategori
                          <ChevronDownIcon
                            className={cn(
                              'size-3 transition-colors',
                              filters.kategori !== 'all' && 'text-primary',
                            )}
                          />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='start'>
                        <DropdownMenuRadioGroup
                          value={filters.kategori}
                          onValueChange={(v) =>
                            setFilters((f) => ({ ...f, kategori: v }))
                          }
                        >
                          <DropdownMenuRadioItem value='all'>
                            Semua
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value='Minuman'>
                            Minuman
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value='Makanan'>
                            Makanan
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value='Snack'>
                            Snack
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value='Perawatan'>
                            Perawatan
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableHead>
                  <TableHead>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className='inline-flex cursor-pointer items-center gap-1 outline-none hover:text-foreground'>
                          Stok / Threshold
                          <ChevronDownIcon
                            className={cn(
                              'size-3 transition-colors',
                              sort.key === 'stokSaatIni' && 'text-primary',
                            )}
                          />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='start'>
                        <DropdownMenuRadioGroup
                          value={sort.key === 'stokSaatIni' ? sort.dir : ''}
                          onValueChange={(v) =>
                            toggleSort('stokSaatIni', v as 'asc' | 'desc')
                          }
                        >
                          <DropdownMenuRadioItem value='asc'>
                            ASC
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value='desc'>
                            DESC
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableHead>
                  <TableHead className='text-right'>Prediksi Apr</TableHead>
                  <TableHead className='text-center'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className='mx-auto inline-flex cursor-pointer items-center gap-1 outline-none hover:text-foreground'>
                          Tren
                          <ChevronDownIcon
                            className={cn(
                              'size-3 transition-colors',
                              filters.trend !== 'all' && 'text-primary',
                            )}
                          />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='center'>
                        <DropdownMenuRadioGroup
                          value={filters.trend}
                          onValueChange={(v) =>
                            setFilters((f) => ({ ...f, trend: v }))
                          }
                        >
                          <DropdownMenuRadioItem value='all'>
                            Semua
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value='naik'>
                            Naik
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value='turun'>
                            Turun
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value='stabil'>
                            Stabil
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableHead>
                  <TableHead className='text-center'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className='mx-auto inline-flex cursor-pointer items-center gap-1 outline-none hover:text-foreground'>
                          Status
                          <ChevronDownIcon
                            className={cn(
                              'size-3 transition-colors',
                              filters.status !== 'all' && 'text-primary',
                            )}
                          />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuRadioGroup
                          value={filters.status}
                          onValueChange={(v) =>
                            setFilters((f) => ({ ...f, status: v }))
                          }
                        >
                          <DropdownMenuRadioItem value='all'>
                            Semua
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value='kritis'>
                            Kritis
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value='peringatan'>
                            Peringatan
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value='aman'>
                            Aman
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className='py-8 text-center text-muted-foreground'
                    >
                      Tidak ada data yang cocok dengan pencarian.
                    </TableCell>
                  </TableRow>
                )}
                {filteredData.map((item) => (
                  <TableRow
                    key={item.barcode}
                    className={cn(
                      'hover:bg-muted/30',
                      item.status === 'kritis' &&
                        'bg-red-50/40 dark:bg-red-950/10',
                    )}
                  >
                    <TableCell>
                      <div className='flex flex-col'>
                        <span className='font-medium'>{item.namaBarang}</span>
                        <span className='font-mono text-xs text-muted-foreground'>
                          {item.barcode}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className='text-muted-foreground'>
                      {item.kategori}
                    </TableCell>
                    <TableCell>
                      <StockBar
                        value={item.stokSaatIni}
                        threshold={item.threshold}
                      />
                    </TableCell>
                    <TableCell className='text-right tabular-nums font-medium'>
                      {item.prediksiApril.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className='text-center'>
                      <TrendIcon trend={item.trend} />
                    </TableCell>
                    <TableCell className='text-center'>
                      <StatusBadge status={item.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
