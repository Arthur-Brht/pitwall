import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

/** Serve built application files only, never the repository or private environment. */
export function createAppServer(directory = path.join(projectRoot, "dist")) {
  const root = path.resolve(directory);
  return http.createServer(async (request, response) => {
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=()",
    );
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://tile.openstreetmap.org https://*.rainviewer.com; connect-src 'self' https://api.open-meteo.com https://ensemble-api.open-meteo.com https://geocoding-api.open-meteo.com https://api.met.no https://api.rainviewer.com https://*.rainviewer.com https://overpass-api.de; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'",
    );
    const send = (status, body, type = "text/plain; charset=utf-8") => {
      response.writeHead(status, {
        "Content-Type": type,
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(request.method === "HEAD" ? undefined : body);
    };
    if (
      !/^(localhost|127\.0\.0\.1)(:\d{1,5})?$/i.test(request.headers.host ?? "")
    )
      return send(403, "Pitwall accepts localhost requests only.");
    if (!["GET", "HEAD"].includes(request.method ?? ""))
      return send(405, "Only GET and HEAD are supported.");
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(request.url ?? "/", "http://localhost").pathname,
      );
    } catch {
      return send(400, "Invalid URL.");
    }
    if (pathname === "/__pitwall_health")
      return send(
        200,
        JSON.stringify({ app: "pitwall", mode: "localhost" }),
        "application/json",
      );
    if (pathname.includes("\0")) return send(400, "Invalid path.");
    let file = path.resolve(root, "." + pathname);
    if (file !== root && !file.startsWith(root + path.sep))
      return send(403, "Path is outside the application.");
    if (pathname.split("/").some((part) => part.startsWith(".")))
      return send(404, "Application file not found.");
    try {
      if ((await stat(file)).isDirectory())
        file = path.join(file, "index.html");
    } catch {
      if (path.extname(pathname))
        return send(404, "Application file not found.");
      file = path.join(root, "index.html");
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, {
        "Content-Type": types[path.extname(file)] ?? "application/octet-stream",
        "Cache-Control": file.includes(path.sep + "assets" + path.sep)
          ? "public, max-age=31536000, immutable"
          : "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      send(404, "Build the application with npm run build first.");
    }
  });
}

function openBrowser(url) {
  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd.exe"
        : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { stdio: "ignore", detached: true });
  child.on("error", () => console.log(`Open ${url} in your browser.`));
  child.unref();
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const portIndex = process.argv.indexOf("--port");
  const port = Number(
    portIndex >= 0
      ? process.argv[portIndex + 1]
      : process.env.PITWALL_PORT || 4173,
  );
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error("Choose a port from 1 to 65535 with --port.");
    process.exit(1);
  }
  const app = createAppServer();
  app.on("error", async (error) => {
    if (error.code === "EADDRINUSE") {
      try {
        const response = await fetch(
          `http://127.0.0.1:${port}/__pitwall_health`,
          { signal: AbortSignal.timeout(1500) },
        );
        const health = await response.json();
        if (
          response.ok &&
          health.app === "pitwall" &&
          health.mode === "localhost"
        ) {
          const url = `http://localhost:${port}/`;
          console.log(`Pitwall is already running: ${url}`);
          if (process.argv.includes("--open")) openBrowser(url);
          return;
        }
      } catch {
        /* A different application owns the port. Leave it untouched. */
      }
    }
    console.error(
      error.code === "EADDRINUSE"
        ? `Port ${port} is used by another application. Stop that application before starting Pitwall at http://localhost:${port}/.`
        : error.message,
    );
    process.exitCode = 1;
  });
  app.listen(port, "127.0.0.1", () => {
    const url = `http://localhost:${port}/`;
    console.log(
      `\nPitwall is ready: ${url}\nRuns only on this computer. Keep this window open; press Control-C to stop.\n`,
    );
    if (process.argv.includes("--open")) openBrowser(url);
  });
  const stop = () => app.close(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
