const externalHosts = new Set([
  "open-meteo.com",
  "api.open-meteo.com",
  "api.met.no",
  "api.rainviewer.com",
  "www.rainviewer.com",
  "www.openstreetmap.org",
  "www.ecmwf.int",
  "www.dwd.de",
  "www.noaa.gov",
  "meteofrance.com",
  "api.ipma.pt",
]);

export function externalLink(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return null;
    if (externalHosts.has(url.hostname)) return url.href;
    if (
      url.hostname === "github.com" &&
      /^\/Arthur-Brht\/pitwall-(?:\/|$)/.test(url.pathname)
    )
      return url.href;
  } catch {
    /* Invalid and non-HTTPS links are never opened. */
  }
  return null;
}

export function isAppPage(value, origin) {
  try {
    const url = new URL(value);
    return url.origin === origin && url.pathname === "/";
  } catch {
    return false;
  }
}

export function isAppDownload(value, origin) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "blob:" && url.origin === origin) ||
      (url.origin === origin && url.pathname === "/THIRD_PARTY_NOTICES.txt")
    );
  } catch {
    return false;
  }
}
