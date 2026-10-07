export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { bootstrapEnginesFromDatabase } = await import("./lib/fruma/persist/reload-engines");
  await bootstrapEnginesFromDatabase();
}
