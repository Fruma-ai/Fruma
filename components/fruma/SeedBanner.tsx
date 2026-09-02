import { SEED_BANNER_COPY } from "@/lib/fruma/honesty";

export function SeedBanner() {
  return (
    <div className="banner border-b border-line px-4 py-3 md:px-8" role="status">
      <span className="banner-bar" />
      <p>{SEED_BANNER_COPY}</p>
    </div>
  );
}
