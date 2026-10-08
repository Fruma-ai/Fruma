import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { sessionFounder, sessionToken } from "../../gate"
import {
  CONFIRMED_VALUE_MAX,
  CONFIRMABLE_FIELDS,
  FOUNDER_SESSION_COOKIE_NAMES,
  SOURCE_CELL_ID_MAX,
  assertAppendOnlyConfirmSql,
  confirmEventBindings,
  executeAppendOnlyConfirm,
  parseConfirmPayload,
  resolveFounderSession,
  type ConfirmEventBindings,
  type ConfirmQuery,
} from "./confirm-mutation"

const ACTION_PATH = "src/app/actions/ledger-mutations.ts"
const TEST_PASS = "confirm-event-test-password"
const EVENT_ID = "confirm:11111111-1111-4111-8111-111111111111"

function actionSource(): string {
  return readFileSync(ACTION_PATH, "utf8")
}

function actionInsertSql(): string {
  const source = actionSource()
  const match = source.match(/const CONFIRM_EVENT_INSERT = `([^`]*)`/)
  assert.ok(match, "action file must declare CONFIRM_EVENT_INSERT")
  return match[1]
}

function parseError(payload: unknown): string {
  const result = parseConfirmPayload(payload)
  assert.equal(result.ok, false)
  if (result.ok) throw new Error("expected a rejected payload")
  return result.error
}

function parsedColour(confirmed = "optic white") {
  const parsed = parseConfirmPayload({
    source_cell_id: " cell:dep-1:2:C:sheet ",
    target_field: " colour ",
    confirmed_value: ` ${confirmed} `,
  })
  assert.equal(parsed.ok, true)
  if (!parsed.ok) throw new Error("expected a parsed payload")
  return parsed.value
}

describe("confirm mutation log", () => {
  it("accepts the nine standard fields and trims operator input", () => {
    assert.deepEqual(CONFIRMABLE_FIELDS, [
      "article",
      "construction",
      "composition",
      "weight",
      "width",
      "colour",
      "moq",
      "customer",
      "cert",
    ])
    const value = parsedColour()
    assert.equal(value.source_cell_id, "cell:dep-1:2:C:sheet")
    assert.equal(value.target_field, "colour")
    assert.equal(value.confirmed_value, "optic white")
  })

  it("rejects a missing payload, an unknown field, and empty confirmation text", () => {
    assert.deepEqual(parseConfirmPayload(null), { ok: false, error: "invalid_payload" })
    assert.equal(
      parseError({
        source_cell_id: "cell-1",
        target_field: "color",
        confirmed_value: "red",
      }),
      "invalid_target_field",
    )
    assert.equal(
      parseError({
        source_cell_id: "   ",
        target_field: "article",
        confirmed_value: "A1",
      }),
      "invalid_source_cell_id",
    )
    assert.equal(
      parseError({
        source_cell_id: "cell-1",
        target_field: "article",
        confirmed_value: "  ",
      }),
      "invalid_confirmed_value",
    )
  })

  it("rejects oversized identifiers and confirmation text", () => {
    assert.equal(
      parseError({
        source_cell_id: "c".repeat(SOURCE_CELL_ID_MAX + 1),
        target_field: "weight",
        confirmed_value: "180",
      }),
      "invalid_source_cell_id",
    )
    assert.equal(
      parseError({
        source_cell_id: "c".repeat(SOURCE_CELL_ID_MAX),
        target_field: "weight",
        confirmed_value: "g".repeat(CONFIRMED_VALUE_MAX + 1),
      }),
      "invalid_confirmed_value",
    )
    const atLimit = parseConfirmPayload({
      source_cell_id: "c".repeat(SOURCE_CELL_ID_MAX),
      target_field: "weight",
      confirmed_value: "g".repeat(CONFIRMED_VALUE_MAX),
    })
    assert.equal(atLimit.ok, true)
  })

  it("reads a founder session from the request cookies and ignores a raw token argument", async () => {
    const previous = process.env.FRUMA_DEMO_PASSWORD
    process.env.FRUMA_DEMO_PASSWORD = TEST_PASS
    try {
      const owen = await sessionToken("owen")
      const sam = await sessionToken("sam")
      const cookies = new Map<string, string>([
        ["fruma_demo", "owen.not-a-session"],
        ["fruma_test", sam],
      ])
      const who = await resolveFounderSession(
        (cookie) => sessionFounder(cookie),
        (name) => cookies.get(name),
      )
      assert.equal(who, "sam")
      assert.deepEqual(FOUNDER_SESSION_COOKIE_NAMES, [
        "fruma_demo",
        "fruma_test",
        "fruma_production",
      ])
      const missing = await resolveFounderSession(
        (cookie) => sessionFounder(cookie),
        () => undefined,
      )
      assert.equal(missing, null)
      assert.equal(await sessionFounder(owen), "owen")
    } finally {
      if (previous === undefined) delete process.env.FRUMA_DEMO_PASSWORD
      else process.env.FRUMA_DEMO_PASSWORD = previous
    }
  })

  it("stores the founder handle and binds confirmed_value away from the statement text", () => {
    const nasty = "DROP TABLE fruma_source_cells; UPDATE fruma_cell_mutation_events SET x = 1"
    const bindings = confirmEventBindings("owen", parsedColour(nasty), EVENT_ID)
    assert.equal(bindings.operatorCookie, "owen")
    assert.equal(bindings.confirmedValue, nasty)
    assert.throws(() => confirmEventBindings(`owen.${"a".repeat(64)}`, parsedColour(), EVENT_ID), /operator_handle_required/)
  })

  it("inserts one confirm event and refuses mutation statements before they run", async () => {
    const sql = actionInsertSql()
    assertAppendOnlyConfirmSql(sql)
    assert.match(sql, /action_type/)
    assert.match(sql, /'confirm'/)
    assert.match(sql, /new_standard_value/)
    assert.match(sql, /\$4/)
    assert.match(sql, /occurred_at/)
    assert.match(sql, /NOW\(\)::timestamptz/)
    assert.match(
      sql,
      /VALUES \(\s*\$1,\s*\$2,\s*\$3,\s*'confirm',\s*NULL,\s*\$4,\s*\$5,\s*NOW\(\)::timestamptz\s*\)/,
    )

    const calls: { query: string; parameters: readonly string[] }[] = []
    const query: ConfirmQuery = async (statement, parameters) => {
      calls.push({ query: statement, parameters })
      return [{ event_id: parameters[0], occurred_at: new Date("2026-10-08T10:51:00.000Z") }]
    }
    const bindings: ConfirmEventBindings = confirmEventBindings("chris", parsedColour("navy"), EVENT_ID)
    const written = await executeAppendOnlyConfirm(query, sql, bindings)
    assert.deepEqual(written, {
      eventId: EVENT_ID,
      occurredAt: "2026-10-08T10:51:00.000Z",
    })
    assert.equal(calls.length, 1)
    assert.equal(calls[0].query, sql)
    assert.deepEqual(calls[0].parameters, [
      EVENT_ID,
      "cell:dep-1:2:C:sheet",
      "chris",
      "navy",
      "colour",
    ])
    assert.equal(calls[0].query.includes("navy"), false)

    let ran = false
    const blocked: ConfirmQuery = async () => {
      ran = true
      return []
    }
    await assert.rejects(
      executeAppendOnlyConfirm(blocked, "DELETE FROM fruma_cell_mutation_events", bindings),
      /append_only_violation/,
    )
    await assert.rejects(
      executeAppendOnlyConfirm(
        blocked,
        "INSERT INTO fruma_source_cells (id) VALUES ($1) ",
        bindings,
      ),
      /source_cell_write_forbidden|confirm_insert_required|append_only_violation|confirm_parameter_shape/,
    )
    assert.equal(ran, false)
  })

  it("keeps a hostile confirmed_value in the parameter list", async () => {
    const hostile = "'); DROP TABLE fruma_source_cells; --"
    const calls: { query: string; parameters: readonly string[] }[] = []
    const query: ConfirmQuery = async (statement, parameters) => {
      calls.push({ query: statement, parameters })
      return [{ event_id: EVENT_ID, occurred_at: "2026-10-08T10:51:00.000Z" }]
    }
    await executeAppendOnlyConfirm(
      query,
      actionInsertSql(),
      confirmEventBindings("sam", parsedColour(hostile), EVENT_ID),
    )
    assert.equal(calls[0].parameters[3], hostile)
    assert.equal(calls[0].query.includes(hostile), false)
    assertAppendOnlyConfirmSql(calls[0].query)
  })

  it("declares an authenticated append-only confirm action", async () => {
    const source = actionSource()
    assert.match(source, /^"use server"\n/)
    const authAt = source.indexOf("sessionFounder(")
    const writeAt = source.indexOf("executeAppendOnlyConfirm(")
    assert.ok(authAt > 0 && writeAt > authAt)
    assert.ok(source.indexOf("INSERT INTO fruma_cell_mutation_events") > 0)
    assert.match(source, /await cookies\(\)/)
    assert.match(source, /confirmEventBindings\(\s*founder,\s*parsed\.value,\s*`confirm:\$\{crypto\.randomUUID\(\)\}`\s*\)/)
    const helper = readFileSync("lib/fruma/persist/confirm-mutation.ts", "utf8")
    assert.match(helper, /operatorCookie: founder/)
    assert.match(helper, /confirmedValue: parsed\.confirmed_value/)
    assert.match(source, /`confirm:\$\{crypto\.randomUUID\(\)\}`/)
    assert.match(source, /postgres\(url, \{ max: 4, prepare: false \}\)/)
    assert.match(source, /CRITICAL_CONFIG_ERROR: DATABASE_URL is missing/)
    assert.match(source, /sql\.unsafe\(query, \[\.\.\.parameters\]\)/)
    assert.equal(source.split("sql.unsafe").length, 2)
    assert.doesNotMatch(source, /\b(?:UPDATE|DELETE|DROP)\b/)
    assert.doesNotMatch(source, /fruma_source_cells/)
    assert.equal(actionInsertSql().includes("${"), false)

    const action = await import("../../../src/app/actions/ledger-mutations")
    const functions = Object.entries(action)
      .filter(([, value]) => typeof value === "function")
      .map(([name]) => name)
    assert.deepEqual(functions, ["confirmStagedSuggestion"])
  })
})
