// Next.js instrumentation — runs once on server startup.
// Starts the in-process monitor scheduler unless disabled.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.DISABLE_SCHEDULER === "1") {
    console.log("[scheduler] disabled via DISABLE_SCHEDULER");
    return;
  }
  const { startScheduler } = await import("./lib/monitors/scheduler");
  startScheduler();
}
