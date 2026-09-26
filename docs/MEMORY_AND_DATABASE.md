# Memory vs database

## What we have now (Test spine)

| Store | Where | Survives restart? |
| --- | --- | --- |
| Confirmed header overlays | Process memory + durable spine | Yes, after hydrate |
| Anonymous mill requests / confirmations | Durable spine | Yes |
| Locked product-truth versions | Durable spine | Yes |
| Pilot / mill deposit bytes | Object store (file dir or Postgres BYTEA) | Yes |
| Ingest engines (working set) | Server process memory | No |
| Demo UI learn keys | Browser `localStorage` (`fruma:demo:*`) | Yes, per browser |

Demo `/app` stays frozen. Persistence is Test-only.

## Backends

- **File (default):** `.data/fruma-test` or `FRUMA_DATA_DIR`. `spine.json` + `objects/`.
- **Postgres:** set `DATABASE_URL`. Same shapes in `fruma_header_maps`, `fruma_mill_requests`, `fruma_mill_confirmations`, `fruma_product_truth`, `fruma_deposits`.

## When Postgres matters

1. Confirmed mappings must survive deploys across multiple instances.
2. A real mill workbook is the pilot source of truth.
3. Audit trail of confirmations and product-truth locks must be shared.

## What not to wait for

Do not block Mapping / Retrieval experiments on Postgres. The file spine is enough to prove the wedge locally. Swap `DATABASE_URL` when the shapes are right.
