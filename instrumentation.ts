/**
 * The Node server boots the ledger once. The request proxy is a separate
 * bundle, `.next/server/middleware.js`, and Next calls this same hook before
 * `proxy()` can allow or reject a visit. A database connection there turns an
 * unsigned request into a 500 when Postgres is unreachable.
 */
export function bootsLedgerOnThisProcess(stack = new Error().stack ?? ""): boolean {
  return !/(?:^|[/\\])middleware\.js\b/.test(stack);
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!bootsLedgerOnThisProcess()) return;
  const { bootstrapEnginesFromDatabase } = await import("./lib/fruma/persist/reload-engines");
  await bootstrapEnginesFromDatabase();
}
