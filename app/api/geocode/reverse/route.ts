import { NextResponse } from "next/server";

type ReverseGeocodeResponse = {
  name?: string;
  display_name?: string;
  address?: Record<string, string | undefined>;
};

function getPreferredPlaceName(result: ReverseGeocodeResponse) {
  return (
    result.name ||
    result.address?.amenity ||
    result.address?.shop ||
    result.address?.tourism ||
    result.address?.leisure ||
    result.address?.office ||
    result.address?.building ||
    result.address?.house_name ||
    null
  );
}

function getStreetAddress(result: ReverseGeocodeResponse) {
  const houseNumber = result.address?.house_number;
  const road = result.address?.road || result.address?.pedestrian || result.address?.footway || result.address?.path;
  const locality =
    result.address?.city ||
    result.address?.town ||
    result.address?.village ||
    result.address?.hamlet ||
    result.address?.suburb ||
    result.address?.neighbourhood;

  const firstLine = [houseNumber, road].filter(Boolean).join(" ").trim();

  if (firstLine && locality) {
    return `${firstLine}, ${locality}`;
  }

  return firstLine || locality || result.display_name || null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { latitude?: number; longitude?: number };

    if (typeof body.latitude !== "number" || typeof body.longitude !== "number") {
      return NextResponse.json({ error: "Latitude and longitude are required." }, { status: 400 });
    }

    const acceptLanguage = request.headers.get("accept-language") || "en-US,en;q=0.9";
    const reverseUrl = new URL("https://nominatim.openstreetmap.org/reverse");
    reverseUrl.searchParams.set("format", "jsonv2");
    reverseUrl.searchParams.set("lat", String(body.latitude));
    reverseUrl.searchParams.set("lon", String(body.longitude));
    reverseUrl.searchParams.set("addressdetails", "1");
    reverseUrl.searchParams.set("zoom", "18");

    const response = await fetch(reverseUrl, {
      headers: {
        "Accept-Language": acceptLanguage,
        "User-Agent": "DesignatedDefenders/1.0 (reverse geocoding for ride pickup labels)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Could not resolve that location." }, { status: 502 });
    }

    const result = (await response.json()) as ReverseGeocodeResponse;
    const placeName = getPreferredPlaceName(result);
    const address = getStreetAddress(result);

    return NextResponse.json({
      placeName,
      address,
      display: placeName || address || result.display_name || null,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not reverse geocode coordinates." }, { status: 500 });
  }
}
