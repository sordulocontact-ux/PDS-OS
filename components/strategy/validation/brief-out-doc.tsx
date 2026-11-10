import { BriefDocument } from "@/components/ui/brief-document";
import {
  DocumentSection,
  type DocumentLine,
} from "@/components/ui/document-section";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatEuros } from "@/lib/budget/types";
import { strategyBriefOut } from "@/lib/i18n/fr/strategy-brief-out";
import type { BriefOut } from "@/lib/strategy/brief-out";
import { dayLabel } from "@/lib/strategy/dimension-model";
import type { Tone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";

const fr = { strategyBriefOut };

const t = fr.strategyBriefOut.doc;
const euros = formatEuros;

const joined = (list: string[]) => list.join(" · ") || t.empty;

/** « Télécharger le PDF » of a stored version, in the head of its card
 * (the four parts' Brief and an older snapshot alike). */
export function BriefOutPdf({
  href,
  fileName,
}: {
  href: string;
  fileName: string;
}) {
  return (
    <PdfExportButton
      href={href}
      fileName={fileName}
      label={t.pdf}
      pendingLabel={t.exporting}
      failedLabel={t.pdfFailed}
      variant="outline"
      size="sm"
    />
  );
}

/**
 * The Brief de sortie on the piece, as the Brief de cadrage (Sacha
 * 09/11/2026: « inspire-toi du Master et du Cadrage, les patterns doivent
 * être pareils partout »): the shared `BriefDocument` — name, its state,
 * « Télécharger le PDF » —, who made and validated it under the card, and
 * its four parts as « libellé | valeur » (`DocumentSection`): Pour qui et
 * pourquoi · Comment · Quand · Objectif et budget. What stays to arbitrate
 * (computed) comes first, in a warning callout, only when there is some.
 */
export function BriefOutDoc({
  version,
  out,
  status,
  meta,
  pdf,
  alerts = [],
}: {
  version: number;
  out: BriefOut;
  status: { tone: Tone; label: string };
  meta?: string | null;
  // A version stored: its PDF, drawn from what was sent.
  pdf: { href: string; fileName: string } | null;
  // Critical alerts of an older version, read before deciding.
  alerts?: string[];
}) {
  // What stays open, said before the document as the Master and the
  // Cadrage say what is missing: a warning callout, never inside the card.
  const warning = (title: string, list: string[]) =>
    list.length > 0 && (
      <ToneCallout tone="warning" as="div">
        <span className="flex flex-col gap-1">
          <strong className="font-semibold">{title}</strong>
          <ul className="list-disc pl-5">
            {list.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </span>
      </ToneCallout>
    );
  const when: DocumentLine[] = out.when.length
    ? out.when.map((w) => ({
        key: `${w.day}-${w.name}`,
        label: formatDay(w.day),
        value: w.name,
        source: w.offset !== null ? dayLabel(w.offset) : null,
      }))
    : [{ key: "none", label: t.when, value: t.empty }];

  return (
    <div className="flex flex-col gap-4">
      {warning(t.alerts, alerts)}
      {warning(t.openPoints, out.openPoints)}
      <BriefDocument
        title={t.title(version)}
        meta={meta}
        status={status}
        actions={pdf && <BriefOutPdf {...pdf} />}
      >
        <DocumentSection
          id="brief-out-who"
          title={t.who}
          lines={[
            {
              key: "positioning",
              label: t.positioning,
              value: joined(out.positioning),
            },
            {
              key: "audiences",
              label: t.audiences,
              value: joined(out.audiences),
            },
            {
              key: "narrative",
              label: t.narrative,
              value: joined(out.narrative),
            },
          ]}
        />
        <DocumentSection
          id="brief-out-how"
          title={t.how}
          lines={[
            { key: "levers", label: t.levers, value: joined(out.levers) },
            {
              key: "deliverables",
              label: t.deliverables,
              value: joined(out.deliverables),
            },
          ]}
        />
        <DocumentSection id="brief-out-when" title={t.when} lines={when} />
        <DocumentSection
          id="brief-out-goal"
          title={t.goal}
          lines={[
            {
              key: "objective",
              label: t.objective,
              value: joined(out.objectives),
            },
            {
              key: "budget",
              label: t.budget,
              value: (
                <span className="tabular-nums">
                  {out.budget.lines === 0
                    ? t.noExpense
                    : euros(out.budget.proposedCents)}
                </span>
              ),
              source:
                out.budget.envelopeToConfirm &&
                out.budget.envelopeCents !== null
                  ? t.envelopeToConfirm(euros(out.budget.envelopeCents))
                  : t.budgetOf(
                      out.budget.envelopeCents === null
                        ? null
                        : euros(out.budget.envelopeCents),
                    ),
            },
          ]}
        />
      </BriefDocument>
    </div>
  );
}
