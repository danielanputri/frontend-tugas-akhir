import { NextRequest, NextResponse } from "next/server";

const TOKEN_KEY = "auth_token";

// Route yang tidak perlu login
const PUBLIC_ROUTES = ["/login"];

// Route yang boleh diakses manager
const MANAGER_ALLOWED_ROUTES = [
  "/dashboard",
  "/riwayat",
  "/login",
  "/unauthorized",
];

/**
 * Decode JWT payload tanpa verify signature.
 * Backend tetap menjadi sumber validasi utama pada setiap API call.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Tambah padding base64 yang mungkin hilang
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) base64 += "=";

    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_KEY)?.value;

  // ===== ROOT: selalu redirect ke /login =====
  if (pathname === "/") {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ===== PUBLIC ROUTES: sudah login → ke dashboard =====
  if (PUBLIC_ROUTES.includes(pathname)) {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // ===== SEMUA ROUTE LAIN: wajib login =====
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ===== ROLE CHECK: baca dari JWT, bukan dari cookie user_role =====
  const payload = decodeJwtPayload(token);
  const role = typeof payload?.role === "string" ? payload.role : null;

  if (role === "manager") {
    const isAllowed = MANAGER_ALLOWED_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );

    if (!isAllowed) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};