const fs = require('fs');
const path = require('path');

// Strict architectural blacklists to preserve our Horizon 1 & 2 logic.
// Column lists and newlines may sit between ON CONFLICT and DO UPDATE.
// Test assertions and the legacy schema detector are not active SQL.
const UPSERT = /ON\s+CONFLICT(?:\s*\([^)]*\))?\s+DO\s+UPDATE/im;
const SURFACE = /\bsurface_environment\b/i;
const WRITE = /\bwriteFileSync\b/;

const VIOLATIONS = [
  {
    pattern: UPSERT,
    prepare: schemaText,
    error: "CRITICAL REGRESSION: Destructive upserts are forbidden. Use versioned appends (MAX+1).",
  },
  {
    pattern: SURFACE,
    prepare: schemaText,
    error: "CRITICAL REGRESSION: Legacy column filtering detected. Enforce PostgreSQL schema search_path routing.",
  },
  {
    pattern: WRITE,
    prepare: identity,
    error: "CRITICAL REGRESSION: Local file-system spine writes detected. Fruma must run 100% disk-free.",
  },
];

const targetDirs = ['lib/fruma', 'app/api'];

function identity(source) {
  return source;
}

function isExemptPath(fullPath) {
  const normalized = fullPath.split(path.sep).join('/');
  return normalized.includes('.test.ts') || normalized.includes('legacy-detector');
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function stripFunctionNamed(source, name) {
  const marker = new RegExp(`(?:export\\s+)?function\\s+${name}\\b`);
  const found = marker.exec(source);
  if (!found) return source;
  const brace = source.indexOf('{', found.index);
  if (brace < 0) return source;
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(0, found.index) + source.slice(i + 1);
    }
  }
  return source;
}

function schemaText(source) {
  return stripFunctionNamed(stripComments(source), 'legacyLedgerMessage');
}

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      if (isExemptPath(fullPath)) continue;
      const content = fs.readFileSync(fullPath, 'utf8');

      for (const violation of VIOLATIONS) {
        if (violation.pattern.test(violation.prepare(content))) {
          console.error(`\x1b[31m%s\x1b[0m`, `[ARCHITECTURAL VIOLATION] in ${fullPath}`);
          console.error(`\x1b[33m%s\x1b[0m`, `↳ ${violation.error}\n`);
          process.exit(1); // Fail the commit instantly
        }
      }
    }
  }
}

console.log("Parsing Fruma source tree for architectural integrity compliance...");
targetDirs.forEach(scanDirectory);
console.log("\x1b[32m%s\x1b[0m", "✓ Ledger immutability and schema isolation boundaries verified. Commit allowed.");
process.exit(0);
