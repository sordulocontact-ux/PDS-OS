import { DealStageBadge } from "@/components/deals/deal-stage-badge";
import { EMPTY_CELL } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { deals } from "@/lib/i18n/fr/deals";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import type { ParticipationStatus } from "@/lib/projects/participation-rules";
import type {
  RecapAccord,
  RecapContract,
  RecapFiche,
} from "@/lib/projects/recap-rules";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/utils/day";
import type { Tone } from "@/lib/ui/state-tones";
import {
  agreementTone,
  participationStatusTone,
  workflowStatusTone,
} from "@/lib/ui/state-tones";

// The cells of the collective's recap (retours d'Ibé du 18/11/2026, lot 2)
// that only read: shared by « Titres et artistes » (titles-board.tsx) and
// the overview's compact recap (titles-recap-compact.tsx). No hook: they
// render on the server as well as in the board. « Le tableau lit, les
// modules font »: each pill leads to its module; a link inside a row whose
// DataTableLink covers it stays clickable (`relative z-10`).

const fr = { deals, legalContracts, projectTitles };

export const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]";
export const muted = "text-[color:var(--text-tertiary)]";

// A pill that opens its module, above the row's own link.
export const PILL_LINK =
  "relative z-10 inline-flex max-w-full rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]";

/** A cell's facts: one under the other in a column, side by side under the
 * name (`inline`, a small screen). */
export const factsClass = (inline: boolean) =>
  inline
    ? "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
    : "flex min-w-0 flex-col items-start gap-1";

/** The first words of a state (« En attente · ouverte, pas renvoyée » →
 * « En attente »): a pill of the recap stays short, its whole label read
 * on hover and by a screen reader. */
const short = (label: string) => label.split(" · ")[0];

/** A pill, linked to its module when it has one. */
function LinkedPill({
  href,
  tone,
  label,
  full,
}: {
  href: string | null;
  tone: Tone;
  label: string;
  // The whole label, when the pill shows its first words.
  full?: string;
}) {
  const pill = (
    <StatusBadge
      tone={tone}
      size="sm"
      className="max-w-full truncate"
      title={full && full !== label ? full : undefined}
    >
      {label}
    </StatusBadge>
  );
  if (!href) return pill;
  return (
    <ViewLink
      href={href}
      className={PILL_LINK}
      aria-label={full && full !== label ? full : undefined}
    >
      {pill}
    </ViewLink>
  );
}

/** « À contacter », « Contacté » (orange), « D'accord » (green), « A
 * refusé », « Retiré »: where the artist stands. */
export function ContactStatePill({ status }: { status: ParticipationStatus }) {
  return (
    <StatusBadge tone={participationStatusTone[status]} size="sm">
      {fr.projectTitles.participations.statuses[status]}
    </StatusBadge>
  );
}

/**
 * The accord of an artist (the Business module): its deal's stage (« à
 * valider » while the direction decides), the rate, the day of the call
 * planned and who negotiates, linked to the deal. `planCall`: « Caler le
 * call », given by the board when the row may plan it (instead of the
 * call's day, gone once one is planned). Nothing known: « — ».
 */
export function AccordFacts({
  accord,
  artist,
  planCall,
  inline = false,
}: {
  accord: RecapAccord;
  artist: string;
  planCall?: React.ReactNode;
  inline?: boolean;
}) {
  const r = fr.projectTitles.recap;
  const stage = accord.stage;
  if (!stage && !planCall) return <span className={muted}>{EMPTY_CELL}</span>;
  const stageLabel = stage
    ? stage === "agreement" && accord.agreementStatus
      ? fr.deals.agreement[accord.agreementStatus]
      : fr.deals.stages[stage]
    : null;
  const details = [
    accord.rate,
    accord.nextCallAt ? r.accord.callOn(formatDay(accord.nextCallAt)) : null,
  ].filter((d): d is string => Boolean(d));
  // Who negotiates, once the deal is read; « À affecter » before.
  const negotiator =
    accord.negotiator ??
    (accord.href && stage !== "abandoned"
      ? fr.projectTitles.board.negotiation.unassigned
      : null);
  return (
    <span className={factsClass(inline)}>
      {stage &&
        (accord.href ? (
          <ViewLink
            href={accord.href}
            className={PILL_LINK}
            aria-label={fr.projectTitles.board.negotiation.link(
              artist,
              stageLabel ?? "",
            )}
          >
            <DealStageBadge
              deal={{ stage, agreementStatus: accord.agreementStatus }}
            />
          </ViewLink>
        ) : (
          <DealStageBadge
            deal={{ stage, agreementStatus: accord.agreementStatus }}
          />
        ))}
      {details.length > 0 && (
        <span className="text-[color:var(--text-secondary)] tabular-nums">
          {details.join(" · ")}
        </span>
      )}
      {negotiator && stage && (
        <span className={cn(caption, "max-w-full truncate")}>{negotiator}</span>
      )}
      {planCall}
    </span>
  );
}

/** The words of a person's contract, and its tone; null: none expected. */
function contractPill(
  contract: RecapContract,
): { label: string; full: string; tone: Tone } | null {
  const r = fr.projectTitles.recap;
  switch (contract.kind) {
    case "agreement": {
      const words = fr.legalContracts.agreements.states[contract.state];
      return {
        label: r.legal.contract(short(words)),
        full: r.legal.contract(words),
        tone: agreementTone[contract.state],
      };
    }
    case "waiting_agreement":
      // § 3.5: no contract before the accord.
      return {
        label: r.waitingAgreement,
        full: r.waitingAgreement,
        tone: "warning",
      };
    case "hidden":
      return {
        label: r.legal.contract(r.legal.hidden),
        full: r.legal.contract(r.legal.hidden),
        tone: "neutral",
      };
    case "none":
      return null;
  }
}

/** The artist's fiche and contract, two short pills, each opening the
 * person's démarche in the Juridique. Nothing to say: « — ». */
export function LegalFacts({
  fiche,
  contract,
  inline = false,
}: {
  fiche: RecapFiche | null;
  contract: { state: RecapContract; href: string } | null;
  inline?: boolean;
}) {
  const r = fr.projectTitles.recap;
  const pill = contract ? contractPill(contract.state) : null;
  if (!fiche && !pill) return <span className={muted}>{EMPTY_CELL}</span>;
  return (
    <span className={factsClass(inline)}>
      {fiche && (
        <LinkedPill
          href={fiche.href}
          tone={fiche.badge.tone}
          label={r.legal.fiche(short(fiche.badge.label))}
          full={r.legal.fiche(fiche.badge.label)}
        />
      )}
      {pill && contract && (
        <LinkedPill
          href={contract.href}
          tone={pill.tone}
          label={pill.label}
          full={pill.full}
        />
      )}
    </span>
  );
}

/** Where the title stands in the Master (« Mix V2 à valider »), linked to
 * its Master when given; « — » before its first mix is expected. */
export function MixPill({
  label,
  status,
  href,
}: {
  label: string | null;
  status: keyof typeof workflowStatusTone | null;
  href: string | null;
}) {
  if (!label || !status) return <span className={muted}>{EMPTY_CELL}</span>;
  return (
    <LinkedPill href={href} tone={workflowStatusTone[status]} label={label} />
  );
}

/** A fiche's pill, as the Juridique says it, linked to the démarche. */
export function FichePill({ fiche }: { fiche: RecapFiche }) {
  return (
    <LinkedPill
      href={fiche.href}
      tone={fiche.badge.tone}
      label={fr.projectTitles.recap.legal.fiche(short(fiche.badge.label))}
      full={fr.projectTitles.recap.legal.fiche(fiche.badge.label)}
    />
  );
}
