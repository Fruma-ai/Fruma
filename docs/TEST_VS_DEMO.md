# Test vs demo versions

Fruma keeps two surfaces so engineering work does not quietly rewrite the customer demo.

| Version | Path | Purpose |
| --- | --- | --- |
| **Demo** | `/app` | Customer-facing story. Update only when the test corpus behaviour is accepted. |
| **Test** | `/app/test` | Three dummy brands + fifty factories with private hanger CSVs. Safe to break. |

## Test corpus contents

- **Brands:** Northline Studio, Harbour Standard, Field & Form
- **Factories:** 50 mills across PT / IT / TR / PL / UK with distinct dialects
- **Products:** 12 per brand (36 total)
- **Links:** 150 brand↔factory relationship rows (tenant-private)
- **Hangers:** deterministic CSV per factory (`lib/fruma/test-corpus/hanger.ts`)

Download a hanger from the Factories / Hangers tabs, or:

```
GET /api/test/factories/factory-001/hanger
```

## Rule of promotion

1. Build and verify on `/app/test`
2. Only then port accepted behaviour into `/app` (demo)
3. Do not seed demo with the full fifty-factory corpus unless intentionally promoting a marketplace story
