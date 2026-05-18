import { AppSidebar } from '@/app/dashboard/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { PrediksiHeader } from './components/prediksi-header';
import { PrediksiContent } from './components/prediksi-content';

export default function PrediksiPage() {
  return (
    <SidebarProvider>
      <AppSidebar variant='inset' />
      <SidebarInset>
        <PrediksiHeader />
        <div className='flex flex-1 flex-col'>
          <div className='flex flex-col gap-6 px-4 py-4 lg:px-6 lg:py-6'>
            <PrediksiContent />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
