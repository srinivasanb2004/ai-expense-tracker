import { auth } from "./auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname
  const protectedRoutes = [
    "/dashboard",
    "/expenses",
    "/analytics",
    "/budgets",
    "/scan",
    "/assistant",
    "/income",
    "/borrow-lend",
    "/settings",
  ]

  const protectedPath = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  if (protectedPath && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/expenses/:path*",
    "/analytics/:path*",
    "/budgets/:path*",
    "/scan/:path*",
    "/assistant/:path*",
    "/income/:path*",
    "/borrow-lend/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
}
