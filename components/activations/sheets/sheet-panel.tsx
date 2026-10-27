import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import type {
  SheetFieldKey,
  SheetFields,
  SheetVersion,
} from "@/lib/activations/sheets";
import type { Member } from "@/lib/framing/related";
import { activationWork } from "@/lib/i18n/fr/activation-work";
import { formatDate } from "@/lib/release/format";
import { activationSheetTone } from "@/lib/ui/state-tones";

import { SheetDecisions } from "./sheet-decisions";
import { SheetForm } from "./sheet-form";

const fr = { activationWork };

const t = fr.activationWork.sheet;

/**
 * One versioned sheet (a framing, a concept) : its status and version, the
 * decision taken on it, the fields — editable by the writer, read otherwise —
 * and the earlier versions, kept. Without a version yet, the form starts
 * from what PDS OS already knows (`prefill`, each value with its source).
 */
export function SheetPanel({
  id,
  title,
  description,
  projectId,
  activationId,
  kind,
  targetId,
  keys,
  versions,
  prefill,
  members,
  canWrite,
  canValidate,
  strategyChanged = false,
}: {
  id: string;
  title: string;
  description: string;
  projectId: string;
  activationId: string;
  kind: "framing" | "concept";
  targetId: string | null;
  keys: readonly SheetFieldKey[];
  versions: SheetVersion[];
  prefill: SheetFields;
  members: Member[];
  canWrite: boolean;
  canValidate: boolean;
  strategyChanged?: boolean;
}) {
  const [current, ...earlier] = versions;
  const nameOf = (person: string | null) =>
    members.find((m) => m.personId === person)?.name ?? "—";
  const decided = (v: SheetVersion) =>
    v.decidedAt
      ? t.decidedBy(
          t.statuses[v.status],
          nameOf(v.decidedBy),
          formatDate(v.decidedAt),
        )
      : null;
  const notice =
    current?.status === "validated" || current?.status === "refused"
      ? t.newVersion
      : current?.status === "to_validate"
        ? t.waiting
        : null;
  const values = current?.fields ?? prefill;
  return (
    <PageSection
      id={id}
      title={title}
      description={description}
      card
      action={
        current && (
          <SheetDecisions
            projectId={projectId}
            sheetId={current.id}
            status={current.status}
            canWrite={canWrite}
            canValidate={canValidate}
          />
        )
      }
    >
      <div className="flex flex-col gap-4">
        {current ? (
          <div className="flex flex-col gap-1">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{t.version(current.version)}</span>
              <StatusBadge size="sm" tone={activationSheetTone[current.status]}>
                {t.statuses[current.status]}
              </StatusBadge>
              {decided(current) && (
                <span className="text-muted-foreground">
                  {decided(current)}
                </span>
              )}
            </p>
            {current.decisionComment && (
              <p className="text-sm break-words">{current.decisionComment}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t.none}</p>
        )}
        {strategyChanged && (
          <ToneCallout tone="warning">{t.strategyChanged}</ToneCallout>
        )}
        {canWrite ? (
          <SheetForm
            key={current?.id ?? "new"}
            projectId={projectId}
            activationId={activationId}
            kind={kind}
            targetId={targetId}
            keys={keys}
            values={values}
            notice={notice}
          />
        ) : (
          <FactList
            emptyLabel={t.notProvided}
            facts={keys.map((key) => ({
              label: t.fields[key],
              value: values[key]?.value ?? null,
            }))}
          />
        )}
        {earlier.length > 0 && (
          <details className="text-sm">
            <summary className="w-fit cursor-pointer text-muted-foreground underline-offset-4 hover:underline">
              {t.history}
            </summary>
            <ul className="mt-2 flex flex-col gap-1 text-muted-foreground">
              {earlier.map((v) => (
                <li key={v.id}>
                  {t.version(v.version)} · {t.statuses[v.status]}
                  {decided(v) && ` · ${decided(v)}`}
                  {v.decisionComment && ` — ${v.decisionComment}`}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </PageSection>
  );
}
