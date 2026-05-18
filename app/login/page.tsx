import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

/**
 * Login page.
 * LoginForm menggunakan useSearchParams() untuk membaca callbackUrl,
 * sehingga wajib dibungkus <Suspense> agar tidak error saat build/SSR.
 * Referensi: https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}