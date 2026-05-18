'use client';

import * as React from 'react';
import { ArrowUpCircleIcon, BarChartIcon, ClockIcon, LayoutDashboardIcon } from 'lucide-react';

import { NavMain } from '@/app/dashboard/components/nav-main';
import { NavUser } from '@/app/dashboard/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';

// Nav items didefinisikan di luar komponen agar tidak re-create setiap render
const ADMIN_NAV = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboardIcon },
  { title: 'Prediksi', url: '/prediksi', icon: BarChartIcon },
  { title: 'Riwayat Prediksi', url: '/riwayat', icon: ClockIcon },
];

const MANAGER_NAV = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboardIcon },
  { title: 'Riwayat Prediksi', url: '/riwayat', icon: ClockIcon },
];

// Fallback aman: tampilkan nav paling minimal saat SSR / sebelum role diketahui.
// Ini yang di-render server, sehingga client hydration cocok dengan server output.
const DEFAULT_NAV = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboardIcon },
];

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Manager',
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, role } = useAuth();

  // FIX HYDRATION ERROR:
  // `role` berasal dari js-cookie yang hanya tersedia di browser.
  // Saat SSR, role = undefined → navItems = MANAGER_NAV (3 item).
  // Saat client hydrate, role = 'admin' → navItems = ADMIN_NAV (3 item berbeda).
  // React mendeteksi perbedaan href/icon → hydration mismatch.
  //
  // Solusi: gunakan `mounted` state.
  // - Sebelum mount (SSR + awal hydration): render DEFAULT_NAV yang sama antara server dan client.
  // - Setelah mount (useEffect jalan = pasti di client): render nav sesuai role.
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Sebelum mounted: server dan client render hal yang sama → tidak ada mismatch
  // Setelah mounted: client render nav sesuai role sesungguhnya
  const navItems = mounted
    ? (role === 'admin' ? ADMIN_NAV : MANAGER_NAV)
    : DEFAULT_NAV;

  const displayName = mounted ? (user?.username ?? 'User') : 'User';
  const displayRole = mounted ? (ROLE_LABEL[role ?? ''] ?? 'Pengguna') : 'Pengguna';

  return (
    <Sidebar collapsible='offcanvas' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className='data-[slot=sidebar-menu-button]:!p-1.5'
            >
              <a href='/dashboard'>
                <ArrowUpCircleIcon className='size-6' />
                <span className='text-base font-semibold'>
                  Prediksi Stok App
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{
          name: displayName,
          email: displayRole,
          avatar: '/side-bg.jpeg',
        }} />
      </SidebarFooter>
    </Sidebar>
  );
}