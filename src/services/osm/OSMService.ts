import { SearchCriteria } from "../../types/searchCriteria";

export interface OSMPlace {
  id: string;
  title: string;
  description: string;
  address?: string;
  categoryId?: string;
  subCategoryId?: string;
  coords: {
    lat: number;
    lng: number;
  };
  rating: number;
  accessibility: {
    wheelchairAccessible: boolean;
    elevatorOrRamp: boolean;
    stepFreeEntrance: boolean;
    accessibleToilet: boolean;
    parkingNearby: boolean;
    publicTransportNearby: boolean;
  };
  tags: Record<string, string>;
}

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

type OverpassElement = {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
};

const buildOverpassQuery = (center: { lat: number; lng: number }, radius: number, criteria?: SearchCriteria) => {
  const { lat, lng } = center;

  const amenityFilters: string[] = [];

  if (criteria?.categoryId) {
    amenityFilters.push(`node["amenity"="${criteria.categoryId}"](around:${radius},${lat},${lng});`);
  } else {
    amenityFilters.push(
      `node["amenity"~"cafe|restaurant|fast_food|bar|pub"](around:${radius},${lat},${lng});`
    );
  }

  const wifiFilter =
    criteria?.filters?.wifi === true ? `["internet_access"="wlan"]` : "";

  const amenityBlocks = amenityFilters
    .map((base) => base.replace("];", `${wifiFilter}];`))
    .join("\n");

  return `
    [out:json][timeout:25];
    (
      ${amenityBlocks}
    );
    out body;
  `;
};

const mapElementToPlace = (el: OverpassElement): OSMPlace => {
  const tags = el.tags ?? {};
  const title =
    tags.name ||
    tags["name:ru"] ||
    tags["operator"] ||
    tags.brand ||
    "Место";

  const address =
    tags["addr:full"] ||
    [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ") ||
    undefined;

  const categoryId = tags.amenity;
  const subCategoryId = tags.cuisine;

  const wheelchairAccessible = tags.wheelchair === "yes";
  const parkingNearby = tags.parking === "yes" || tags["parking:lane"] != null;
  const publicTransportNearby =
    tags.public_transport === "platform" || tags.highway === "bus_stop";

  return {
    id: String(el.id),
    title,
    description: tags.description || "Место из OpenStreetMap",
    address,
    categoryId,
    subCategoryId,
    coords: {
      lat: el.lat,
      lng: el.lon,
    },
    rating: 4.2,
    accessibility: {
      wheelchairAccessible,
      elevatorOrRamp: false,
      stepFreeEntrance: false,
      accessibleToilet: false,
      parkingNearby,
      publicTransportNearby,
    },
    tags,
  };
};

export const OSMService = {
  async searchAround(
    center: { lat: number; lng: number },
    radius: number,
    criteria?: SearchCriteria
  ): Promise<OSMPlace[]> {
    const query = buildOverpassQuery(center, radius, criteria);

    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
      },
      body: query,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const json = await response.json();
    const elements: OverpassElement[] = Array.isArray(json.elements)
      ? json.elements
      : [];

    return elements
      .filter((el) => typeof el.lat === "number" && typeof el.lon === "number")
      .map(mapElementToPlace);
  },
};

