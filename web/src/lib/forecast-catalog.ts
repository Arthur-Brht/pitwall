export type ModelSpec = {
  id: string;
  name: string;
  model: string;
  provider: string;
  family: string;
  color: string;
  resolution: string;
  optional?: boolean;
};

export const MODEL_SPECS: ModelSpec[] = [
  {
    id: "ecmwf",
    name: "ECMWF IFS",
    model: "ecmwf_ifs025",
    provider: "ECMWF",
    family: "ecmwf",
    color: "#c8f36b",
    resolution: "Global · 0.25° (~25 km)",
  },
  {
    id: "icon",
    name: "DWD ICON",
    model: "icon_seamless",
    provider: "Deutscher Wetterdienst",
    family: "icon",
    color: "#70c5fa",
    resolution: "Global / regional · ~2–11 km",
  },
  {
    id: "gfs",
    name: "NOAA GFS",
    model: "gfs_seamless",
    provider: "NOAA / NCEP",
    family: "gfs",
    color: "#c1a0ff",
    resolution: "Global / regional · ~3–25 km",
  },
  {
    id: "meteofrance",
    name: "Météo-France",
    model: "meteofrance_seamless",
    provider: "Météo-France",
    family: "meteofrance",
    color: "#ffb36d",
    resolution: "AROME / ARPEGE · ~1–25 km",
  },
  {
    id: "ukmo",
    name: "UK Met Office",
    model: "ukmo_seamless",
    provider: "UK Met Office",
    family: "ukmo",
    color: "#58c9b9",
    resolution: "Global / UK regional · ~2–10 km",
  },
  {
    id: "gem",
    name: "Canada GEM",
    model: "gem_seamless",
    provider: "Environment and Climate Change Canada",
    family: "gem",
    color: "#ee8e94",
    resolution: "Global / Canadian regional · ~2.5–15 km",
  },
  {
    id: "jma",
    name: "Japan JMA",
    model: "jma_seamless",
    provider: "Japan Meteorological Agency",
    family: "jma",
    color: "#e0c36e",
    resolution: "Global / Japanese regional · ~5–55 km",
  },
  {
    id: "knmi",
    name: "KNMI HARMONIE",
    model: "knmi_seamless",
    provider: "KNMI",
    family: "meteofrance",
    color: "#a4cba0",
    resolution: "Regional Europe · ~2.5–5.5 km · related to AROME",
    optional: true,
  },
  {
    id: "italiameteo",
    name: "ItaliaMeteo ICON-2I",
    model: "italia_meteo_arpae_icon_2i",
    provider: "ItaliaMeteo / ARPAE",
    family: "icon",
    color: "#91aedb",
    resolution: "Regional Italy · ~2 km · related to ICON",
    optional: true,
  },
];
export const SOURCE_CATALOG = [
  ...MODEL_SPECS,
  {
    id: "metno",
    name: "MET Norway",
    provider: "MET Norway",
    resolution: "Global / Nordic regional · shares ECMWF ancestry",
    optional: false,
  },
];
export const SOURCE_IDS = SOURCE_CATALOG.map((source) => source.id);
export const DEFAULT_SOURCE_IDS = SOURCE_CATALOG.filter(
  (source) => !source.optional,
).map((source) => source.id);

export function selectedSources(value: string | null): string[] {
  if (value === null) return DEFAULT_SOURCE_IDS;
  const ids = [...new Set(value.split(","))];
  if (!ids.length || ids.some((id) => !SOURCE_IDS.includes(id)))
    throw new RangeError("Choose at least one available forecast source.");
  return ids;
}
