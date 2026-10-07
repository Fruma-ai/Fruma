/**
 * Next calls this hook from the Node server during `prepareImpl`, and again
 * from the request proxy before `proxy()` can allow or reject a visit.
 * Only the server stack includes `next-server.js`. The proxy bundle does not,
 * and a database connection there turns an unsigned request into a 500 when
 * Postgres is unreachable. The store still prepares its schema on first use.
 */
export function bootsLedgerOnThisProcess(stack = new Error().stack ?? ""): boolean {
  return /[/\\]next-(?:dev-)?server\.js\b/.test(stack);
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const stack = new Error().stack ?? "";
  const frames = stack
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("at "))
    .slice(0, 8);
  console.error(`fruma register ledger=${bootsLedgerOnThisProcess(stack) ? "boot" : "skip"} ${frames.join(" | ")}`);
  if (!bootsLedgerOnThisProcess(stack)) return;
  const { bootstrapEnginesFromDatabase } = await import("./lib/fruma/persist/reload-engines");
  await bootstrapEnginesFromDatabase();
}
