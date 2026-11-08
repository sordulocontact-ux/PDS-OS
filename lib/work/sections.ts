// The two sections of the Travail (retour du 31/10/2026): what the projects
// ask, and « Mes tâches ». Client-safe: read by the page and by its tabs.

export const WORK_SECTIONS = ["actions", "tasks"] as const;
export type WorkSection = (typeof WORK_SECTIONS)[number];

// In the URL, in French as the other params of the page (?vue=, ?echeance=).
export const SECTION_PARAM = "section";
export const TASKS_SECTION_VALUE = "taches";
