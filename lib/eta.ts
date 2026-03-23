type Coordinates = {
  latitude: number;
  longitude: number;
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function getDistanceMiles(from: Coordinates, to: Coordinates) {
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMiles * c;
}

export function getRoughEtaMinutes(from: Coordinates, to: Coordinates) {
  const miles = getDistanceMiles(from, to);

  if (miles < 0.15) return 1;

  const estimatedMinutes = (miles / 22) * 60;
  return Math.max(2, Math.round(estimatedMinutes));
}

export function formatEtaLabel(from?: Coordinates | null, to?: Coordinates | null) {
  if (!from || !to) return null;

  const miles = getDistanceMiles(from, to);
  const minutes = getRoughEtaMinutes(from, to);

  return {
    minutes,
    miles,
    summary: minutes <= 1 ? "About 1 min away" : `About ${minutes} min away`,
  };
}
