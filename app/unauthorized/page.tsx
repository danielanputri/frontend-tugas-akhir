"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ShieldOffIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const { logout, isLoggingOut } = useAuth();
  const router = useRouter();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <ShieldOffIcon className="size-16 text-destructive" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="text-muted-foreground max-w-sm">
          Anda tidak memiliki izin untuk mengakses halaman ini.
        </p>
        <div className="flex gap-3 mt-2">
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Kembali ke Dashboard
          </Button>
          <Button
            variant="destructive"
            onClick={() => logout()}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Keluar..." : "Logout"}
          </Button>
        </div>
      </div>
    </div>
  );
}