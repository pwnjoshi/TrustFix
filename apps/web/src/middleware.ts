import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (process.env.TRUSTFIX_PUBLIC_SITE_MODE !== "true") return NextResponse.next();
  const protectedApp = process.env.TRUSTFIX_PROTECTED_APP_URL;
  if (!protectedApp) return new NextResponse("Protected application URL is not configured", { status: 503 });
  const destination = new URL(request.nextUrl.pathname + request.nextUrl.search, protectedApp);
  return NextResponse.redirect(destination);
}

export const config = { matcher: ["/app/:path*", "/api/:path*"] };
