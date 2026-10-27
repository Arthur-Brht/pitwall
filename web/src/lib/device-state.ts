import type { Session, Track, TrackReading } from "./contracts";
import { SOURCE_IDS } from "./forecast-catalog.ts";
import { localEpoch } from "./local-time.ts";
import { TRACKS, validTrack } from "./tracks.ts";
import { validFocus, type FocusSelection } from "./session-focus.ts";

export type Preferences = {
  favorites: Track[];
  track: Track;
  disabled: string[];
  threshold: number;
  gustLimit: number;
  sourceSelections?: Record<string, string[]>;
  trackReadings?: Record<string, TrackReading>;
  sidebarOpen?: boolean;
  focusSelections?: Record<string, FocusSelection>;
};
export type DeviceBackup = {
  format: "pitwall-device-backup";
  version: 1;
  exportedAt: string;
  preferences: Preferences;
  sessions: Session[];
};
const object = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const knownTrack = (track: Track) =>
  TRACKS.find((t) => t.id === track.id) ?? track;
const uniqueTracks = (tracks: Track[]) => [
  ...new Map(tracks.map((t) => [t.id, t])).values(),
];

export function validSession(value: unknown): value is Session {
  if (!object(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.id.length <= 200 &&
    typeof value.trackId === "string" &&
    value.trackId.length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    value.name.length <= 60 &&
    typeof value.date === "string" &&
    typeof value.time === "string" &&
    Number.isFinite(localEpoch(value.date, value.time, "UTC")) &&
    Number.isInteger(value.duration) &&
    value.duration >= 5 &&
    value.duration <= 1440 &&
    (value.track === undefined ||
      (validTrack(value.track) && value.track.id === value.trackId))
  );
}

export function parsePreferences(value: unknown): Preferences {
  if (
    !object(value) ||
    !validTrack(value.track) ||
    !Array.isArray(value.favorites) ||
    !value.favorites.length ||
    value.favorites.length > 500 ||
    !value.favorites.every(validTrack)
  ) {
    throw new Error(
      "The backup does not contain valid saved circuits and a selected location.",
    );
  }
  if (
    !Array.isArray(value.disabled) ||
    value.disabled.some((id: unknown) => typeof id !== "string") ||
    ![0.1, 0.2, 0.5, 1].includes(value.threshold) ||
    ![25, 30, 40, 50, 60].includes(value.gustLimit)
  ) {
    throw new Error("The backup contains invalid weather preferences.");
  }
  const track = knownTrack(value.track);
  if (value.sidebarOpen !== undefined && typeof value.sidebarOpen !== "boolean")
    throw new Error("Invalid saved sidebar preference.");
  if (
    value.focusSelections !== undefined &&
    (!object(value.focusSelections) ||
      Object.keys(value.focusSelections).length > 500 ||
      Object.entries(value.focusSelections).some(
        ([key, selection]) => key.length > 100 || !validFocus(selection),
      ))
  )
    throw new Error("Invalid saved session focus.");
  const sourceSelections: Record<string, string[]> = {};
  if (value.sourceSelections !== undefined) {
    if (
      !object(value.sourceSelections) ||
      Object.keys(value.sourceSelections).length > 500
    )
      throw new Error("Invalid saved forecast selections.");
    for (const [key, ids] of Object.entries(value.sourceSelections)) {
      if (
        key.length > 100 ||
        !Array.isArray(ids) ||
        !ids.length ||
        ids.length > SOURCE_IDS.length ||
        ids.some((id) => typeof id !== "string" || !SOURCE_IDS.includes(id))
      )
        throw new Error("Invalid saved forecast selections.");
      Object.defineProperty(sourceSelections, key, {
        value: [...new Set(ids)],
        enumerable: true,
      });
    }
  }
  const trackReadings: Record<string, TrackReading> = {};
  if (value.trackReadings !== undefined) {
    if (
      !object(value.trackReadings) ||
      Object.keys(value.trackReadings).length > 500
    )
      throw new Error("Invalid saved track readings.");
    for (const [key, reading] of Object.entries(value.trackReadings)) {
      if (
        key.length > 100 ||
        !object(reading) ||
        !Number.isFinite(reading.temperature) ||
        reading.temperature < -50 ||
        reading.temperature > 100 ||
        typeof reading.recordedAt !== "string" ||
        !Number.isFinite(Date.parse(reading.recordedAt))
      )
        throw new Error("Invalid saved track reading.");
      Object.defineProperty(trackReadings, key, {
        value: {
          temperature: reading.temperature,
          recordedAt: reading.recordedAt,
        },
        enumerable: true,
      });
    }
  }
  return {
    favorites: uniqueTracks([...value.favorites.map(knownTrack), track]),
    track,
    disabled: [...new Set<string>(value.disabled)].filter((id) =>
      SOURCE_IDS.includes(id),
    ),
    threshold: value.threshold,
    gustLimit: value.gustLimit,
    ...(value.sidebarOpen !== undefined
      ? { sidebarOpen: value.sidebarOpen }
      : {}),
    ...(value.focusSelections !== undefined
      ? { focusSelections: value.focusSelections }
      : {}),
    ...(value.sourceSelections !== undefined ? { sourceSelections } : {}),
    ...(value.trackReadings !== undefined ? { trackReadings } : {}),
  };
}

export function createBackup(
  preferences: Preferences,
  sessions: Session[],
  now = new Date(),
): DeviceBackup {
  return {
    format: "pitwall-device-backup",
    version: 1,
    exportedAt: now.toISOString(),
    preferences,
    sessions,
  };
}

export function parseBackup(text: string): DeviceBackup {
  if (new TextEncoder().encode(text).length > 1048576)
    throw new Error("Choose a Pitwall backup smaller than 1 MB.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(
      "This file is not valid JSON. Choose an exported Pitwall backup.",
    );
  }
  if (
    !object(value) ||
    value.format !== "pitwall-device-backup" ||
    value.version !== 1
  ) {
    throw new Error(
      "This file is not a supported Pitwall device backup (version 1).",
    );
  }
  const preferences = parsePreferences(value.preferences);
  if (
    !Array.isArray(value.sessions) ||
    value.sessions.length > 5000 ||
    !value.sessions.every(validSession)
  ) {
    throw new Error(
      "The backup contains an invalid session. No data were imported.",
    );
  }
  const tracks = uniqueTracks([...TRACKS, ...preferences.favorites]);
  const sessions: Session[] = value.sessions.map((session: Session) => {
    const track = session.track
      ? knownTrack(session.track)
      : tracks.find((t) => t.id === session.trackId);
    if (
      !track ||
      !Number.isFinite(localEpoch(session.date, session.time, track.timezone))
    ) {
      throw new Error(
        `The circuit or local time for “${session.name}” is invalid. No data were imported.`,
      );
    }
    return { ...session, track };
  });
  return createBackup(preferences, sessions);
}

/** Merge plans without deleting or overwriting an existing session. */
export function mergeBackup(
  current: Preferences,
  sessions: Session[],
  backup: DeviceBackup,
  newId: () => string,
) {
  const locations = new Map<string, Track>();
  for (const location of [
    current.track,
    ...current.favorites,
    ...sessions.flatMap((s) => (s.track ? [s.track] : [])),
    backup.preferences.track,
    ...backup.preferences.favorites,
    ...backup.sessions.flatMap((s) => (s.track ? [s.track] : [])),
  ]) {
    const existing = locations.get(location.id);
    if (
      existing &&
      (existing.lat !== location.lat ||
        existing.lon !== location.lon ||
        existing.timezone !== location.timezone)
    ) {
      throw new Error(
        "A saved circuit in this backup has conflicting coordinates or timezone. Nothing was imported.",
      );
    }
    locations.set(location.id, location);
  }
  const favorites = uniqueTracks([
    ...backup.preferences.favorites,
    ...current.favorites,
    ...sessions.flatMap((s) => (s.track ? [s.track] : [])),
    ...backup.sessions.flatMap((s) => (s.track ? [s.track] : [])),
  ]);
  const merged = [...sessions];
  const signature = (s: Session) =>
    JSON.stringify([s.trackId, s.name, s.date, s.time, s.duration]);
  const existing = new Set(merged.map(signature));
  const ids = new Set(merged.map((s) => s.id));
  for (const session of backup.sessions) {
    if (existing.has(signature(session))) continue;
    const id = ids.has(session.id) ? newId() : session.id;
    merged.push({ ...session, id });
    ids.add(id);
    existing.add(signature(session));
  }
  return {
    preferences: {
      ...backup.preferences,
      favorites,
      sourceSelections: {
        ...current.sourceSelections,
        ...backup.preferences.sourceSelections,
      },
      focusSelections: {
        ...current.focusSelections,
        ...backup.preferences.focusSelections,
      },
      trackReadings: Object.fromEntries(
        [
          ...Object.entries(current.trackReadings ?? {}),
          ...Object.entries(backup.preferences.trackReadings ?? {}),
        ].sort(
          ([, a], [, b]) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt),
        ),
      ),
    },
    sessions: merged,
    added: merged.length - sessions.length,
  };
}
