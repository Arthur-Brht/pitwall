import { Cloud, CloudRain, Sun } from "lucide-react";
export function WeatherIcon({
  rain,
  cloud,
  size = 20,
}: {
  rain: number | null;
  cloud?: number | null;
  size?: number;
}) {
  if (rain === null && (cloud === null || cloud === undefined))
    return <Cloud size={size} style={{ opacity: 0.4 }} />;
  return rain !== null && rain >= 0.1 ? (
    <CloudRain size={size} />
  ) : cloud !== null && cloud !== undefined && cloud > 55 ? (
    <Cloud size={size} />
  ) : (
    <Sun size={size} />
  );
}
export function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty-state">
      <Cloud size={28} />
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}
