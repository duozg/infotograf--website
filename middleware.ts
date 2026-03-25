const RAILWAY_BASE = "https://noiscut-api-production.up.railway.app";

const BOT_UA_PATTERNS = [
  "Mastodon",
  "Googlebot",
  "Twitterbot",
  "facebookexternalhit",
  "LinkedInBot",
  "Slackbot",
  "Discordbot",
  "WhatsApp",
  "Pleroma",
  "Misskey",
  "Akkoma",
  "Pixelfed",
];

function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return BOT_UA_PATTERNS.some((pattern) => userAgent.includes(pattern));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);

  // ── @username public profile routes ──
  const atMatch = url.pathname.match(/^\/@([a-zA-Z0-9._]+)$/);
  if (atMatch) {
    const username = atMatch[1];
    const ua = request.headers.get("User-Agent");

    if (isBot(ua)) {
      try {
        const res = await fetch(
          `${RAILWAY_BASE}/api/users/${username}`,
          { headers: { Accept: "application/json" } }
        );

        if (!res.ok) return undefined;

        const profile = (await res.json()) as {
          username?: string;
          displayName?: string;
          bio?: string;
          avatarUrl?: string;
        };

        const displayName = profile.displayName || profile.username || username;
        const bio = profile.bio || "Photos on Infotograf";
        const avatarUrl = profile.avatarUrl
          ? profile.avatarUrl.startsWith("http")
            ? profile.avatarUrl
            : `${RAILWAY_BASE}${profile.avatarUrl}`
          : "";
        const profileUrl = `https://infotograf.com/@${username}`;
        const apUrl = `https://infotograf.com/ap/users/${username}`;

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>@${escapeHtml(username)} on Infotograf</title>
  <meta property="og:title" content="@${escapeHtml(username)} on Infotograf" />
  <meta property="og:description" content="${escapeHtml(bio)}" />
  <meta property="og:image" content="${escapeHtml(avatarUrl)}" />
  <meta property="og:url" content="${escapeHtml(profileUrl)}" />
  <meta property="og:type" content="profile" />
  <meta property="og:site_name" content="Infotograf" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="@${escapeHtml(username)} on Infotograf" />
  <meta name="twitter:description" content="${escapeHtml(bio)}" />
  <meta name="twitter:image" content="${escapeHtml(avatarUrl)}" />
  <meta name="description" content="${escapeHtml(bio)}" />
  <link rel="alternate" type="application/activity+json" href="${escapeHtml(apUrl)}" />
</head>
<body>
  <h1>${escapeHtml(displayName)} (@${escapeHtml(username)})</h1>
  <p>${escapeHtml(bio)}</p>
  <p><a href="${escapeHtml(profileUrl)}">View profile on Infotograf</a></p>
</body>
</html>`;

        return new Response(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      } catch {
        // On error, fall through to SPA
        return undefined;
      }
    }

    // Normal browser — let the SPA handle it
    return undefined;
  }

  // ── RSS feed search proxy (Feedly API) ──
  if (url.pathname === "/api/rss/search") {
    const query = url.searchParams.get("q") || "";
    const count = url.searchParams.get("count") || "12";
    const feedlyUrl = `https://cloud.feedly.com/v3/search/feeds?query=${encodeURIComponent(query)}&count=${count}`;
    try {
      const res = await fetch(feedlyUrl);
      const body = await res.text();
      return new Response(body, {
        status: res.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "https://infotograf.com",
          "Cache-Control": "public, max-age=300",
        },
      });
    } catch {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "https://infotograf.com" },
      });
    }
  }

  // ── RSS feed fetch proxy ──
  if (url.pathname === "/api/rss/fetch") {
    const feedUrl = url.searchParams.get("url");
    if (!feedUrl) {
      return new Response("Missing url parameter", { status: 400 });
    }
    try {
      const res = await fetch(feedUrl, {
        headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
      });
      const body = await res.text();
      return new Response(body, {
        status: res.status,
        headers: {
          "Content-Type": res.headers.get("Content-Type") || "text/xml",
          "Access-Control-Allow-Origin": "https://infotograf.com",
          "Cache-Control": "public, max-age=300",
        },
      });
    } catch {
      return new Response("Failed to fetch feed", { status: 502 });
    }
  }

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
  matcher: ["/@:path*", "/.well-known/:path*", "/nodeinfo/:path*", "/ap/:path*", "/api/rss/:path*"],
};
