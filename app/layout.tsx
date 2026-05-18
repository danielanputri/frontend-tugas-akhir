import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stock Prediction Dashboard",
  description: "Dashboard prediksi stok barang berbasis AI/ARIMA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /*
     * suppressHydrationWarning pada <html> diperlukan karena next-themes
     * memodifikasi atribut class/data-theme di <html> saat client mount.
     */
    <html lang="id" suppressHydrationWarning>
      {/*
       * FIX ERROR 2 — Script tag warning dari next-themes:
       * next-themes v0.4.6 menyuntikkan inline <script> (via dangerouslySetInnerHTML)
       * ke dalam tree React untuk membaca localStorage sebelum paint pertama.
       * React 19 memperingatkan script tag di dalam komponen karena tidak dieksekusi
       * ulang saat hydration.
       *
       * Solusi: tambahkan suppressHydrationWarning pada <body>.
       * Ini memberitahu React untuk mengabaikan perbedaan atribut/child
       * di level body yang disebabkan oleh injeksi script next-themes.
       *
       * Ini AMAN karena:
       * - Script hanya berjalan sekali saat load awal (bukan saat re-render)
       * - Konten aplikasi sesungguhnya ada di dalam <Providers> dan tidak terpengaruh
       * - suppressHydrationWarning hanya menekan warning di node tersebut, bukan subtree
       */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>{children}</Providers>
          <Toaster richColors closeButton position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}