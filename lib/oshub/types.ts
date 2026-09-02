export type OriginFacility = {
  osId: string;
  name: string;
  address: string;
  countryCode: string;
  countryName: string;
  lat: number | null;
  lng: number | null;
  sectors: string[];
  productTypes: string[];
  claimed: boolean;
};

export type OriginSearch = {
  q?: string;
  country?: string;
  sector?: string;
  page?: number;
};

export type OriginResult = {
  facilities: OriginFacility[];
  count: number;
  page: number;
  pageSize: number;
  source: "opensupplyhub" | "index";
  error?: string;
};

export const ORIGIN_PAGE_SIZE = 50;

function slugPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function millKey(f: OriginFacility) {
  if (f.osId) return f.osId;
  return `${slugPart(f.countryCode)}-${slugPart(f.name)}`.slice(0, 80);
}
