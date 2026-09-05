import { NextResponse } from "next/server";

const retailerNames: Record<string, string> = {
  next: "Next",
  johnlewis: "John Lewis",
  ms: "M&S",
  very: "The Very Group",
};

const rows = [
  ["Product", "Textured navy polo", "Brand approved"],
  ["SKU", "MPOL1026-BUAA", "Brand approved"],
  ["Material composition", "100% Extra-Long Staple Cotton", "Fruma Standard → Brand Standard"],
  ["Construction", "Warp-knit mesh", "Fruma Standard → Brand Standard"],
  ["Fabric weight", "190 gsm", "Fruma Standard → Brand Standard"],
  ["Colour", "Deep Navy", "Brand approved"],
  ["Country of manufacture", "Portugal", "Selected source"],
  ["Certification", "OEKO-TEX Standard 100", "Source-linked evidence"],
  ["Title", "Men's Textured Extra-Long Staple Cotton Polo in Deep Navy", "Optimised from approved facts"],
  ["Description", "A refined navy polo crafted from breathable extra-long staple cotton in a structured warp-knit mesh. Designed with a premium dry handfeel for an elevated everyday finish.", "Optimised from approved facts"],
  ["Submission owner", "Brand", "Fruma prepares only"],
];

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("destination") || "next";
  const retailer = retailerNames[key] || "Selected destination";
  const tableRows = rows.map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${esc(cell)}</Data></Cell>`).join("")}</Row>`).join("");
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Prepared Handoff"><Table><Row><Cell><Data ss:Type="String">Fruma demo handoff</Data></Cell><Cell><Data ss:Type="String">${esc(retailer)}</Data></Cell><Cell><Data ss:Type="String">Synthetic destination mapping</Data></Cell></Row><Row/><Row><Cell><Data ss:Type="String">Field</Data></Cell><Cell><Data ss:Type="String">Prepared value</Data></Cell><Cell><Data ss:Type="String">Source / status</Data></Cell></Row>${tableRows}</Table></Worksheet></Workbook>`;
  const safe = retailer.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="fruma-${safe}-handoff.xls"`,
      "Cache-Control": "no-store",
    },
  });
}
