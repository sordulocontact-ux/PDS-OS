import { EMPTY_CELL } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { deals } from "@/lib/i18n/fr/deals";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import type { ParticipationStatus } from "@/lib/projects/participation-rules";
import {
  RECAP_FICHE_TONE,
  recapContractWords,
  type RecapAccord,
  type RecapContract,
  type RecapFiche,
} from "@/lib/projects/recap-rules";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/utils/day";
import type { Tone } from "@/lib/ui/state-tones";
import {
  agreementTone,
  dealStageToneOf,
  participationStatusTone,
  workflowStatusTone,
} from "@/lib/ui/state-tones";

// The cells of the collective's recap (retours d'Ibé du 18/11/2026, lot 2)
// that only read: shared by « Titres et artistes » (titles-board.tsx) and
// the overview's compact recap (titles-recap-compact.tsx). No hook: they
// render on the server as well as in the board. « Le tableau lit, les
// modules font »: each pill leads to its module; a link inside a row whose
// DataTableLink covers it stays clickable (`relative z-10`).

const fr = { deals, projectTitles };

export const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]";
export const muted = "text-[color:var(--text-tertiary)]";

// A pill that opens its module, above the row's own link.
export const PILL_LINK =
  "relative z-10 inline-flex max-w-full rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]";

// A pill of a cell wraps onto a second line rather than widen its column
// (a table of 4 fixed columns besides the name does not scroll sideways):
// `StatusBadge` is one line by default, `h-5`.
const WRAPPING_PILLS =
  "[&_[data-slot=status-badge]]:h-auto [&_[data-slot=status-badge]]:min-h-5 [&_[data-slot=status-badge]]:max-w-full [&_[data-slot=status-badge]]:py-0.5 [&_[data-slot=status-badge]]:text-left [&_[data-slot=status-badge]]:whitespace-normal";

/** A cell's facts: one under the other in a column, side by side under the
 * name (`inline`, a small screen). */
export const factsClass = (inline: boolean) =>
  cn(
    inline
      ? "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
      : "flex min-w-0 flex-col items-start gap-1",
    WRAPPING_PILLS,
  );

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
      className="h-auto min-h-5 max-w-full py-0.5 text-left [overflow-wrap:anywhere] whitespace-normal"
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

/** « À contacter » (grey), « Contacté » (orange), « D'accord » (green),
 * « A refusé », « Retiré » (grey): where the artist stands. */
export function ContactStatePill({ status }: { status: ParticipationStatus }) {
  return (
    <StatusBadge tone={participationStatusTone[status]} size="sm">
      {fr.projectTitles.participations.statuses[status]}
    </StatusBadge>
  );
}

/** A deal's stage in the recap, on one line: « Accord validé », « Accord à
 * valider », « Négociation »… in the deal badge's tone (dealStageToneOf);
 * the deal's own badge (DealStageBadge) keeps its longer words elsewhere. */
function AccordPill({
  stage,
  agreementStatus,
}: Pick<RecapAccord, "agreementStatus"> & {
  stage: NonNullable<RecapAccord["stage"]>;
}) {
  const a = fr.projectTitles.recap.accord;
  return (
    // Never wrapped (`!`: over the cell's WRAPPING_PILLS).
    <StatusBadge
      tone={dealStageToneOf({ stage, agreementStatus })}
      size="sm"
      className="h-5! whitespace-nowrap!"
    >
      {stage === "agreement" && agreementStatus
        ? a.agreement[agreementStatus]
        : a.stages[stage]}
    </StatusBadge>
  );
}

/**
 * The accord of an artist (the Business module): its deal's stage in short
 * (« Accord à valider » while the direction decides), the rate, the day of the call
 * planned and who negotiates, linked to the deal. `planCall`: « Caler le
 * call », given by the board when the row may plan it (the compact recap
 * gives the words « Call à caler », linked to the board), instead of the
 * call's day, gone once one is planned. Nothing known: « — ».
 */
export function AccordFacts({
  accord,
  artist,
  planCall,
  inline = false,
  rate = true,
  brief = false,
}: {
  accord: RecapAccord;
  artist: string;
  planCall?: React.ReactNode;
  inline?: boolean;
  // false: the rate has its own column (« Taux », the board).
  rate?: boolean;
  // The stage alone, no rate, call nor negotiator (the overview's recap,
  // Maël 23/11/2026: too much there).
  brief?: boolean;
}) {
  const r = fr.projectTitles.recap;
  const stage = accord.stage;
  if (!stage && !planCall) return <span className={muted}>{EMPTY_CELL}</span>;
  const stageLabel = stage
    ? stage === "agreement" && accord.agreementStatus
      ? fr.deals.agreement[accord.agreementStatus]
      : fr.deals.stages[stage]
    : null;
  const details = brief
    ? []
    : [
        rate ? accord.rate : null,
        accord.nextCallAt
          ? r.accord.callOn(formatDay(accord.nextCallAt))
          : null,
      ].filter((d): d is string => Boolean(d));
  // Who negotiates, once the deal is read; « À affecter » before.
  const negotiator = brief
    ? null
    : (accord.negotiator ??
      (accord.href && stage !== "abandoned"
        ? fr.projectTitles.board.negotiation.unassigned
        : null));
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
            <AccordPill
              stage={stage}
              agreementStatus={accord.agreementStatus}
            />
          </ViewLink>
        ) : (
          <AccordPill stage={stage} agreementStatus={accord.agreementStatus} />
        ))}
      {details.length > 0 && (
        <span className="text-[color:var(--text-secondary)] tabular-nums">
          {details.join(" · ")}
        </span>
      )}
      {negotiator && stage && (
        <span className={cn(caption, "max-w-full break-words")}>
          {negotiator}
        </span>
      )}
      {planCall}
    </span>
  );
}

/** A participation's contract as a pill, the same in the recap and in
 * « Participations et contrats »: its words (recapContractWords) and tone;
 * null: none expected. */
export function contractStatePill(
  contract: RecapContract,
): { words: string; tone: Tone } | null {
  const words = recapContractWords(contract);
  if (words === null) return null;
  switch (contract.kind) {
    case "agreement":
      // Sent and the signed copy back: « Retour reçu · à contresigner ».
      return {
        words,
        tone: contract.back ? "action" : agreementTone[contract.state],
      };
    case "waiting_agreement":
      // § 3.5: no contract before the accord.
      return { words, tone: "warning" };
    default:
      return { words, tone: "neutral" };
  }
}

/** The recap's pill: « Contrat · À rédiger » (« En attente de l'accord »
 * alone; `bare`, under a « Contrat » column: its words alone); null: none
 * expected. */
function contractPill(
  contract: RecapContract,
  bare = false,
): { label: string; full: string; tone: Tone } | null {
  const pill = contractStatePill(contract);
  if (!pill) return null;
  const label =
    bare || contract.kind === "waiting_agreement"
      ? pill.words
      : fr.projectTitles.recap.legal.contract(pill.words);
  return { label, full: label, tone: pill.tone };
}

/** The artist's contract alone (the board's « Contrat » column), its words
 * without « Contrat · », opening the person's démarche. None expected:
 * « — ». */
export function ContractFacts({
  contract,
}: {
  contract: { state: RecapContract; href: string | null };
}) {
  const pill = contractPill(contract.state, true);
  if (!pill) return <span className={muted}>{EMPTY_CELL}</span>;
  return (
    <span className={factsClass(false)}>
      <LinkedPill href={contract.href} tone={pill.tone} label={pill.label} />
    </span>
  );
}

/** The artist's fiche and contract, two short pills, each opening the
 * person's démarche in the Juridique. Nothing to say: « — ». */
export function LegalFacts({
  fiche,
  contract,
  inline = false,
}: {
  fiche: RecapFiche | null;
  contract: { state: RecapContract; href: string | null } | null;
  inline?: boolean;
}) {
  const pill = contract ? contractPill(contract.state) : null;
  if (!fiche && !pill) return <span className={muted}>{EMPTY_CELL}</span>;
  return (
    <span className={factsClass(inline)}>
      {fiche && <FichePill fiche={fiche} />}
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

/** A fiche's pill in three words (« Fiche · Envoyée »; `bare`, under a
 * « Fiche de renseignement » column: « Envoyée »), opening the fiche
 * itself, filled or not. A fiche received and not yet validated says so on
 * hover and to a screen reader; `name`: whose fiche, for a screen reader.
 * No démarche yet (a guest not credited in the Catalogue): no link, and the
 * hover says when there will be one. */
export function FichePill({
  fiche,
  bare = false,
  name,
}: {
  fiche: RecapFiche;
  bare?: boolean;
  name?: string;
}) {
  const r = fr.projectTitles.recap.legal;
  const label = bare
    ? r.ficheStates[fiche.state]
    : r.fiche(r.ficheStates[fiche.state]);
  const state =
    fiche.status === "toValidate"
      ? r.ficheToValidate
      : r.ficheStates[fiche.state];
  const full = !fiche.href
    ? r.ficheLater
    : name
      ? r.openFiche(name, state)
      : bare
        ? state
        : r.fiche(state);
  return (
    <LinkedPill
      href={fiche.href}
      tone={RECAP_FICHE_TONE[fiche.state]}
      label={label}
      full={full}
    />
  );
}
