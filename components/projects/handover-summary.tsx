import { fr } from "@/lib/i18n/fr";
import type { ProjectDetail } from "@/lib/projects/types";

/**
 * Before accepting (PROJ-UX-02): what the transmission brings, what is
 * missing, and what the Cadrage will ask to confirm — decided by code from
 * the project as entered, nothing guessed.
 */
export function HandoverSummary({ project }: { project: ProjectDetail }) {
  const t = fr.transmission.summary;
  const known: string[] = [];
  const missing: string[] = [];
  (project.dueDate ? known : missing).push(t.date);
  (project.budgetCents !== null ? known : missing).push(t.budget);
  if (project.type === "music_release")
    (project.masters.length ? known : missing).push(t.titles);
  (project.artistName ? known : missing).push(t.artist);
  (project.initialContext?.trim() ? known : missing).push(t.context);
  return (
    <div className="grid gap-2 text-sm">
      <p className="font-medium">{t.title}</p>
      {known.length > 0 && <p>{t.known(known.join(", "))}</p>}
      {missing.length > 0 && (
        <p className="text-muted-foreground">{t.missing(missing.join(", "))}</p>
      )}
      <p className="text-muted-foreground">{t.next}</p>
    </div>
  );
}
