// Approximate coordinates for major IT hubs and cities
// Prevents invasive exact location tracking while allowing accurate distance matching
export const CITY_COORDINATES: Record<string, { lat: number; lng: number; state?: string; country: string }> = {
  noida: { lat: 28.5355, lng: 77.391, state: "Uttar Pradesh", country: "India" },
  "greater noida": { lat: 28.4744, lng: 77.504, state: "Uttar Pradesh", country: "India" },
  gurgaon: { lat: 28.4595, lng: 77.0266, state: "Haryana", country: "India" },
  gurugram: { lat: 28.4595, lng: 77.0266, state: "Haryana", country: "India" },
  delhi: { lat: 28.7041, lng: 77.1025, state: "Delhi", country: "India" },
  "new delhi": { lat: 28.6139, lng: 77.209, state: "Delhi", country: "India" },
  "delhi ncr": { lat: 28.6139, lng: 77.209, state: "Delhi", country: "India" },
  ghaziabad: { lat: 28.6692, lng: 77.4538, state: "Uttar Pradesh", country: "India" },
  faridabad: { lat: 28.4089, lng: 77.3178, state: "Haryana", country: "India" },
  bengaluru: { lat: 12.9716, lng: 77.5946, state: "Karnataka", country: "India" },
  bangalore: { lat: 12.9716, lng: 77.5946, state: "Karnataka", country: "India" },
  hyderabad: { lat: 17.385, lng: 78.4867, state: "Telangana", country: "India" },
  pune: { lat: 18.5204, lng: 73.8567, state: "Maharashtra", country: "India" },
  mumbai: { lat: 19.076, lng: 72.8777, state: "Maharashtra", country: "India" },
  chennai: { lat: 13.0827, lng: 80.2707, state: "Tamil Nadu", country: "India" },
  kolkata: { lat: 22.5726, lng: 88.3639, state: "West Bengal", country: "India" },
  chandigarh: { lat: 30.7333, lng: 76.7794, state: "Punjab", country: "India" },
  jaipur: { lat: 26.9124, lng: 75.7873, state: "Rajasthan", country: "India" },
  sanfrancisco: { lat: 37.7749, lng: -122.4194, state: "CA", country: "USA" },
  newyork: { lat: 40.7128, lng: -74.006, state: "NY", country: "USA" },
  london: { lat: 51.5074, lng: -0.1278, country: "UK" },
  berlin: { lat: 52.52, lng: 13.405, country: "Germany" },
  singapore: { lat: 1.3521, lng: 103.8198, country: "Singapore" },
  toronto: { lat: 43.6532, lng: -79.3832, country: "Canada" },
};

export function normalizeCityName(raw: string): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
}

export function getApproximateCoordinates(locationStr: string): { lat: number; lng: number } | null {
  if (!locationStr) return null;
  const clean = normalizeCityName(locationStr);

  for (const [cityKey, coords] of Object.entries(CITY_COORDINATES)) {
    if (clean.includes(cityKey) || cityKey.includes(clean)) {
      return { lat: coords.lat, lng: coords.lng };
    }
  }
  return null;
}

// Haversine formula to compute great-circle distance between two points in km
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export type DistanceCategory = "0–10 km" | "10–25 km" | "25–50 km" | "50+ km" | "Remote";

export function categorizeDistance(
  distanceKm: number | null | undefined,
  workMode: string
): DistanceCategory {
  if (workMode.toLowerCase() === "remote") {
    return "Remote";
  }

  if (distanceKm === null || distanceKm === undefined) {
    return "50+ km";
  }

  if (distanceKm <= 10) return "0–10 km";
  if (distanceKm <= 25) return "10–25 km";
  if (distanceKm <= 50) return "25–50 km";
  return "50+ km";
}
