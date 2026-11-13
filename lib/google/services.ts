/**
 * A member's Google services that PDS OS reads (Paramètres › Connexions,
 * docs/ARCHITECTURE.md § 4 quater), shared by the server and the settings form.
 */
export const GOOGLE_SERVICES = ["calendar", "gmail", "drive"] as const;
export type GoogleService = (typeof GOOGLE_SERVICES)[number];

/**
 * What the settings say of one service:
 * - `connected`: Google answered for this member;
 * - `not_set`: the domain's key is not in place yet (nobody is connected);
 * - `refused`: Google refused (delegation or API not granted for it);
 * - `unreachable`: Google did not answer this time;
 * - `off`: the member turned it off.
 */
export type GoogleServiceStatus =
  "connected" | "not_set" | "refused" | "unreachable" | "off";

export const isGoogleService = (value: unknown): value is GoogleService =>
  (GOOGLE_SERVICES as readonly unknown[]).includes(value);

/** How « Connecter un compte Google » ended, said by the settings
 * (`?google=` after Google's return). */
export const CONNECT_OUTCOMES = [
  "connected",
  "already",
  "cancelled",
  "failed",
] as const;
export type ConnectOutcome = (typeof CONNECT_OUTCOMES)[number];

export const isConnectOutcome = (value: unknown): value is ConnectOutcome =>
  (CONNECT_OUTCOMES as readonly unknown[]).includes(value);
