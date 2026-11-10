import { BriefToDecide } from "@/components/strategy/brief/brief-to-decide";
import { BriefDocument } from "@/components/ui/brief-document";
import {
  DocumentSection,
  type DocumentLine,
} from "@/components/ui/document-section";
import { Fold } from "@/components/ui/fold";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatBriefDate } from "@/lib/framing/assess";
import { strategyBrief } from "@/lib/i18n/fr/strategy-brief";
import { strategyPilot } from "@/lib/i18n/fr/strategy-pilot";
import type {
  BriefSnapshot,
  SnapshotItem,
} from "@/lib/strategy/documents/brief-snapshot";
import { briefSummary } from "@/lib/strategy/documents/brief-summary";
import { strategyDimensionTone, type Tone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

const fr = { strategyBrief, strategyPilot };

const t = fr.strategyBrief;

const warn = "text-[color:var(--tone-warning-fg)]";
const none = "text-[color:var(--text-tertiary)]";

/** One answer of a dimension as « libellé | valeur »: its value, its lines
 * (a bold name, a muted tail, in warning while to arbitrate), else what is
 * said when blank. Unlabelled answers take the dimension's name. */
function lineOf(item: SnapshotItem, index: number, name: string) {
  const blank = item.value === null && item.lines.length === 0;
  return {
    key: String(index),
    label: item.label ?? name,
    value: blank ? (
      <span className={none}>{item.empty}</span>
    ) : (
      <span className="flex flex-col gap-1 tabular-nums">
        {item.value !== null && <span>{item.value}</span>}
        {item.lines.map((line, i) => (
          <span key={i} className={cn(line.warn && warn)}>
            {line.head && <b className="font-semibold">{line.head} </b>}
            {line.rest && (
              <span
                className={cn(
                  line.head && !line.warn && "text-muted-foreground",
                )}
              >
                {line.head ? `· ${line.rest}` : line.rest}
              </span>
            )}
          </span>
        ))}
      </span>
    ),
  } satisfies DocumentLine;
}

/**
 * A Brief de sortie stored as a snapshot (the versions before the four
 * parts of `BriefOutDoc`), on the same `BriefDocument`: what remains to
 * arbitrate first, in a callout, then the card — « L'essentiel »
 * (MKT-S1-14), the eight dimensions folded under it (`Fold`), each as
 * « libellé | valeur » (`DocumentSection`), marked while to arbitrate.
 * `projectId` null: a frozen version, its lines lead nowhere.
 */
export function BriefSnapshotView({
  snapshot,
  projectId,
  title,
  status,
  meta,
  actions,
}: {
  snapshot: BriefSnapshot;
  projectId: string | null;
  title: string;
  status: { tone: Tone; label: string };
  meta?: string | null;
  actions?: React.ReactNode;
}) {
  const s = t.summary;
  return (
    <div className="flex flex-col gap-4">
      <BriefToDecide projectId={projectId} items={snapshot.toDecide} />
      <BriefDocument
        title={title}
        status={status}
        actions={actions}
        meta={[s.established(formatBriefDate(snapshot.generatedOn)), meta]
          .filter(Boolean)
          .join(" · ")}
      >
        <DocumentSection
          id="brief-summary"
          title={s.title}
          lines={briefSummary(snapshot).map((row, i) => ({
            key: `${row.key}-${i}`,
            label: row.label,
            value: (
              <span className={cn(row.warn && warn, !row.value && none)}>
                {row.value ?? (row.key === "risks" ? s.noRisk : s.none)}
              </span>
            ),
          }))}
        />
        <div className="border-t border-[color:var(--border-hairline)] py-3.5">
          <Fold summary={s.details}>
            {snapshot.sections.map((section, index) => {
              const name = fr.strategyPilot.dimensions[section.dimension];
              return (
                <DocumentSection
                  key={section.dimension}
                  id={`brief-${section.dimension}`}
                  title={`${fr.strategyPilot.number(index)} ${name}`}
                  marked={section.toDecide}
                  aside={
                    section.toDecide && (
                      <StatusBadge
                        tone={strategyDimensionTone.to_decide}
                        size="sm"
                      >
                        {t.toDecide.badge}
                      </StatusBadge>
                    )
                  }
                  lines={section.items.map((item, i) => lineOf(item, i, name))}
                />
              );
            })}
          </Fold>
        </div>
      </BriefDocument>
    </div>
  );
}
