import { MasterHistoryCsv } from "@/components/master-workflow/master-history-csv";
import { masterFacts } from "@/components/master-workflow/master-step-frame";
import { ProjectHeader } from "@/components/projects/project-header";
import { StepHistory } from "@/components/shell/journey/step-history";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { ViewLink } from "@/components/ui/view-link";
import { masterJourney } from "@/lib/i18n/fr/master-journey";
import { historyPeople, masterHistory } from "@/lib/master-workflow/history";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";
import { masterStepHref } from "@/lib/ui/master-steps";

const fr = { masterJourney };

const t = fr.masterJourney.history;

/**
 * The Historique du master (proto `master-v2.html`): every gesture of the
 * module, newest first, who made it, when and after what; a filter by
 * person (in the URL) and « Exporter en CSV ». Opened from the journey's
 * foot; « ← Parcours » goes back to the step in progress.
 */
export async function MasterHistory({
  projectId,
  person,
}: {
  projectId: string;
  person: string | null;
}) {
  const { steps, facts } = await masterJourneyContext(projectId);
  const all = masterHistory(facts).reverse();
  const people = historyPeople(all);
  const who = person && people.includes(person) ? person : null;
  const items = who ? all.filter((i) => i.who === who) : all;
  const base = masterStepHref(projectId, "history");
  return (
    <div className="flex flex-col gap-5">
      <ProjectHeader
        projectId={projectId}
        steps={[
          ...steps,
          { href: base, title: fr.masterJourney.steps.history.title },
        ]}
        facts={masterFacts(projectId)}
      />
      <section
        aria-labelledby="master-history-title"
        className="flex min-w-0 flex-col gap-4 rounded-2xl border border-[color:var(--border-hairline)] bg-card p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5 modern:gap-2">
          <h2
            id="master-history-title"
            className="text-[length:var(--type-figure-lg)] leading-[var(--type-figure-lg-lh)] font-medium tracking-[var(--type-display-tracking)]"
          >
            {t.title}
          </h2>
          <MasterHistoryCsv items={items} />
        </div>
        <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
          {t.description}
        </p>
        {people.length > 1 && (
          <SegmentedLinks
            label={t.filterLabel}
            className="self-start"
            options={[
              { href: base, current: !who, label: t.everyone },
              ...people.map((p) => ({
                href: `${base}?par=${encodeURIComponent(p)}`,
                current: who === p,
                label: p,
              })),
            ]}
          />
        )}
        {items.length === 0 ? (
          <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
            {t.empty}
          </p>
        ) : (
          <StepHistory items={items} title={t.title} hideTitle />
        )}
        <ViewLink
          href={masterStepHref(
            projectId,
            steps.find((s) => s.status !== "done")?.key ?? "final",
          )}
          className="self-start text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)] underline underline-offset-4 hover:text-foreground"
        >
          {t.back}
        </ViewLink>
      </section>
    </div>
  );
}
