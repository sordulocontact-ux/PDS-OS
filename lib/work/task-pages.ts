// Where a task of « Mes tâches » leads (retour du 09/11/2026: « des tâches
// qui nous disent d'aller sur telle page […] quand on clique dessus, ça nous
// emmène sur la page concernée »): a page of its project, from a fixed list.
// Client-safe, pure code: the page a meeting's action leads to is read in its
// words here, never guessed by a model (CLAUDE.md, rule 6).

import { routes } from "@/lib/auth/redirects";

// In the order of a project's sidebar.
export const TASK_PAGES = [
  "overview",
  "framing",
  "strategy",
  "design",
  "production",
  "activations",
  "master",
  "sessions",
  "legal",
  "release",
  "budget",
  "calls",
  "files",
] as const;
export type TaskPage = (typeof TASK_PAGES)[number];

const HREF: Record<TaskPage, (projectId: string) => string> = {
  overview: routes.project,
  framing: routes.projectFraming,
  strategy: routes.projectStrategy,
  design: routes.projectDesign,
  production: routes.projectProduction,
  activations: routes.projectActivations,
  master: routes.projectMaster,
  sessions: routes.projectSessions,
  legal: routes.projectLegal,
  release: routes.projectRelease,
  budget: routes.projectBudget,
  calls: routes.projectNotes,
  files: routes.projectFiles,
};

export function isTaskPage(value: unknown): value is TaskPage {
  return (
    typeof value === "string" &&
    (TASK_PAGES as readonly string[]).includes(value)
  );
}

/** The page a task opens: its page of its project, the project's overview
 * when no page is said; nothing without a project. */
export function taskHref(
  projectId: string | null,
  page: TaskPage | null,
): string | null {
  if (!projectId) return null;
  return HREF[page ?? "overview"](projectId);
}

// The words of a task that name a page. What is paid or signed first:
// « Valider le budget du clip » is the Budget before the clip's Conception,
// « Réserver le studio pour les prises de voix » the studio sessions, the
// distributor before the mix, the mix before the studio.
const PAGE_WORDS: Array<[TaskPage, RegExp]> = [
  ["budget", /\b(budget|devis|facture|depense|paiement|payer|rib)\b/],
  [
    "legal",
    /\b(contrat|juridique|split|sacem|droits?|cession|autorisation|signature|signer)/,
  ],
  [
    "release",
    /\b(distribution|distributeur|plateformes?|isrc|upc|date de sortie|mise en ligne|dsp)/,
  ],
  ["master", /\b(mix|mixage|master|mastering|stems?)\b/],
  [
    "sessions",
    /\b(studio|session|prises? de voix|enregistr|ingenieur du son|inge son)/,
  ],
  [
    "activations",
    /\b(activation|influence|influenceu|createurs?|presse|campagne|pub|playlist|showcase|concert)/,
  ],
  ["production", /\b(tournage|shooting|plateau|production|figurant|lieu)/],
  [
    "design",
    /\b(moodboard|realisat|pochette|visuel|clip|direction artistique|references?|cover|teaser|graphis)/,
  ],
  [
    "strategy",
    /\b(strategie|plan de sortie|dossier de presse|cible|positionnement)/,
  ],
  ["framing", /\b(brief|cadrage)/],
  ["calls", /\b(reunion|rendez-vous|rdv|appel|call)\b/],
];

const fold = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** The page a task's words name, else null (the project's overview). */
export function suggestTaskPage(title: string): TaskPage | null {
  const text = fold(title);
  for (const [page, pattern] of PAGE_WORDS) if (pattern.test(text)) return page;
  return null;
}
