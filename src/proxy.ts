import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAdmin = req.auth?.user?.role === "ADMIN";

  if (pathname.startsWith("/admin") && !isAdmin) {
    const url = isLoggedIn ? "/dashboard" : "/login";
    return NextResponse.redirect(new URL(url, req.url));
  }

  if (
    (pathname.startsWith("/dashboard") || pathname.startsWith("/prenota")) &&
    !isLoggedIn
  ) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/prenota/:path*"],
};
