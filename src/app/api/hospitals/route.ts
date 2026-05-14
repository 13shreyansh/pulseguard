import { NextRequest, NextResponse } from "next/server";

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  nationalPhoneNumber?: string;
};
type HospitalResult = {
  id: string;
  name: string;
  address: string;
  phone?: string;
  distanceKm: number;
  source: "google_places" | "fallback";
};

const FALLBACK_HOSPITALS = [
  {
    id: "nuh",
    name: "National University Hospital",
    address: "5 Lower Kent Ridge Road, Singapore",
    latitude: 1.2931,
    longitude: 103.7846,
  },
  {
    id: "alexandra-hospital",
    name: "Alexandra Hospital",
    address: "378 Alexandra Road, Singapore",
    latitude: 1.2862,
    longitude: 103.8017,
  },
  {
    id: "ng-teng-fong",
    name: "Ng Teng Fong General Hospital",
    address: "1 Jurong East Street 21, Singapore",
    latitude: 1.3331,
    longitude: 103.7456,
  },
  {
    id: "gleneagles",
    name: "Gleneagles Hospital",
    address: "6A Napier Road, Singapore",
    latitude: 1.3077,
    longitude: 103.8206,
  },
  {
    id: "singapore-general",
    name: "Singapore General Hospital",
    address: "Outram Road, Singapore",
    latitude: 1.2807,
    longitude: 103.8346,
  },
];

function distanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const earthKm = 6371;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return Math.round(earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function parseCoordinate(value: string | null, min: number, max: number) {
  if (!value) return null;
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate) || coordinate < min || coordinate > max) {
    return null;
  }
  return coordinate;
}

function parseRadius(value: string | null) {
  if (!value) return 15000;
  const radius = Number(value);
  if (!Number.isFinite(radius)) return 15000;
  return Math.min(Math.max(Math.round(radius), 1000), 50000);
}

function fallbackHospitals(latitude: number, longitude: number): HospitalResult[] {
  return FALLBACK_HOSPITALS.map((hospital) => ({
    id: hospital.id,
    name: hospital.name,
    address: hospital.address,
    distanceKm: distanceKm(latitude, longitude, hospital.latitude, hospital.longitude),
    source: "fallback" as const,
  }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5);
}

function fallbackResponse(latitude: number, longitude: number, reason: string) {
  return NextResponse.json({
    incidentLocation: {
      label: "Current GPS location",
      latitude,
      longitude,
      source: "gps",
    },
    hospitals: fallbackHospitals(latitude, longitude),
    source: "fallback",
    warning: reason,
  });
}

export async function GET(request: NextRequest) {
  const latitude = parseCoordinate(request.nextUrl.searchParams.get("lat"), -90, 90);
  const longitude = parseCoordinate(request.nextUrl.searchParams.get("lng"), -180, 180);
  const radiusMeters = parseRadius(request.nextUrl.searchParams.get("radiusMeters"));

  if (latitude == null || longitude == null) {
    return NextResponse.json(
      { error: "lat and lng query params are required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return fallbackResponse(latitude, longitude, "Google Maps API key is not configured; showing labeled fallback hospitals.");
  }

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber",
      },
      body: JSON.stringify({
        includedTypes: ["hospital"],
        maxResultCount: 10,
        locationRestriction: {
          circle: {
            center: {
              latitude,
              longitude,
            },
            radius: radiusMeters,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return fallbackResponse(
        latitude,
        longitude,
        `Google Places search failed; showing labeled fallback hospitals. ${errorText.slice(0, 160)}`,
      );
    }

    const data = (await response.json()) as { places?: GooglePlace[] };
    const hospitals = (data.places || [])
      .map<HospitalResult | null>((place) => {
        const hospitalLatitude = place.location?.latitude;
        const hospitalLongitude = place.location?.longitude;
        if (hospitalLatitude == null || hospitalLongitude == null) return null;

        const hospital: HospitalResult = {
          id: place.id || place.displayName?.text || "hospital",
          name: place.displayName?.text || "Nearby hospital",
          address: place.formattedAddress || "Address unavailable",
          distanceKm: distanceKm(latitude, longitude, hospitalLatitude, hospitalLongitude),
          source: "google_places" as const,
        };
        if (place.nationalPhoneNumber) {
          hospital.phone = place.nationalPhoneNumber;
        }
        return hospital;
      })
      .filter((hospital): hospital is HospitalResult => Boolean(hospital))
      .filter((hospital) => !/lobby|drop off|car park|zone|clinic/i.test(hospital.name))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5);

    if (hospitals.length === 0) {
      return fallbackResponse(latitude, longitude, "Google Places returned no hospitals; showing labeled fallback hospitals.");
    }

    return NextResponse.json({
      incidentLocation: {
        label: "Current GPS location",
        latitude,
        longitude,
        source: "gps",
      },
      hospitals,
      source: "google_places",
    });
  } catch {
    return fallbackResponse(latitude, longitude, "Google Places search could not be completed; showing labeled fallback hospitals.");
  }
}
