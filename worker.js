const SOURCES = Object.freeze({
  "/wcbra": {
    name: "WCBRA",
    url: "https://westcoastbarrelracing.com/events/?ical=1",
  },
  "/nbha": {
    name: "NBHA",
    url: "https://nbha.com/shows/?ical=1",
  },
});

const CACHE_TTL_SECONDS = 900;
const USER_AGENT =
  "EnterUp-SourceRelay/1.0 (+https://enterup.org; authoritative-calendar-fetch)";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return json({
        status: "ok",
        service: "Enter Up official-source relay",
        sources: Object.keys(SOURCES),
      });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { allow: "GET, HEAD" },
      });
    }

    const source = SOURCES[url.pathname];
    if (!source) {
      return json({ error: "Unknown source" }, 404);
    }

    const cache = caches.default;
    const cacheKey = new Request(url.origin + url.pathname, { method: "GET" });
    const cached = await cache.match(cacheKey);
    if (cached) {
      return request.method === "HEAD"
        ? new Response(null, { status: cached.status, headers: cached.headers })
        : cached;
    }

    let upstream;
    try {
      upstream = await fetch(source.url, {
        redirect: "follow",
        headers: {
          accept: "text/calendar,text/plain;q=0.9,*/*;q=0.5",
          "user-agent": USER_AGENT,
        },
      });
    } catch {
      return json({ error: "Authoritative source unavailable", source: source.name }, 502);
    }

    if (!upstream.ok) {
      return json(
        {
          error: "Authoritative source returned an error",
          source: source.name,
          upstream_status: upstream.status,
        },
        502,
      );
    }

    const headers = new Headers();
    headers.set(
      "content-type",
      upstream.headers.get("content-type") || "text/calendar; charset=utf-8",
    );
    headers.set("cache-control", `public, max-age=${CACHE_TTL_SECONDS}`);
    headers.set("x-content-type-options", "nosniff");
    headers.set("x-enter-up-source", source.name);
    headers.set("x-enter-up-provenance", source.url);

    const response = new Response(upstream.body, {
      status: 200,
      headers,
    });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return request.method === "HEAD"
      ? new Response(null, { status: 200, headers })
      : response;
  },
};
