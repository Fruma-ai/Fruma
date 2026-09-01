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
export const OSHUB_PROFILE = "https://opensupplyhub.org/facilities/";
export const OSHUB_SEARCH = "https://opensupplyhub.org/";
