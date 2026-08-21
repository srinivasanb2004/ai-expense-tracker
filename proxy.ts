import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname

  const protectedRoutes = [
    "/dashboard",
    "/expenses",
    "/income",
    "/budgets",
    "/analytics",
    "/assistant",
    "/scan",
    "/settings",
    "/recurring",
    "/borrow-lend",
    "/notes",
  ]

  const isProtectedRoute = protectedRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  )

  // If user is not logged in and tries to access
  // a protected page, send them to login.
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(
      new URL("/login", req.url)
    )
  }

  // IMPORTANT:
  // We intentionally DO NOT redirect logged-in users
  // away from /login or /register.
  //
  // This allows:
  // - switching accounts
  // - creating another account
  // - opening login/register manually

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/expenses/:path*",
    "/income/:path*",
    "/budgets/:path*",
    "/analytics/:path*",
    "/assistant/:path*",
    "/scan/:path*",
    "/settings/:path*",
    "/recurring/:path*",
    "/borrow-lend/:path*",
    "/notes/:path*",
  ],
}