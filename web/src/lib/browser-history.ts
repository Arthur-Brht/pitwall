import type { HistoryPoint, WeatherResponse } from "./contracts";

const DATABASE = "pitwall-browser-weather";
const VERSION = 1;
export const MAX_POINTS_PER_LOCATION = 30000;
const RETENTION_MS = 7 * 86400000;
type StoredPoint = HistoryPoint & { id: string; locationKey: string };
type CacheRecord<T = unknown> = {
  key: string;
  expires: number;
  retainUntil?: number;
  value: T;
};
let databasePromise: Promise<IDBDatabase | null> | null = null;
const memoryCache = new Map<string, CacheRecord>();

export const locationKey = (lat: number, lon: number) =>
  `${lat.toFixed(4)},${lon.toFixed(4)}`;

function openDatabase(): Promise<IDBDatabase | null> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(DATABASE, VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("history")) {
          const history = db.createObjectStore("history", { keyPath: "id" });
          history.createIndex("locationFetched", ["locationKey", "fetchedAt"]);
          history.createIndex("fetchedAt", "fetchedAt");
        }
        if (!db.objectStoreNames.contains("cache"))
          db.createObjectStore("cache", { keyPath: "key" });
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          databasePromise = null;
        };
        resolve(db);
      };
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return databasePromise;
}

export async function readCache<T>(
  key: string,
  options: { allowStale?: boolean } = {},
): Promise<T | null> {
  const memory = memoryCache.get(key);
  const usable = (record: CacheRecord) =>
    (options.allowStale
      ? (record.retainUntil ?? record.expires)
      : record.expires) > Date.now();
  if (memory && usable(memory)) return memory.value as T;
  if (memory && (memory.retainUntil ?? memory.expires) <= Date.now())
    memoryCache.delete(key);
  const db = await openDatabase();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const request = db
        .transaction("cache", "readonly")
        .objectStore("cache")
        .get(key);
      request.onsuccess = () => {
        const record = request.result as CacheRecord<T> | undefined;
        if (record && usable(record)) {
          memoryCache.set(key, record);
          resolve(record.value);
        } else resolve(null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function writeCache<T>(
  key: string,
  value: T,
  expires: number,
  retainUntil = expires,
): Promise<void> {
  if (memoryCache.size > 150)
    memoryCache.delete(memoryCache.keys().next().value!);
  memoryCache.set(key, { key, value, expires, retainUntil });
  const db = await openDatabase();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction("cache", "readwrite");
      const store = tx.objectStore("cache");
      store.put({ key, value, expires, retainUntil });
      // A bounded cleanup keeps stale place/radar caches from accumulating indefinitely.
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if ((cursor.value.retainUntil ?? cursor.value.expires) <= Date.now())
          cursor.delete();
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function snapshotRows(weather: WeatherResponse): StoredPoint[] {
  const key = locationKey(weather.location.lat, weather.location.lon);
  return weather.forecasts.flatMap((forecast) =>
    forecast.hours.slice(0, 24).map((hour) => ({
      id: `${key}|${forecast.id}|${forecast.fetchedAt}|${hour.time}`,
      locationKey: key,
      fetchedAt: forecast.fetchedAt,
      provider: forecast.id,
      forecastTime: hour.time,
      temperature: hour.temperature,
      precipitation: hour.precipitation,
      wind: hour.wind,
    })),
  );
}

/** Keep actual snapshots only; there is no seeded or simulated weather history. */
export async function logWeather(
  weather: WeatherResponse,
): Promise<{ saved: boolean; message: string }> {
  const db = await openDatabase();
  if (!db)
    return {
      saved: false,
      message:
        "Browser storage is unavailable or blocked. Forecasts still work; history cannot be saved on this device.",
    };
  const rows = snapshotRows(weather),
    key = locationKey(weather.location.lat, weather.location.lon);
  if (!rows.length)
    return {
      saved: false,
      message: "No successful forecast snapshots were available to save.",
    };
  return new Promise((resolve) => {
    try {
      const tx = db.transaction("history", "readwrite"),
        store = tx.objectStore("history");
      rows.forEach((row) => store.put(row));
      const old = store
        .index("fetchedAt")
        .openCursor(
          IDBKeyRange.upperBound(
            new Date(Date.now() - RETENTION_MS).toISOString(),
            true,
          ),
        );
      old.onsuccess = () => {
        const cursor = old.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      const request = store
        .index("locationFetched")
        .getAll(IDBKeyRange.bound([key, ""], [key, "\uffff"]));
      request.onsuccess = () => {
        const points = (request.result as StoredPoint[]).sort(
          (a, b) =>
            b.fetchedAt.localeCompare(a.fetchedAt) || a.id.localeCompare(b.id),
        );
        const olderThan = new Date(Date.now() - 6 * 3600000).toISOString();
        const hourly = new Set<string>();
        let kept = 0;
        for (const point of points) {
          const bucket = `${point.provider}|${point.forecastTime}|${point.fetchedAt.slice(0, 13)}`;
          // Preserve recent changes; compact older captures to their latest actual fetch per UTC hour.
          if (
            (point.fetchedAt < olderThan && hourly.has(bucket)) ||
            kept >= MAX_POINTS_PER_LOCATION
          )
            store.delete(point.id);
          else {
            kept++;
            if (point.fetchedAt < olderThan) hourly.add(bucket);
          }
        }
      };
      tx.oncomplete = () =>
        resolve({
          saved: true,
          message:
            "Real forecast snapshots saved in this browser's IndexedDB. First 24 hours per source, up to 30,000 points per location over seven days. Captures older than six hours retain the latest actual fetch per UTC hour. Device-local only.",
        });
      tx.onerror = () =>
        resolve({
          saved: false,
          message:
            "This browser could not save history, possibly because storage is full or blocked. Forecasts still work.",
        });
      tx.onabort = tx.onerror;
    } catch {
      resolve({
        saved: false,
        message:
          "History storage is unavailable in this browser. Forecasts still work.",
      });
    }
  });
}

export async function readHistory(
  lat: number,
  lon: number,
): Promise<{ points: HistoryPoint[]; message: string }> {
  const db = await openDatabase();
  if (!db)
    return {
      points: [],
      message:
        "History is stored only in this browser. IndexedDB is unavailable or blocked on this device.",
    };
  const key = locationKey(lat, lon),
    cutoff = new Date(Date.now() - RETENTION_MS).toISOString();
  return new Promise((resolve) => {
    try {
      const request = db
        .transaction("history", "readonly")
        .objectStore("history")
        .index("locationFetched")
        .getAll(IDBKeyRange.bound([key, cutoff], [key, "\uffff"]));
      request.onsuccess = () =>
        resolve({
          points: (request.result as StoredPoint[])
            .sort(
              (a, b) =>
                b.fetchedAt.localeCompare(a.fetchedAt) ||
                a.forecastTime - b.forecastTime,
            )
            .slice(0, MAX_POINTS_PER_LOCATION)
            .map(({ id: _id, locationKey: _key, ...point }) => point),
          message:
            "Refresh later to see how this forecast changes. Snapshots stay on this device for seven days.",
        });
      request.onerror = () =>
        resolve({
          points: [],
          message: "Saved history could not be read in this browser.",
        });
    } catch {
      resolve({
        points: [],
        message: "Saved history is unavailable in this browser.",
      });
    }
  });
}
