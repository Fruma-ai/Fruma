import { ORIGIN_INDEX } from "./snapshot";
import {
  ORIGIN_PAGE_SIZE,
  millKey,
  type OriginFacility,
  type OriginResult,
  type OriginSearch,
} from "./types";

const LIVE = "https://opensupplyhub.org/api/v1/production-locations/";
const LEGACY = "https://opensupplyhub.org/api/facilities/";

function token() {
  return process.env.OPEN_SUPPLY_HUB_TOKEN?.trim() ?? "";
}

function str(v: unknown) {
  return String(v ?? "").trim();
}

function num(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function list(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(str).filter(Boolean);
  const s = str(v);
  return s ? [s] : [];
}

function fromLive(raw: Record<string, unknown>): OriginFacility | null {
  const osId = str(raw.os_id ?? raw.id);
  const name = str(raw.name);
  if (!name) return null;
  const country = (raw.country ?? {}) as Record<string, unknown>;
  const coords = (raw.coordinates ?? {}) as Record<string, unknown>;
  const geo = (raw.geometry ?? {}) as Record<string, unknown>;
  const gcoords = Array.isArray(geo.coordinates) ? geo.coordinates : [];
  const props = (raw.properties ?? {}) as Record<string, unknown>;
  const nested = Object.keys(props).length ? props : raw;
  return {
    osId: osId || str(nested.os_id),
    name: name || str(nested.name),
    address: str(raw.address ?? nested.address),
    countryCode: str(country.alpha_2 ?? nested.country_code).toUpperCase(),
    countryName: str(country.name ?? nested.country_name),
    lat: num(coords.lat) ?? num(gcoords[1]),
    lng: num(coords.lng) ?? num(gcoords[0]),
    sectors: list(raw.sector ?? nested.sector),
    productTypes: list(raw.product_type ?? nested.product_type),
    claimed: Boolean(raw.claim_status === "claimed" || nested.has_approved_claim),
  };
}

function fromGeoFeature(f: Record<string, unknown>): OriginFacility | null {
  const props = (f.properties ?? {}) as Record<string, unknown>;
  const geo = (f.geometry ?? {}) as Record<string, unknown>;
  const coords = Array.isArray(geo.coordinates) ? geo.coordinates : [];
  const name = str(props.name);
  if (!name) return null;
  return {
    osId: str(f.id ?? props.os_id ?? props.oar_id),
    name,
    address: str(props.address),
    countryCode: str(props.country_code).toUpperCase(),
    countryName: str(props.country_name),
    lat: num(coords[1]),
    lng: num(coords[0]),
    sectors: list(props.sector),
    productTypes: list(props.product_type),
    claimed: Boolean(props.has_approved_claim),
  };
}

function filterIndex(opts: OriginSearch): OriginFacility[] {
  const q = (opts.q ?? "").trim().toLowerCase();
  const country = (opts.country ?? "").trim().toUpperCase();
  const sector = (opts.sector ?? "").trim();
  return ORIGIN_INDEX.filter((f) => {
    if (country && f.countryCode !== country) return false;
    if (sector && sector !== "all" && !f.sectors.some((s) => s.toLowerCase() === sector.toLowerCase())) {
      return false;
    }
    if (!q) return true;
    const hay = `${f.name} ${f.address} ${f.osId} ${f.countryName}`.toLowerCase();
    return hay.includes(q);
  });
}

export function originCountries() {
  const map = new Map<string, string>();
  for (const f of ORIGIN_INDEX) map.set(f.countryCode, f.countryName);
  return [...map.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([code, name]) => ({ code, name }));
}

export async function searchOrigin(opts: OriginSearch): Promise<OriginResult> {
  const page = Math.max(1, opts.page ?? 1);
  const key = token();
  if (key) {
    try {
      return await searchLive(key, opts, page);
    } catch (err) {
      const fallback = searchSnapshot(opts, page);
      fallback.error =
        err instanceof Error ? err.message : "The live index did not respond. Showing the Fruma index.";
      return fallback;
    }
  }
  return searchSnapshot(opts, page);
}

function searchSnapshot(opts: OriginSearch, page: number): OriginResult {
  const all = filterIndex(opts);
  const start = (page - 1) * ORIGIN_PAGE_SIZE;
  return {
    facilities: all.slice(start, start + ORIGIN_PAGE_SIZE),
    count: all.length,
    page,
    pageSize: ORIGIN_PAGE_SIZE,
    source: "index",
  };
}

async function searchLive(key: string, opts: OriginSearch, page: number): Promise<OriginResult> {
  const from = (page - 1) * ORIGIN_PAGE_SIZE;
  const params = new URLSearchParams();
  params.set("size", String(ORIGIN_PAGE_SIZE));
  params.set("from", String(from));
  if (opts.q?.trim()) params.set("query", opts.q.trim());
  if (opts.country?.trim()) params.set("country", opts.country.trim().toUpperCase());
  const sector = opts.sector?.trim();
  if (sector && sector !== "all") params.set("sector", sector);

  const headers = {
    Authorization: `Token ${key}`,
    Accept: "application/json",
  };
  const res = await fetch(`${LIVE}?${params}`, { headers, cache: "no-store" });
  if (res.ok) {
    const body = (await res.json()) as Record<string, unknown>;
    const rows = Array.isArray(body.data) ? body.data : [];
    const facilities = rows
      .map((row) => fromLive(row as Record<string, unknown>))
      .filter((x): x is OriginFacility => Boolean(x));
    return {
      facilities,
      count: Number(body.count) || facilities.length,
      page,
      pageSize: ORIGIN_PAGE_SIZE,
      source: "opensupplyhub",
    };
  }

  const legacy = new URLSearchParams();
  legacy.set("page", String(page));
  legacy.set("pageSize", String(ORIGIN_PAGE_SIZE));
  if (opts.q?.trim()) legacy.set("q", opts.q.trim());
  if (opts.country?.trim()) legacy.set("countries", opts.country.trim().toUpperCase());
  if (sector && sector !== "all") legacy.set("sector", sector);
  const alt = await fetch(`${LEGACY}?${legacy}`, { headers, cache: "no-store" });
  if (!alt.ok) {
    throw new Error(`Live index returned ${res.status}.`);
  }
  const geo = (await alt.json()) as Record<string, unknown>;
  const features = Array.isArray(geo.features) ? geo.features : [];
  const facilities = features
    .map((row) => fromGeoFeature(row as Record<string, unknown>))
    .filter((x): x is OriginFacility => Boolean(x));
  return {
    facilities,
    count: Number(geo.count) || facilities.length,
    page,
    pageSize: ORIGIN_PAGE_SIZE,
    source: "opensupplyhub",
  };
}

export async function getOriginFacility(id: string): Promise<OriginFacility | null> {
  const key = decodeURIComponent(id).trim();
  if (!key) return null;
  const local = ORIGIN_INDEX.find((f) => millKey(f) === key || f.osId === key);
  if (local) return local;
  const tokenKey = token();
  if (!tokenKey) return null;
  try {
    const found = await searchLive(tokenKey, { q: key, sector: "all" }, 1);
    return (
      found.facilities.find((f) => millKey(f) === key || f.osId === key) ??
      found.facilities[0] ??
      null
    );
  } catch {
    return null;
  }
}
