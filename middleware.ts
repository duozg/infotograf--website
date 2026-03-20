const RAILWAY_BASE = "https://noiscut-api-production.up.railway.app";

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);

  if (url.pathname.startsWith("/.well-known/") || url.pathname.startsWith("/nodeinfo/") || url.pathname.startsWith("/ap/")) {
    const target = `${RAILWAY_BASE}${url.pathname}${url.search}`;
    const upstream = await fetch(target, {
      headers: { Accept: request.headers.get("Accept") || "application/json" },
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  return undefined;
}

export const config = {
  matcher: ["/.well-known/:path*", "/nodeinfo/:path*", "/ap/:path*"],
};
