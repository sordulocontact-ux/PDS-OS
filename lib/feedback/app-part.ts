/**
 * The part of the app a feedback was written on, read from its page path by
 * code: it fills the « Partie » column of the Notion database, so the
 * feedback can be sorted by page (Cadrage, Master, Sessions studio…).
 */

// In the order of the Notion options.
export const APP_PARTS = [
  "projects",
  "overview",
  "framing",
  "master",
  "legal",
  "strategy",
  "conception",
  "production",
  "activations",
  "review",
  "distribution",
  "budget",
  "steering",
  "home",
  "po",
  "work",
  "calendar",
  "calls",
  "sessions",
  "artists",
  "catalog",
  "network",
  "contracts",
  "files",
  "team",
  "scouting",
  "feedback",
] as const;

export type AppPart = (typeof APP_PARTS)[number];

// /app/<section>/…
const SECTIONS = new Map<string, AppPart>([
  ["", "home"],
  ["assistant", "po"],
  ["work", "work"],
  ["calendar", "calendar"],
  ["calls", "calls"],
  ["sessions", "sessions"],
  ["catalog", "catalog"],
  ["network", "network"],
  ["contracts", "contracts"],
  ["files", "files"],
  ["members", "team"],
  ["labo", "scouting"],
  ["feedback", "feedback"],
]);

// /app/projects/<id>/<page>/…
const PROJECT_PAGES = new Map<string, AppPart>([
  ["", "overview"],
  ["framing", "framing"],
  ["master", "master"],
  ["legal", "legal"],
  ["strategy", "strategy"],
  ["design", "conception"],
  ["production", "production"],
  ["activations", "activations"],
  ["review", "review"],
  ["closure", "review"],
  ["release", "distribution"],
  ["budget", "budget"],
  ["calls", "calls"],
  ["sessions", "sessions"],
  ["work", "work"],
  ["files", "files"],
  ["team", "steering"],
  ["deliverables", "steering"],
  ["validations", "steering"],
  ["activity", "steering"],
  ["planning", "steering"],
]);

/** The part of a page of the app, or null when none fits (settings…). */
export function appPartOf(path: string | null): AppPart | null {
  if (!path) return null;
  const [root, app, section = "", ...rest] = path.split(/[?#]/)[0].split("/");
  if (root !== "" || app !== "app") return null;
  if (section === "catalog")
    return rest[0] === "artists" ? "artists" : "catalog";
  if (section === "projects") {
    const [id = "", page = ""] = rest;
    if (id === "" || id === "new") return "projects";
    return PROJECT_PAGES.get(page) ?? null;
  }
  return SECTIONS.get(section) ?? null;
}

/** Every part a topic's feedback was written on, once each, in order. */
export function appPartsOf(paths: (string | null)[]): AppPart[] {
  const found = new Set(paths.map(appPartOf));
  return APP_PARTS.filter((part) => found.has(part));
}
