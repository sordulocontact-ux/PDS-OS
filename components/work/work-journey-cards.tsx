import { GlobalWorkCountReporter } from "@/components/shell/work-count";
import { JourneyActionsCard } from "@/components/work/journey-actions-card";
import { fr } from "@/lib/i18n/fr";
import { loadMyJourneyWork } from "@/lib/work/journeys";

/**
 * One « À vous » card per project on the global Travail (proto « Projet
 * complet », the project's Travail, here for every project): its actions
 * read from its journeys (lib/work/journeys.ts), decisions marked « À
 * valider ». Streamed on its own inside the Travail's grid; reports each
 * project's count to the main navigation.
 */
export async function WorkJourneyCards() {
  const work = await loadMyJourneyWork();
  const t = fr.work.journeys;
  return (
    <>
      {/* Nothing anywhere: one card says it, never an empty page. */}
      {work.projects.length === 0 && (
        <JourneyActionsCard
          title={t.mine}
          rows={[]}
          empty={t.mineEmpty}
          error={work.error ? t.partial : undefined}
        />
      )}
      {work.projects.map((project) => (
        <JourneyActionsCard
          key={project.projectId}
          title={project.projectTitle}
          rows={project.mine.map((action) => ({ action }))}
          empty={t.mineEmpty}
          all
        />
      ))}
      <GlobalWorkCountReporter byProject={work.byProject} />
    </>
  );
}
