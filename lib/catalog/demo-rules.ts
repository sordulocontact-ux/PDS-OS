// Maquettes (retours d'Ibé du 01 et du 05/11/2026): a title not yet decided
// for a release. Its status says where the artistic work stands; the release
// decision (« Passer au catalogue des masters ») is a gesture of its own, on a
// validated maquette, by the direction. Client-safe; the database checks the
// same values (supabase/migrations/20261105220101_studio_sessions.sql).

export const DEMO_STATUSES = [
  "draft",
  "developing",
  "validated",
  "abandoned",
] as const;
export type DemoStatus = (typeof DEMO_STATUSES)[number];

/** The statuses a maquette can be created with (never validated at once). */
export const DEMO_START_STATUSES = ["draft", "developing"] as const;

export function demoStatusOf(value: string | null): DemoStatus | null {
  return (DEMO_STATUSES as readonly (string | null)[]).includes(value)
    ? (value as DemoStatus)
    : null;
}

/** The list's views: the work under way first, the abandoned ones apart. */
export const DEMO_VIEWS = ["active", ...DEMO_STATUSES] as const;
export type DemoView = (typeof DEMO_VIEWS)[number];

export function demoViewOf(value: unknown): DemoView {
  return (DEMO_VIEWS as readonly unknown[]).includes(value)
    ? (value as DemoView)
    : "active";
}

export function inDemoView(status: DemoStatus, view: DemoView): boolean {
  return view === "active" ? status !== "abandoned" : status === view;
}
