import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
  businessStatus?: string;
};

type Candidate = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  travelTimeMinutes?: number;
  mapsUrl: string;
  appearsOperational?: boolean;
};

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function coordinate(value: string | null, min: number, max: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function distanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const radius = 6371;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((fromLat * Math.PI) / 180) * Math.cos((toLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function unavailable(latitude: number, longitude: number) {
  return response({
    source: "unavailable",
    warning: "Nearby hospital data is unavailable. The controlled desk will confirm any destination.",
    incidentLocation: { label: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, latitude, longitude, source: "gps" },
    hospitals: [],
  });
}

async function timedFetch(url: string, init: RequestInit, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function addTravelTimes(latitude: number, longitude: number, candidates: Candidate[], key: string) {
  if (!candidates.length) return candidates;
  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", `${latitude},${longitude}`);
  url.searchParams.set("destinations", candidates.map((item) => `${item.latitude},${item.longitude}`).join("|"));
  url.searchParams.set("mode", "driving");
  url.searchParams.set("key", key);
  try {
    const result = await timedFetch(url.toString(), {});
    if (!result.ok) return candidates;
    const data = (await result.json()) as { rows?: Array<{ elements?: Array<{ status?: string; duration?: { value?: number } }> }> };
    const elements = data.rows?.[0]?.elements || [];
    return candidates.map((candidate, index) => {
      const seconds = elements[index]?.status === "OK" ? elements[index]?.duration?.value : undefined;
      return seconds ? { ...candidate, travelTimeMinutes: Math.max(1, Math.round(seconds / 60)) } : candidate;
    });
  } catch {
    return candidates;
  }
}

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, { name: "hospital-context", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  const latitude = coordinate(request.nextUrl.searchParams.get("lat"), -90, 90);
  const longitude = coordinate(request.nextUrl.searchParams.get("lng"), -180, 180);
  if (latitude == null || longitude == null) return response({ error: "Valid lat and lng query parameters are required." }, 400);

  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return unavailable(latitude, longitude);

  try {
    const nearby = await timedFetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.businessStatus",
      },
      body: JSON.stringify({
        includedTypes: ["hospital"],
        maxResultCount: 8,
        locationRestriction: { circle: { center: { latitude, longitude }, radius: 15_000 } },
      }),
    });
    if (!nearby.ok) return unavailable(latitude, longitude);
    const data = (await nearby.json()) as { places?: GooglePlace[] };
    const base = (data.places || []).flatMap<Candidate>((place) => {
      const lat = place.location?.latitude;
      const lng = place.location?.longitude;
      if (lat == null || lng == null) return [];
      return [{
        id: place.id || `${lat},${lng}`,
        name: place.displayName?.text || "Nearby hospital",
        address: place.formattedAddress || "Address unavailable",
        latitude: lat,
        longitude: lng,
        distanceKm: distanceKm(latitude, longitude, lat, lng),
        mapsUrl: place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        ...(place.businessStatus ? { appearsOperational: place.businessStatus === "OPERATIONAL" } : {}),
      }];
    });
    const withTravel = await addTravelTimes(latitude, longitude, base, key);
    const hospitals = withTravel
      .sort((a, b) => (a.travelTimeMinutes ?? 10_000) - (b.travelTimeMinutes ?? 10_000) || a.distanceKm - b.distanceKm)
      .slice(0, 3)
      .map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        address: candidate.address,
        distanceKm: candidate.distanceKm,
        ...(candidate.travelTimeMinutes != null ? { travelTimeMinutes: candidate.travelTimeMinutes } : {}),
        mapsUrl: candidate.mapsUrl,
        ...(candidate.appearsOperational != null ? { appearsOperational: candidate.appearsOperational } : {}),
      }));
    if (!hospitals.length) return unavailable(latitude, longitude);
    return response({
      source: "google_places",
      warning: "Emergency capability and availability are not verified.",
      incidentLocation: { label: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, latitude, longitude, source: "gps" },
      hospitals,
    });
  } catch {
    return unavailable(latitude, longitude);
  }
}
