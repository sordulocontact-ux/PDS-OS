import { SubmitButton } from "@/components/auth/submit-button";
import {
  FramingCallSheet,
  type CallSheetData,
} from "@/components/framing/intel/framing-call-sheet";
import { FactList } from "@/components/ui/fact-list";
import { formatDay } from "@/lib/assistant/facts";
import { fr } from "@/lib/i18n/fr";
import { prepareStrategyCall } from "@/lib/strategy/actions/call";
import { startStrategy } from "@/lib/strategy/actions/workflow";

/**
 * The first opening of the Strategy (ticket § 1): the context at a glance,
 * then two ways in — straight with PO, or an exchange prepared from what
 * is missing. No dashboard yet.
 */
export function StrategyEntry({
  projectId,
  title,
  artist,
  kind,
  releaseDate,
  status,
  canEdit,
  callSheet,
}: {
  projectId: string;
  title: string;
  artist: string;
  kind: string;
  releaseDate: string | null;
  status: string;
  canEdit: boolean;
  callSheet: CallSheetData;
}) {
  const t = fr.strategyFlow.entry;
  return (
    <section
      aria-labelledby="strategy-entry-title"
      className="section-card flex flex-col gap-6 rounded-3xl border border-border bg-background p-5 md:p-8"
    >
      <div className="flex flex-col gap-2">
        <h2 id="strategy-entry-title" className="text-display-sm font-semibold">
          {t.title}
        </h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {canEdit ? t.body : t.readOnly}
        </p>
      </div>
      <FactList
        facts={[
          { label: t.facts.project, value: title },
          { label: t.facts.artist, value: artist || null },
          { label: t.facts.type, value: kind || null },
          {
            label: t.facts.releaseDate,
            value: releaseDate ? formatDay(releaseDate) : t.noReleaseDate,
          },
          { label: t.facts.status, value: status },
        ]}
        emptyLabel="—"
      />
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <form action={startStrategy.bind(null, projectId)}>
            <SubmitButton pendingLabel={t.starting}>{t.start}</SubmitButton>
          </form>
          <FramingCallSheet
            projectId={projectId}
            data={callSheet}
            action={prepareStrategyCall}
            copy={fr.strategyFlow.call}
          />
        </div>
      )}
    </section>
  );
}
