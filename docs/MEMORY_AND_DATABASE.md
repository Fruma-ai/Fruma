# Memory vs database

## What we have now (enough for Test)

| Store | Where | Survives restart? |
| --- | --- | --- |
| Test / Demo ingest engines | Server process memory | No |
| Agent runs (Harness, Mapping) | Server process memory | No |
| Confirmed header overlays | Server process memory | No |
| Private deposit bytes | Temp disk via `PrivateByteStore` | Mostly no (ephemeral dir) |
| Demo UI learn keys | Browser `localStorage` (`fruma:demo:*`) | Yes, per browser |

This is intentional for the Test lab: fast iteration, no infra tax, Demo stays frozen.

## When to connect Postgres (+ object storage)

Connect a real database when **any** of these become true:

1. **Confirmed mappings must survive deploys** — you are tired of re-running Mapping after every Vercel restart.
2. **More than one server instance** — memory is not shared across instances.
3. **A real mill workbook** is the pilot source of truth (not only synthetic Test CSVs).
4. **Audit / investor demos** need a durable trail of agent runs and confirmations.
5. **Brand-private relationship memory** must be authoritative across devices, not just localStorage.

Recommended first DB slice (not before the Mapping loop feels right on Test):

`organisations → deposits → immutable source cells → confirmed header maps → agent_runs → product_truth versions`

Object storage holds original mill files. Postgres holds pointers, mappings, confirmations, and agent run metadata.

## What not to wait for

Do **not** block Corpus Harness / Mapping / Retrieval on Postgres. Prove the agents improve Test scores in memory first, then persist the same shapes.
