import type { VercelRequest, VercelResponse } from "@vercel/node";

const RAILWAY_BASE = "https://noiscut-api-production.up.railway.app";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathSegments = req.query.path;
  const subpath = Array.isArray(pathSegments) ? pathSegments.join("/") : pathSegments || "";
  const qs = req.url?.split("?")[1] || "";
  const target = `${RAILWAY_BASE}/.well-known/${subpath}${qs ? `?${qs}` : ""}`;

  try {
    const upstream = await fetch(target, {
      headers: { Accept: req.headers.accept || "application/json" },
    });
    const body = await upstream.text();
    const ct = upstream.headers.get("content-type") || "application/json";
    res.setHeader("Content-Type", ct);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(upstream.status).send(body);
  } catch {
    res.status(502).json({ error: "upstream unreachable" });
  }
}
