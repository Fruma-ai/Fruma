import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { IngestException } from "./exceptions";
import { sha256Hex } from "./hash";
import { VISIBILITY_PRIVATE, type DepositMeta, type PrivateBytes } from "./types";

type Stored = {
  meta: DepositMeta;
  bytes: Uint8Array;
};

/**
 * Mill-private byte store. In-memory by default; optional file-backed dir.
 * Brand-facing APIs must never call getBytes.
 */
export class PrivateByteStore {
  private readonly memory = new Map<string, Stored>();
  private readonly dir: string | undefined;

  constructor(dir?: string) {
    this.dir = dir;
    if (dir) mkdirSync(dir, { recursive: true });
  }

  put(input: {
    supplierOrgId: string;
    filename: string;
    bytes: Uint8Array;
    receivedAt?: string;
  }): DepositMeta {
    const bytes = Uint8Array.from(input.bytes);
    const sha256 = sha256Hex(bytes);
    const depositId = randomUUID();
    const meta: DepositMeta = {
      depositId,
      supplierOrgId: input.supplierOrgId,
      filename: input.filename,
      receivedAt: input.receivedAt ?? new Date().toISOString(),
      sha256,
      byteLength: bytes.byteLength,
      visibility: VISIBILITY_PRIVATE,
    };
    this.memory.set(depositId, { meta, bytes });
    if (this.dir) {
      writeFileSync(join(this.dir, `${depositId}.bin`), bytes);
      writeFileSync(join(this.dir, `${depositId}.meta.json`), JSON.stringify(meta));
    }
    return { ...meta };
  }

  getMeta(depositId: string): DepositMeta {
    return { ...this.require(depositId).meta };
  }

  /** Mill / operator only. Never expose through a brand view. */
  getBytes(depositId: string): PrivateBytes {
    const stored = this.require(depositId);
    const fromDisk = this.dir
      ? new Uint8Array(readFileSync(join(this.dir, `${depositId}.bin`)))
      : stored.bytes;
    return {
      bytes: Uint8Array.from(fromDisk),
      sha256: stored.meta.sha256,
      filename: stored.meta.filename,
      receivedAt: stored.meta.receivedAt,
    };
  }

  private require(depositId: string): Stored {
    const stored = this.memory.get(depositId);
    if (!stored) {
      throw new IngestException("unknown_deposit", "Deposit is not in the private store.", {
        depositId,
      });
    }
    return stored;
  }
}
