/* Pitwall app-shell cache. No provider responses, radar tiles or weather API data are cached. */
const SCOPE = self.registration.scope;
const CACHE_PREFIX = `pitwall-shell-${encodeURIComponent(new URL(SCOPE).pathname)}-`;
const CACHE_NAME = `${CACHE_PREFIX}__PITWALL_BUILD__`;
const SHELL_URL = new URL("index.html", SCOPE).href;
const STATIC_FILES = [
  "manifest.webmanifest",
  "favicon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const shell = await fetch(SHELL_URL, { cache: "reload" });
      if (!shell.ok) throw new Error("App shell could not be downloaded.");
      const html = await shell.text();
      await cache.put(
        SHELL_URL,
        new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
      );
      // Vite hashes the module and stylesheet names. Cache only this shell's own assets.
      const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
        .map((match) => new URL(match[1], SHELL_URL))
        .filter(
          (url) =>
            url.origin === self.location.origin &&
            url.href.startsWith(SCOPE) &&
            /\.(?:js|css)$/.test(url.pathname),
        )
        .map((url) => url.href);
      await cache.addAll([
        ...new Set([
          ...STATIC_FILES.map((file) => new URL(file, SCOPE).href),
          ...(self.__PITWALL_ASSETS__ || []).map(
            (file) => new URL(file, SCOPE).href,
          ),
          ...assets,
        ]),
      ]);
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.href.startsWith(SCOPE) ||
    url.pathname.includes("/api/")
  )
    return;
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (
            response.ok &&
            (response.headers.get("content-type") || "").includes("text/html")
          ) {
            const cache = await caches.open(CACHE_NAME);
            const html = await response.clone().text();
            const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
              .map((match) => new URL(match[1], SHELL_URL))
              .filter(
                (url) =>
                  url.origin === self.location.origin &&
                  url.href.startsWith(SCOPE) &&
                  /\.(?:js|css)$/.test(url.pathname),
              )
              .map((url) => url.href);
            // Keep a working shell when an update is interrupted before its modules arrive.
            await cache.addAll(assets);
            await cache.put(
              SHELL_URL,
              new Response(html, {
                headers: { "Content-Type": "text/html; charset=utf-8" },
              }),
            );
          }
          return response;
        } catch {
          return (
            (await caches.match(SHELL_URL)) ||
            new Response(
              "Pitwall needs an online visit before the app can open offline.",
              {
                status: 503,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
              },
            )
          );
        }
      })(),
    );
    return;
  }
  // Browser-local API dispatch never reaches this branch; cross-origin weather is ignored above.
  if (
    !["script", "style", "image", "font"].includes(request.destination) &&
    !url.pathname.endsWith(".webmanifest")
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const existing = await cache.match(request);
      if (existing) return existing;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })(),
  );
});
