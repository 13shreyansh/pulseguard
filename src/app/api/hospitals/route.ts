import { NextResponse } from "next/server";

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
};

const UTOWN_LOCATION = {
  label: "Acacia College, NUS",
  latitude: 1.3071479,
  longitude: 103.7725891,
};
const FALLBACK_HOSPITALS: HospitalResult[] = [
  {
    id: "nuh",
    name: "National University Hospital",
    address: "5 Lower Kent Ridge Road, Singapore",
    distanceKm: 1.8,
  },
  {
    id: "alexandra-hospital",
    name: "Alexandra Hospital",
    address: "378 Alexandra Road, Singapore",
    distanceKm: 4.6,
  },
  {
    id: "ng-teng-fong",
    name: "Ng Teng Fong General Hospital",
    address: "1 Jurong East Street 21, Singapore",
    distanceKm: 4.3,
  },
  {
    id: "gleneagles",
    name: "Gleneagles Hospital",
    address: "6A Napier Road, Singapore",
    distanceKm: 5.2,
  },
  {
    id: "singapore-general",
    name: "Singapore General Hospital",
    address: "Outram Road, Singapore",
    distanceKm: 9.2,
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

export async function GET() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Google Maps API key is not configured" }, { status: 500 });
  }

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
            latitude: UTOWN_LOCATION.latitude,
            longitude: UTOWN_LOCATION.longitude,
          },
          radius: 15000,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: "Hospital search failed", details: errorText.slice(0, 300) },
      { status: 502 },
    );
  }

  const data = (await response.json()) as { places?: GooglePlace[] };
  const apiHospitals = (data.places || [])
    .map((place) => {
      const latitude = place.location?.latitude || UTOWN_LOCATION.latitude;
      const longitude = place.location?.longitude || UTOWN_LOCATION.longitude;
      return {
        id: place.id || place.displayName?.text || "hospital",
        name: place.displayName?.text || "Nearby hospital",
        address: place.formattedAddress || "Address unavailable",
        phone: place.nationalPhoneNumber,
        distanceKm: distanceKm(UTOWN_LOCATION.latitude, UTOWN_LOCATION.longitude, latitude, longitude),
      };
    })
    .filter((hospital) => !/lobby|drop off|car park|zone|clinic/i.test(hospital.name))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5);
  const seen = new Set(apiHospitals.map((hospital) => hospital.name.toLowerCase()));
  const hospitals = [
    ...apiHospitals,
    ...FALLBACK_HOSPITALS.filter((hospital) => !seen.has(hospital.name.toLowerCase())),
  ]
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5);

  return NextResponse.json({
    incidentLocation: UTOWN_LOCATION,
    hospitals,
  });
}
