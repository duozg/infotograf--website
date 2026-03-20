const RAILWAY_BASE = "https://noiscut-api-production.up.railway.app";

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);

  if (url.pathname.startsWith("/.well-known/") || url.pathname.startsWith("/nodeinfo/") || url.pathname.startsWith("/ap/")) {
    const target = `${RAILWAY_BASE}${url.pathname}${url.search}`;

    // Build upstream headers — forward relevant ones for ActivityPub
    const upstreamHeaders: Record<string, string> = {
      Accept: request.headers.get("Accept") || "application/json",
    };

    // Forward signature and content headers for POST (inbox) requests
    // Note: don't forward "host" — let fetch set it for the Railway target
    const forwardHeaders = ["content-type", "signature", "digest", "date"];
    for (const h of forwardHeaders) {
      const val = request.headers.get(h);
      if (val) upstreamHeaders[h] = val;
    }

    // Forward the request with its original method and body
    const isPost = request.method === "POST" || request.method === "PUT";
    const upstream = await fetch(target, {
      method: request.method,
      headers: upstreamHeaders,
      body: isPost ? await request.text() : undefined,
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
