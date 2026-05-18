// app/dashboard/page.tsx
import { AppSidebar } from "@/app/dashboard/components/app-sidebar";
import { ChartAreaInteractiveLazy } from "@/app/dashboard/components/chart-area-lazy";
import { DataTableIntegrated } from "@/app/dashboard/components/data-table-integrated";
import { SectionCards } from "@/app/dashboard/components/section-cards";
import { SiteHeader } from "@/app/dashboard/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Suspense } from "react";

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractiveLazy />
              </div>
              <div className="px-4 lg:px-6">
                <Suspense fallback={<div>Loading data table...</div>}>
                  <DataTableIntegrated />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}