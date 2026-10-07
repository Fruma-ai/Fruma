import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { FrumaVersion } from "../versions";
import { FileSpineStore } from "./file-store";
import { getSpineStore, setSchemaStoresForTests, setSpineStoreForTests } from "./index";
import type { SpineStore } from "./types";

const SCHEMA_SURFACES = ["demo", "test"] as const satisfies readonly FrumaVersion[];

/** Workspace folder the file spine uses when no schema store is pinned. */
export function workspaceDataDir(): string {
  return join(process.cwd(), ".data");
}

/**
 * Integration suites keep every ledger row in a schema store.
 * `.data/` is absent, or present and empty, for the whole run.
 */
export function assertWorkspaceDataDirUntouched(): void {
  const dir = workspaceDataDir();
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir);
  assert.deepEqual(entries, [], `workspace .data/ holds ${entries.join(", ")}`);
}

export type DiskFreeSchemas = {
  demo: SpineStore;
  test: SpineStore;
  close(): void;
};

/**
 * One store per environment schema.
 * Postgres when DATABASE_URL is set. Otherwise each surface is an in-memory schema.
 * No directory path is accepted and nothing is created under `.data/`.
 */
export function installDiskFreeSchemas(): DiskFreeSchemas {
  assertWorkspaceDataDirUntouched();
  setSpineStoreForTests(null);
  if (process.env.DATABASE_URL?.trim()) {
    const schemas: DiskFreeSchemas = {
      demo: getSpineStore("demo"),
      test: getSpineStore("test"),
      close() {
        setSpineStoreForTests(null);
      },
    };
    assert.equal(schemas.demo.kind, "postgres");
    assert.equal(schemas.test.kind, "postgres");
    assert.notEqual(schemas.demo, schemas.test);
    assertWorkspaceDataDirUntouched();
    return schemas;
  }

  const pinned = new Map<FrumaVersion, SpineStore>();
  for (const surface of SCHEMA_SURFACES) pinned.set(surface, FileSpineStore.memory());
  setSchemaStoresForTests(pinned);
  const demo = pinned.get("demo");
  const test = pinned.get("test");
  if (!demo || !test) throw new Error("demo and test schema stores are required");
  assert.equal(demo.kind, "memory");
  assert.equal(test.kind, "memory");
  assert.notEqual(demo, test);
  assertWorkspaceDataDirUntouched();
  return {
    demo,
    test,
    close() {
      setSpineStoreForTests(null);
    },
  };
}
