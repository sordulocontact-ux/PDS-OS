// Where a launched project stands, in the words of its workflows (UX test of
// 09/10/2026: seven « Étapes » — « Défense » included — beside four
// workflows; « Où en est mon projet, au juste ? »). The stages stay in the
// database (the Marketing's checks read them); the screen says Cadrage,
// plan du projet, then the workflow and its step. Pure, client-safe.

import { projectReview } from "@/lib/i18n/fr/production";
import { shell } from "@/lib/i18n/fr/shell";

const fr = { shell, projectReview };

const MARKETING_STEP_OF: Record<
  string,
  keyof typeof fr.shell.project.marketingSteps | null
> = {
  launch_strategy: "strategy",
  design: "conception",
  production: "production",
  // Not decided yet (docs/CONTEXTE-PROJET.md): the Marketing, no step.
  defense: null,
};

/** « Cadrage », « Plan du projet », « Marketing · Conception »… */
export function progressLabel(
  stage: { key: string; state: string } | null,
): string {
  const t = fr.shell.progress;
  const s = fr.shell.project;
  if (!stage) return fr.shell.projects.allValidated;
  if (stage.key === "framing") return t.framing;
  // The Stratégie not started: the plan du projet is what comes next.
  if (stage.key === "launch_strategy" && stage.state === "not_started")
    return t.plan;
  if (stage.key === "delivery") return s.sidebar.distribution;
  // The review stage closes the whole project, apart from the Marketing
  // (ticket « Suivi & bilan »).
  if (stage.key === "review") return fr.projectReview.title;
  const step = MARKETING_STEP_OF[stage.key];
  return step
    ? `${s.sidebar.marketing} · ${s.marketingSteps[step]}`
    : s.sidebar.marketing;
}
