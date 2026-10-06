# Prompt for Google — factory data structures

Paste the prompt below into the Google session that is structuring factory files and systems. Attach a real mill workbook when you have one. The prompt is the brief. It is not a request to design a factory operating system.

---

You are helping Fruma define the data structures we collect from apparel factories. Fruma is the intelligence layer at the origin of fashion product data. Brands design against real mill cloth. Retailers and the brand’s own site later read the same facts. The value is the data, and the structure of that data is the product.

## What we are building

A garment still goes from an idea to cloth, a pattern, a sample, cutting, sewing, finishing, inspection, and shipment. The factory does the physical work. Fruma does not cut, sew, grade, fit, or run the line.

The delay in that chain is information. The brief is not searchable. The mill’s fabric book sits in a spreadsheet with its own headers. Price, MOQ, and lead time in that file look current when they are only what was true when the file was written. Fibre, origin, and care are typed again when someone makes a listing, a carton label, or a traceability record.

Fruma closes that gap. A brand writes what they want to make. Fruma searches the cloth factories have already filed, cites the cells, and asks the mill to confirm what is still current. The confirmed facts lock onto one product record. That record is what design keeps using, what a retailer listing projects, and what a later traceability or product-passport schema reads. Destinations do not rewrite the source.

Each new factory file, confirmed column map, and timestamped mill answer makes the next product faster. The second style at the same mill should not start from zero. A retailer should not become a second place where composition is invented.

## Who the data serves

**Brands, while they design.** They need to know which mill qualities can become the product they have in mind, what is on file, what is missing, and what a person still has to confirm. A named colour is a hard requirement. If they leave colour open, do not invent a shade. Handfeel, fit, and make stay physical. The brand should see a shortlist of cloth with the mill’s own words attached, not a score that hides the source.

**Brands, while they order.** MOQ, lead time, price, and availability from a fabric book are historical until the mill confirms them and we store the time of that confirmation. The brand orders against the confirmation, not against a stale cell. The mill sees the cloth, the category, the colour, and the region. The mill does not see the brand name, and does not see what other brands asked for.

**Retailers, and the brand’s own site.** Fibre, construction, colour, weight, and country of origin should arrive as projections of the locked record. A retailer’s title rules, colour names, and category codes are a mapping on top. They must not change what the mill wrote. If a retailer calls a mesh a piqué, that difference stays visible. Care text is only present when someone supplied it. Do not generate care instructions from a fibre name.

**The same parties, on the next product.** Header maps are reused per mill. Confirmed commercials replace historical ones only when a new timestamp exists. Evidence keeps its scope and expiry. A mill one brand will not use stays hidden from that brand and is not deleted from the cloth other brands can search. That private memory is brand data. It is not something we collect from the factory.

## What a factory actually has

Factories send the files they already keep. Usually a fabric or quality book: xlsx, csv, sometimes a pdf or a photo. Sometimes an export from their own system. Rows are materials, not garment SKUs. One quality can become a polo, a tee, or nothing, depending on construction and fibre. A fleece row is not a polo.

Headers are the mill’s words. Examples we already see: `Art.`, `Knit type`, `Fibre`, `GSM`, `Wgt gsm`, `Width cm`, `Colourway`, `Min order`, `Buyer`, `Certificate`, plus imperial forms (ounces, inches, yards) and other languages. Many columns will not match our names. Those columns are unknown. They are not empty and they are not safe to drop.

Identity of a quality is the mill plus the article code as written. Colour is a child of that quality. Width is an attribute. A blank article is an exception, not a generated id.

Some columns are commercial (MOQ, price, lead) or customer-specific (buyer, their program names). Those stay private to the mill until a named grant says a brand may see that class. Do not copy one brand’s buyer column into another brand’s view.

## The structures we need you to produce

When you look at a factory file, system, or export, return structures in this shape. Keep the mill’s value and your normalised value side by side. Never replace the original.

1. **Deposit.** Filename, mill, received time, byte hash, sheet name, and every cell you touched: sheet, row, column, header as written, value as written. This is immutable. A later mapping does not edit it.

2. **Header map.** Each distinct header, the Fruma field you propose, a confidence, and whether a person has confirmed it. Proposed fields are only: `article`, `construction`, `composition`, `weight`, `width`, `colour`, `moq`, `customer`, `cert`. If you cannot justify a field, the header stays unmapped. Say which unit the column is in, as written (gsm or oz/yd², cm or inches, metres or yards). Put the converted value beside the original, with the conversion named. Do not convert inside the original cell.

3. **Quality.** One record per article code: construction, composition, weight, width, and colourways, each pointing at the source cell. State which end-product families that cloth could become (polo, tee, shirt, sweater, jacket, trouser, and so on) and mark that list as derived from the cloth words. Do not store it as a product catalogue the mill submitted.

4. **Commercials.** MOQ, lead, price, currency, and sample lead, each with freshness `historical` or `confirmed`. A figure read from the file is `historical` and has no confirmed-at time. `confirmed` requires a mill response and an ISO timestamp. Do not copy the file number forward and call it current.

5. **Evidence.** A claim is not a checkbox. Structure it as claim, scope (`organisation`, `site`, `quality`, `product`, or `process`), issuer, valid-from, valid-until, and a pointer to the document or cell. A mill-level programme does not become a quality-level or product-level claim. Expired stays expired. Missing stays missing. The word “organic” in a fibre column is composition. It is not a GOTS certificate. Do not infer GOTS, OEKO-TEX, origin, or a legal pass from neighbouring cells or from how complete the row looks.

6. **Product fact, once a brand locks a cloth.** Value, source type (`mill-file`, `brief`, `mill-response`, `evidence-document`), source record, source field, the original value, scope, status (`evidenced`, `confirmed`, `missing`, `physical-only`, `stale`), confirmed-at when a person or mill confirmed it, and version. Physical facts (fit approval, measured spec, seam test) enter only when the factory or brand supplies them. Leave them empty until then.

7. **Unknowns and refusals.** A list of headers and cells you did not map, and a list of facts you refused to invent. This list is as important as the mapped fields. Silence is data loss.

## How to judge your own output

A good structure lets a brand ask “what can become this product, from which cell, and what is still unconfirmed?” and lets a retailer show fibre and origin without a second spreadsheet. A bad structure is a clean garment catalogue, a single sustainability flag, a current price with no timestamp, or a row where the mill’s words have been overwritten.

Work from the factory file in front of you. If a field is not in that file, return it as missing. Do not borrow it from a typical polo, a previous mill, or a product page.

Return one example mapped from the attached file, the header map, the unknowns, and the refusals. Then list which of those structures this factory’s system can populate every time, and which only appear in the spreadsheet.
