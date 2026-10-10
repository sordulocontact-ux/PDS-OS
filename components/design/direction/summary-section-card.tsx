import { SectionContent } from "@/components/design/direction/section-content";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import type {
  MissingItem,
  SummarySection,
} from "@/lib/design/direction-summary";
import { fr } from "@/lib/i18n/fr";
import { intentionsStateTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

function missingText(item: MissingItem): string {
  const t = fr.conceptionDirection.summary.missing;
  switch (item.kind) {
    case "topics":
      return t.topics(item.topics.map((topic) => fr.conception.topics[topic]));
    case "proposals":
      return t.proposals(item.count);
    default:
      return t[item.kind];
  }
}

/**
 * One section of the synthesis before sending: its title and the state of
 * its intentions, what it carries, what is missing. `select` is the
 * checkbox that puts it in the submission, when the person may submit.
 */
export function SummarySectionCard({
  section,
  select,
  selected,
}: {
  section: SummarySection;
  select?: React.ReactNode;
  selected: boolean;
}) {
  const t = fr.conceptionDirection.summary;
  const title = section.title ?? t.direction;
  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-background p-5 transition-[border-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)]",
        selected && "border-selection",
      )}
    >
      <header className="flex flex-wrap items-center gap-3">
        {select}
        <h3 className="min-w-0 flex-1 text-body-lg font-semibold break-words">
          {title}
        </h3>
        <StatusBadge
          tone={intentionsStateTone[section.intentionsState]}
          size="sm"
        >
          {fr.conception.intentionsStates[section.intentionsState]}
        </StatusBadge>
      </header>
      <SectionContent
        intentions={section.intentions}
        references={section.references}
        note={section.note}
      />
      {section.missing.length > 0 && (
        <ToneCallout tone="warning">
          <span className="font-medium">{t.missingTitle} : </span>
          {section.missing.map(missingText).join(" · ")}
        </ToneCallout>
      )}
    </article>
  );
}
