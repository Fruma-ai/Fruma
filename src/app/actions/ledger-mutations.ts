"use server"

import { cookies } from "next/headers"
import postgres from "postgres"
import { sessionFounder } from "../../../lib/gate"
import {
  assertAppendOnlyConfirmSql,
  confirmEventBindings,
  executeAppendOnlyConfirm,
  parseConfirmPayload,
  resolveFounderSession,
} from "../../../lib/fruma/persist/confirm-mutation"
import { validateFibreIntegrity } from "../../lib/fruma/validation/composition"

const CONFIRM_EVENT_INSERT = `
INSERT INTO fruma_cell_mutation_events (
  event_id,
  source_cell_id,
  operator_cookie,
  action_type,
  old_standard_value,
  new_standard_value,
  standard_field,
  occurred_at
) VALUES (
  $1,
  $2,
  $3,
  'confirm',
  NULL,
  $4,
  $5,
  NOW()::timestamptz
)
RETURNING event_id, occurred_at
`

assertAppendOnlyConfirmSql(CONFIRM_EVENT_INSERT)

let pool: ReturnType<typeof postgres> | null = null

function mutationSql() {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) return null
  if (!pool) pool = postgres(url, { max: 4, prepare: false })
  return pool
}

export async function confirmStagedSuggestion(payload: {
  source_cell_id: string
  target_field: string
  confirmed_value: string
}) {
  const parsed = parseConfirmPayload(payload)
  if (!parsed.ok) return parsed

  if (parsed.value.target_field === "composition") {
    const integrity = validateFibreIntegrity(parsed.value.confirmed_value)
    if (!integrity.isValid) {
      return {
        success: false as const,
        error: integrity.error,
        total: integrity.total,
      }
    }
  }

  const jar = await cookies()
  const founder = await resolveFounderSession(
    (cookie) => sessionFounder(cookie),
    (name) => jar.get(name)?.value,
  )
  if (!founder) return { ok: false as const, error: "unauthorized" }

  const sql = mutationSql()
  if (!sql) {
    return { ok: false as const, error: "CRITICAL_CONFIG_ERROR: DATABASE_URL is missing" }
  }

  try {
    const bindings = confirmEventBindings(founder, parsed.value, `confirm:${crypto.randomUUID()}`)
    const written = await executeAppendOnlyConfirm(
      (query, parameters) => sql.unsafe(query, [...parameters]),
      CONFIRM_EVENT_INSERT,
      bindings,
    )
    return { ok: true as const, eventId: written.eventId, occurredAt: written.occurredAt }
  } catch (error) {
    console.error("[LEDGER CONFIRM] append-only insert failed", error)
    return { ok: false as const, error: "confirm_insert_failed" }
  }
}
