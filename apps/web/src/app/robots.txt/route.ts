import { NextResponse } from "next/server";

export function GET() {
  return new NextResponse(
    `User-agent: *
Allow: /
Allow: /product
Allow: /demo
Allow: /security
Disallow: /app/
Disallow: /api/

Sitemap: https://trustfix.app/sitemap.xml`,
    {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=86400",
      },
    },
  );
}
