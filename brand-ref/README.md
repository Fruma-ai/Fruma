# Brand reference — Sunspel Riviera Polo

Reference-only capture for the Fruma demo. **Unaffiliated with Sunspel or any retailer.** Product names, prices, copy and photos are recorded so listing previews can be designed around a real garment instead of lorem.

Captured **25 August 2026**. Recheck prices and stock before treating anything as current.

## Why this brand

Preference order was Sunspel → Albam / Folk / Universal Works / Norse Projects / John Smedley → Asket.

**Sunspel locked** because:

1. The **Riviera Polo Shirt** (`MPOL1026`) is a fabric-intelligence story, not a logo polo. In 1955 Peter Hill found dense **piqué** too hot on the French Riviera, returned to Long Eaton, and used lacemaking machines to knit **Q75 cotton warp-knit mesh** (from earlier Q14 cellular cotton). Own-site journal still says the **refined collar holds its own under a jumper or jacket**.
2. Live **own-site + multi-retailer** listings of the **same style code** exist today (Liberty, END., Selfridges, Farfetch, Harrods). That is the evidence layer for listing previews.
3. UK/EU brand, polo made in **Portugal**, Classic T-shirt made in **England**.

John Lewis and Mr Porter were the ideal extra destinations. **Neither currently lists this SKU.** John Lewis’s Sunspel brand page is empty. No live Mr Porter product URL was found. Those absences are recorded in `listings.json` so the UI does not invent cards.

Not GOTS / organic: Sunspel’s story is **traceable California Supima**, not certified organic. That is still a useful Fruma field (cert present vs missing).

## Hero garment

| | |
| --- | --- |
| **Name** | Riviera Polo Shirt |
| **Hero colour** | Navy — `MPOL1026-BUAA` |
| **Own-site title** | Men's Riviera Polo Shirt in Navy |
| **URL** | https://www.sunspel.com/products/mens-cotton-riviera-polo-shirt-navy-mpol1026 |
| **Price** | £140 |
| **Composition** | 100% extra-long staple Supima cotton |
| **Structure** | In-house Q75 warp-knit mesh, slim fit, chest pocket, made in Portugal |
| **Weight** | Lightweight; Shopify shipping weight 150g; fabric GSM unpublished |

### Related colourways

- **Charcoal** `MPOL1026-GYAB` — https://www.sunspel.com/products/mens-short-sleeve-riviera-polo-charcoal-mpol1026
- **White** `MPOL1026-WHAA` — https://www.sunspel.com/products/mens-cotton-riviera-polo-shirt-white-mpol1026
- **Grey Melange** `MPOL1026-GYAA` — default colour on the Selfridges listing

Own site currently advertises **30 colours** for this style.

### Related second garment

**Classic T-shirt** in White, `MTSH0001-WHAA`, £95. Handmade in Long Eaton from two-fold **Q82** Supima jersey.

https://www.sunspel.com/products/mens-short-sleeve-crew-neck-t-shirt-white

## Retailer listings (same / equivalent product)

| Destination | What they call it | Colour as shown | Price | vs own site |
| --- | --- | --- | --- | --- |
| Sunspel UK | Men's Riviera Polo Shirt in Navy | Navy | £140 | source |
| Liberty | **Rivieria** Mesh Polo Shirt | White default, Navy sibling | From £135 | typo; Regular fit vs Slim; 100% Cotton |
| END. UK | Sunspel Riviera Polo | Navy | **£75** sold out | truncated title; sale; SKU kept |
| END. UK | Sunspel Riviera Polo | Charcoal (internal `Grey`) | **£69** sold out | colour mapped Grey |
| Selfridges | Riviera **cotton-piqué** polo shirt | GREY MELANGE / NAVY | £140 | **mesh sold as piqué** |
| Farfetch UK | Riviera polo shirt | **Blue** / navy blue | £140 | hyphen dropped in style ID; 2-button copy |
| Harrods UK | Supima Cotton Riviera Polo Shirt | Navy | £140 listed / PDP OOS | Regular vs Slim; “Italian heat” |
| Harrods UA | Riviera Polo Shirt | DARK CLAY | £135 | “upgrade to traditional piqué” |
| gravitypope | Riviera Polo Shirt | Navy | CA$230 | SKU remapped `11E3Q50` |
| John Lewis | brand page only | — | — | **no SKU** |
| Mr Porter | journal only | — | — | **no live product URL** |

Machine-readable records, local image filenames, and difference lists: [`listings.json`](./listings.json).

## Images

All files under [`images/`](./images/). Do **not** hotlink retailer CDNs in the app.

A subset is copied to [`/public/products/`](../public/products/) for Next.js static serving (`/products/<filename>`).

Farfetch CDN returned HTTP 429 in this environment. Selfridges HTML is bot-gated. Those listings still have **real URLs and titles**; use own-site Navy / Grey Melange files as stand-ins and see `sourceImageUrls` / `imagesNote` in JSON.

## How to import

```ts
import listings from "../brand-ref/listings.json";
```

`listings[].images` are paths relative to this folder, e.g. `images/sunspel-riviera-polo-navy-own-01-packshot.jpg`.

Public copies use the same filename: `/products/sunspel-riviera-polo-navy-own-01-packshot.jpg`.

Next.js may need `resolveJsonModule` (already typical in this app) to import the JSON.

## Demo mapping (Fruma)

The recovered demo brief is a **heavy piqué polo that holds a collar**, GOTS, Portugal. This reference is the real-world cousin:

- Construction the mill actually invented: **mesh instead of piqué** (Selfridges still files it as piqué).
- Collar story is explicit in Sunspel’s own journal.
- Portugal knit for the polo; England for the tee.
- Listing diffs are not hypothetical: misspelled title, mapped colour, truncated title, sale vs RRP, fabric mis-tagged.

Treat every field as **evidence for UI**, not as permission to ship Sunspel trademarks in a production product.
