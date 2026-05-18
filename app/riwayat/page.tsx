import { AppSidebar } from '@/app/dashboard/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { SiteHeader } from '@/app/dashboard/components/site-header';
import { RiwayatContent } from './components/riwayat-content';

export const metadata = {
  title: 'Riwayat Prediksi | Stock Prediction Dashboard',
  description: 'Lihat riwayat hasil prediksi stok beserta akurasi model ARIMA',
};

export default function RiwayatPage() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-6 px-4 py-4 lg:px-6 lg:py-6">
            <RiwayatContent />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
