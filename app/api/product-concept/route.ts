import { NextResponse } from "next/server";

export const runtime = "nodejs";

const APPROVED_INTENT = [
  "Product: Men’s polo shirt, classic silhouette",
  "Fabric: Cotton piqué, 100% cotton, approximately 220 GSM target",
  "Fit: Regular fit",
  "Colour: Navy, 19-3920 TCX",
  "Construction: Rib knit collar, rib knit sleeve cuffs, three-button placket, side split hem",
  "Trim: Matte-finish four-hole buttons",
  "Target markets: EU, UK, US",
].join("\n");

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const sketch = form.get("sketch");
    const brief = String(form.get("brief") ?? "");

    if (!(sketch instanceof File)) {
      return NextResponse.json({ error: "A product sketch or technical pack image is required." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Image generation is not configured in this environment." },
        { status: 503 },
      );
    }

    const upstream = new FormData();
    upstream.append("model", "gpt-image-2");
    upstream.append("image", sketch, sketch.name || "product-reference.png");
    upstream.append(
      "prompt",
      `Create a polished, realistic finished-product ecommerce concept image that faithfully reflects the supplied product reference and the approved product specification below. The product reference may be a designer sketch, a technical pack, or a combined design/technical board. Treat the approved specification as a hard constraint, not creative inspiration. Preserve the intended silhouette, fit, fabric type, colour, collar, cuffs, placket, buttons and hem construction. Do not add contrast tipping, logos, branding, decorative trims, extra seams, alternate constructions, colours, fibres, claims or styling that are not supported by the approved specification. If any detail is unresolved, keep it visually neutral rather than inventing it. Present a single premium apparel product on a clean neutral studio background, no person, no text in the image.\n\nWritten product search / brief:\n${brief}\n\nApproved product specification:\n${APPROVED_INTENT}`,
    );
    upstream.append("size", "1024x1024");

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });

    const payload = await response.json();
    if (!response.ok) {
      console.error("product-concept image generation failed", response.status, payload?.error?.message);
      return NextResponse.json({ error: "AI concept generation failed." }, { status: 502 });
    }

    const item = payload?.data?.[0];
    const imageUrl = item?.b64_json
      ? `data:image/png;base64,${item.b64_json}`
      : item?.url;

    if (!imageUrl) {
      return NextResponse.json({ error: "AI concept generation returned no image." }, { status: 502 });
    }

    return NextResponse.json({ imageUrl, provenance: "product search / brief + uploaded sketch / tech pack + approved specification" });
  } catch (error) {
    console.error("product-concept route error", error);
    return NextResponse.json({ error: "Unable to generate the concept image." }, { status: 500 });
  }
}
