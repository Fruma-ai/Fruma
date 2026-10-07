const fs = require('fs');
const path = require('path');

// Strict architectural blacklists to preserve our Horizon 1 & 2 logic
const VIOLATIONS = [
  { pattern: /ON CONFLICT DO UPDATE/i, error: "CRITICAL REGRESSION: Destructive upserts are forbidden. Use versioned appends (MAX+1)." },
  { pattern: /surface_environment/i, error: "CRITICAL REGRESSION: Legacy column filtering detected. Enforce PostgreSQL schema search_path routing." },
  { pattern: /fs\.writeFileSync/i, error: "CRITICAL REGRESSION: Local file-system spine writes detected. Fruma must run 100% disk-free." }
];

const targetDirs = ['lib/fruma', 'app/api'];

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      for (const violation of VIOLATIONS) {
        if (violation.pattern.test(content)) {
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
