/**
 * Runs once when a server instance starts. Validates the environment and warns
 * instead of crashing, so the home page can show what is missing.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { checkEnv } = await import("@/lib/env");
  const { valid, issues } = checkEnv();
  if (valid) return;

  const lines = issues.map(
    ({ variable, reason }) => `  - ${variable}: ${reason}`,
  );
  console.warn(`[env] Invalid configuration:\n${lines.join("\n")}`);
}
