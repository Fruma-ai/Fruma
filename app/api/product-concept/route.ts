import { NextResponse } from "next/server";

export const runtime = "nodejs";

const APPROVED_INTENT = [
  "Product: Textured navy polo",
  "Material intent: Extra-long staple cotton",
  "Construction: Structured warp-knit mesh, not piqué",
  "Colour: Deep navy",
  "Handfeel: Premium, dry",
  "Target market: UK + EU",
].join("\n");

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const sketch = form.get("sketch");
    const brief = String(form.get("brief") ?? "");

    if (!(sketch instanceof File)) {
      return NextResponse.json({ error: "A designer sketch is required." }, { status: 400 });
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
    upstream.append("image", sketch, sketch.name || "designer-sketch.png");
    upstream.append(
      "prompt",
      `Create a polished finished-product ecommerce concept image that faithfully interprets the supplied designer sketch. Preserve the silhouette and design cues from the sketch. Use only the approved product intent below; do not invent logos, trims, fibre percentages, performance claims, sustainability claims, care instructions, compliance claims, or other unapproved facts. Present a single premium apparel product on a clean neutral studio background, no person, no text in the image.\n\nWritten brief:\n${brief}\n\nApproved intent:\n${APPROVED_INTENT}`,
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

    return NextResponse.json({ imageUrl, provenance: "uploaded sketch + written brief + approved requirements" });
  } catch (error) {
    console.error("product-concept route error", error);
    return NextResponse.json({ error: "Unable to generate the concept image." }, { status: 500 });
  }
}
