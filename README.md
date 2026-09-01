# Fruma

Fabric intelligence for mills and brands. Designers search cloth in plain language. Mills send the files they already have — no forms. Products inherit fabric truth. One record is scored against live retailer listings.

This is a working **reference demo** built around **Sunspel’s Riviera Polo Shirt in Navy** (`MPOL1026-BUAA`, £140): in-house **Q75 warp-knit mesh** (not dense piqué), knitted in Portugal from extra-long staple California **Supima**. Traceable fibre, **not GOTS**.

**Sunspel is a public reference, unaffiliated.** Product names, prices, copy and photographs are used so listing previews can be designed around a real garment. They are not a partnership, endorsement, or production catalogue.

## Two rooms

**Brand / Studio** — daylight paper (`#F4F2EC`) with cooler ink (`#12141A`). Design, Desk, Product, Listings, Suppliers. The customer in this demo is Sunspel.

**Mill / Workshop** — industrial dark (`#0C0D10`). Têxteis Vale do Ave. Linear ingest: **Profile** (gather mill facts) → **File** (drop the hanger list) → **Map** (mill columns to the Fruma standard) → **Review** (manage by exception) → **Catalogue** (working file live to the brand studio). Portuguese mill files must not contradict the Riviera cloth (no fake GOTS on Q75).

## Mill catalogue

Workshop is a factory ingest: **Profile → File → Map → Review → Catalogue**.

**Profile** — claim the mill. Confirm identity and certs, then add production and commercial data (gauges, fibres, constructions, dye, finishing, MOQ, lead, sampling, markets). Completeness is what Design search filters on.

**File** — drop the hanger list you already have (csv, xlsx, pdf, or a photo). Demo file included. No retyping.

**Map** — match mill columns to the Fruma standard (article, structure, composition, weight, width, MOQ). Save as a reusable template. Applying the map shows the unit conversions (inches → cm, ounces → g/m², yards → metres).

**Review** — manage by exception. Approve suggested knit types, or bulk-approve the rest. Gaps stay out of the live catalogue.

**Catalogue** — the working file brands search. Each confirm is stored in `localStorage` as `fruma-mill-learn` so the next file ranks this mill’s preferred mapping first.

Entering the brand studio reads `Sunspel_range_export.csv` (demo). Existing styles are matched to mill qualities so Design/Desk can say which cloths are already in shops — handle those on the floor rather than waiting on a courier. Empty mill qualities still need a swatch.

## Desk → Product → Listings

**Design** — select up to three mill qualities. Each result is a digital swatch card (composition, GSM, finish, performance, care, origin, certs) and generates a garment image.

**Product** — the chosen cloth only. Inheritance is fabric (locked, including legal care and country of origin) → design (brief + sketch) → Fruma listing copy. Generate the listing image and approve copy. Working SKUs are `MPOL2701` / `2702` / `2703` by desk order — not the live Riviera.

**Listings** — once Product is approved, map the Fruma record onto each destination. Fibre, care and origin stay mill-sourced. Destination rules still apply (title truncation, Navy→Blue, mesh→piqué at Selfridges, empty John Lewis / Mr Porter as potential cards only). **Range in shops** still shows the live Riviera captures from 25 August 2026.

A one-page **[feature and factory-data map](/map)** sits the product against the fashion development chart: mill file → Fruma standard → brief/sketch match → locked record → retailer listings. Lab dips, trims, tech packs, proto comments and returns are named so we do not claim them yet.

## Hero garment (imported range)

Photographic packshots of the **existing** Riviera live in [`public/products/`](./public/products/) (copied from [`brand-ref/images/`](./brand-ref/images/)). Listings use those JPEGs. The draft packshot is `public/products/draft-navy-q75-polo.png`.

## Live listings (not invented)

Captured 25 August 2026 in [`brand-ref/listings.json`](./brand-ref/listings.json):

| Destination | What they did |
| --- | --- |
| Sunspel.com | Source of truth · £140 · Navy · MPOL1026-BUAA |
| Liberty | Title typo **Rivieria** · From £135 · Regular vs Slim |
| END. | Truncated title · Navy £75 / Charcoal £69 sold-out · Charcoal tagged Grey |
| Selfridges | **Mesh sold as cotton-piqué** · GREY MELANGE / NAVY |
| Farfetch | Colour **Blue** · style ID loses hyphen |
| Harrods | Regular vs Slim · UK Navy OOS · Dark Clay £135 “upgrade to traditional piqué” |
| gravitypope | CA$230 · SKU remapped `11E3Q50` |
| John Lewis | **Not listed** (empty brand page) |
| Mr Porter | **Not listed** (journal only) |

Farfetch returned HTTP 429 and Selfridges HTML is bot-gated. Those listings still have real URLs and titles; previews use own-site Navy / Grey Melange files as stand-ins. Do not hotlink retailer CDNs.

## Run locally

```bash
npm install
npm run dev
```

Opens at [http://127.0.0.1:43147](http://127.0.0.1:43147).

## Share the demo

This is a Next.js app with no auth and no API keys. Anyone with the repo can run it:

```bash
git clone https://origin.cursor.com/git/owen-jones/tmp-b675bbe7b526e3f3
cd tmp-b675bbe7b526e3f3
npm install
npm run dev
```

The live Cloudflare URL from a Cloud Agent session is temporary — it only lasts while that agent is running. For a lasting partner link, deploy the same app (Vercel, Netlify, or any Node host) from `main`.

Type a brief and attach a sketch. Select mill qualities — each renders as a product option. Compare up to three on the Desk, pick one for Product, approve the Fruma standard, then map it onto destination PDPs. Workshop **Catalogue** is the mill’s working file: bulk-apply the Fruma standard, AI suggestions, learning.
