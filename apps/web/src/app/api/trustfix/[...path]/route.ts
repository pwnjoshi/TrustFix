import { GoogleAuth } from "google-auth-library";
import { NextRequest, NextResponse } from "next/server";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";


async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const apiBase = process.env.API_BASE_URL;
  if (!apiBase) return NextResponse.json({ detail: "Backend is not configured" }, { status: 503 });
  const { path } = await context.params;
  const target = new URL(path.join("/"), `${apiBase.replace(/\/$/, "")}/`);
  target.search = request.nextUrl.search;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const idempotency = request.headers.get("idempotency-key");
  if (idempotency) headers.set("idempotency-key", idempotency);
  const assertion = request.headers.get("x-goog-iap-jwt-assertion");
  if (assertion) headers.set("x-trustfix-iap-jwt", assertion);
  if (process.env.TRUSTFIX_AUTH_MODE === "dev") headers.set("x-trustfix-dev-proxy", "true");
  if (process.env.K_SERVICE) {
    const client = await new GoogleAuth().getIdTokenClient(apiBase);
    headers.set("authorization", `Bearer ${await client.idTokenProvider.fetchIdToken(apiBase)}`);
  }
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();
  const response = await fetch(target, { method: request.method, headers, body, cache: "no-store" });
  const responseHeaders = new Headers();
  const responseType = response.headers.get("content-type");
  if (responseType) responseHeaders.set("content-type", responseType);
  const disposition = response.headers.get("content-disposition");
  if (disposition) responseHeaders.set("content-disposition", disposition);
  return new NextResponse(response.body, { status: response.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
