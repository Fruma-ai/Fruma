import { deflateRawSync, inflateRawSync } from "node:zlib";

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;
const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) {
    c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function readU16(buf: Uint8Array, offset: number): number {
  return buf[offset]! | (buf[offset + 1]! << 8);
}

function readU32(buf: Uint8Array, offset: number): number {
  return (
    (buf[offset]! |
      (buf[offset + 1]! << 8) |
      (buf[offset + 2]! << 16) |
      (buf[offset + 3]! << 24)) >>>
    0
  );
}

function writeU16(n: number): Uint8Array {
  return Uint8Array.of(n & 0xff, (n >>> 8) & 0xff);
}

function writeU32(n: number): Uint8Array {
  return Uint8Array.of(
    n & 0xff,
    (n >>> 8) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 24) & 0xff,
  );
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export type ZipEntry = { name: string; bytes: Uint8Array };

function findEocd(buf: Uint8Array): number {
  const min = Math.max(0, buf.length - 22 - 0xffff);
  for (let i = buf.length - 22; i >= min; i -= 1) {
    if (readU32(buf, i) === EOCD_SIG) return i;
  }
  return -1;
}

/** Read a ZIP of stored or deflated entries. ZIP64 / encrypted → caller must exception. */
export function unzip(buf: Uint8Array): ZipEntry[] {
  if (buf.length < 22) throw new Error("zip too small");
  const eocd = findEocd(buf);
  if (eocd < 0) throw new Error("zip eocd missing");
  const disk = readU16(buf, eocd + 4);
  const total = readU16(buf, eocd + 10);
  const cdSize = readU32(buf, eocd + 12);
  const cdOffset = readU32(buf, eocd + 16);
  if (disk !== 0) throw new Error("zip multi-disk");
  if (cdOffset + cdSize > buf.length) throw new Error("zip64 or truncated");

  const entries: ZipEntry[] = [];
  let p = cdOffset;
  for (let i = 0; i < total; i += 1) {
    if (readU32(buf, p) !== CENTRAL_SIG) throw new Error("zip central signature");
    const flag = readU16(buf, p + 8);
    const method = readU16(buf, p + 10);
    const crc = readU32(buf, p + 16);
    const compSize = readU32(buf, p + 20);
    const uncompSize = readU32(buf, p + 24);
    const nameLen = readU16(buf, p + 28);
    const extraLen = readU16(buf, p + 30);
    const commentLen = readU16(buf, p + 32);
    const localOff = readU32(buf, p + 42);
    if (flag & 0x0001) throw new Error("zip encrypted");
    if (flag & 0x0008) throw new Error("zip data descriptor");
    const name = new TextDecoder("utf-8").decode(buf.subarray(p + 46, p + 46 + nameLen));
    if (readU32(buf, localOff) !== LOCAL_SIG) throw new Error("zip local signature");
    const localNameLen = readU16(buf, localOff + 26);
    const localExtraLen = readU16(buf, localOff + 28);
    const dataOff = localOff + 30 + localNameLen + localExtraLen;
    const compact = buf.subarray(dataOff, dataOff + compSize);
    let raw: Uint8Array;
    if (method === METHOD_STORE) raw = compact;
    else if (method === METHOD_DEFLATE) raw = inflateRawSync(compact);
    else throw new Error(`zip method ${method}`);
    if (raw.length !== uncompSize) throw new Error("zip size mismatch");
    if (crc32(raw) !== crc) throw new Error("zip crc mismatch");
    entries.push({ name, bytes: raw });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export function zip(entries: ZipEntry[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  const enc = new TextEncoder();

  for (const entry of entries) {
    const name = enc.encode(entry.name);
    const raw = entry.bytes;
    const compact = deflateRawSync(raw);
    const crc = crc32(raw);
    const local = concat([
      writeU32(LOCAL_SIG),
      writeU16(20),
      writeU16(0),
      writeU16(METHOD_DEFLATE),
      writeU16(0),
      writeU16(0),
      writeU32(crc),
      writeU32(compact.length),
      writeU32(raw.length),
      writeU16(name.length),
      writeU16(0),
      name,
      compact,
    ]);
    locals.push(local);
    centrals.push(
      concat([
        writeU32(CENTRAL_SIG),
        writeU16(20),
        writeU16(20),
        writeU16(0),
        writeU16(METHOD_DEFLATE),
        writeU16(0),
        writeU16(0),
        writeU32(crc),
        writeU32(compact.length),
        writeU32(raw.length),
        writeU16(name.length),
        writeU16(0),
        writeU16(0),
        writeU16(0),
        writeU16(0),
        writeU32(0),
        writeU32(offset),
        name,
      ]),
    );
    offset += local.length;
  }

  const cd = concat(centrals);
  const eocd = concat([
    writeU32(EOCD_SIG),
    writeU16(0),
    writeU16(0),
    writeU16(entries.length),
    writeU16(entries.length),
    writeU32(cd.length),
    writeU32(offset),
    writeU16(0),
  ]);
  return concat([...locals, cd, eocd]);
}
