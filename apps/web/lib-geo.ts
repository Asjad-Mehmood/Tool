import proj4 from "proj4";

// Common systems. UTM zones are defined on demand; extra national grids can be added here.
export const SYSTEMS: Record<string, { label: string; def: string }> = {
  "EPSG:4326": { label: "WGS84 Lat/Long", def: "+proj=longlat +datum=WGS84 +no_defs" },
  "EPSG:3857": { label: "Web Mercator", def: "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +no_defs" },
  "EPSG:2932": { label: "Qatar National Grid (QND95)", def: "+proj=tmerc +lat_0=24.45 +lon_0=51.21666666666667 +k=0.99999 +x_0=200000 +y_0=300000 +ellps=intl +towgs84=-119.4248,-303.65872,-11.00061,0,0,0,0 +units=m +no_defs" },
  "EPSG:3997": { label: "UAE Dubai Local TM", def: "+proj=tmerc +lat_0=0 +lon_0=55.33333333333334 +k=1 +x_0=500000 +y_0=0 +ellps=intl +towgs84=-86,-98,-119,0,0,0,0 +units=m +no_defs" },
};
for (let z = 1; z <= 60; z++) {
  SYSTEMS[`UTM-${z}N`] = { label: `UTM zone ${z}N (WGS84)`, def: `+proj=utm +zone=${z} +datum=WGS84 +units=m +no_defs` };
  SYSTEMS[`UTM-${z}S`] = { label: `UTM zone ${z}S (WGS84)`, def: `+proj=utm +zone=${z} +south +datum=WGS84 +units=m +no_defs` };
}
export const systemOptions = Object.entries(SYSTEMS).map(([value, s]) => ({ value, label: s.label }));

export function convert(from: string, to: string, x: number, y: number): [number, number] {
  return proj4(SYSTEMS[from].def, SYSTEMS[to].def, [x, y]) as [number, number];
}
export const utmZone = (lon: number) => Math.min(60, Math.max(1, Math.floor((lon + 180) / 6) + 1));

const R = 6371008.8;
const rad = (d: number) => (d * Math.PI) / 180, deg = (r: number) => (r * 180) / Math.PI;
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
export function initialBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const y = Math.sin(rad(lon2 - lon1)) * Math.cos(rad(lat2));
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lon2 - lon1));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}
export function destination(lat: number, lon: number, bearing: number, dist: number): [number, number] {
  const d = dist / R, b = rad(bearing), p1 = rad(lat), l1 = rad(lon);
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [deg(p2), ((deg(l2) + 540) % 360) - 180];
}
export const toDms = (v: number, axis?: "lat" | "lon") => {
  const a = Math.abs(v), d = Math.floor(a), m = Math.floor((a - d) * 60), s = ((a - d) * 60 - m) * 60;
  const h = axis === "lat" ? (v < 0 ? "S" : "N") : axis === "lon" ? (v < 0 ? "W" : "E") : v < 0 ? "-" : "";
  return axis ? `${d}° ${m}′ ${s.toFixed(3)}″ ${h}` : `${h}${d}° ${m}′ ${s.toFixed(3)}″`;
};
export const parseNum = (s: string) => parseFloat(s.replace(",", "."));
