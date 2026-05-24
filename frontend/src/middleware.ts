import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const privateRoutes = [
  "/account",
  "/token/create",
  "/issuer",
  "/wallet",
  "/quest",
  "/admin",
  "/futures",
];
const authRoutes = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  const isPrivateRoute = privateRoutes.some((path) =>
    pathname.startsWith(path)
  );
  const isPublicRoute = authRoutes.some((path) => pathname.startsWith(path));

  const sessionToken = request.cookies.get("sessionToken")?.value;

  if (isPrivateRoute && !sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isPublicRoute && sessionToken) {
    return NextResponse.redirect(new URL("/account", request.url));
  }

  return NextResponse.next();
}
