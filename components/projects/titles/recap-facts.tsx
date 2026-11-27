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
import type { Tone } from "@/lib/ui/state-tones";
import {
  agreementTone,
  dealStageToneOf,
  participationStatusTone,
  workflowStatusTone,
} from "@/lib/ui/state-tones";

// The cells of the collective's recap (retours d'Ibé du 18/11/2026, lot 2)
// that only read: shared by « Titres » par artiste (board-columns.tsx) and
// the overview's compact recap (titles-recap-compact.tsx). No hook: they
// render on the server as well as in the board. « Le tableau lit, les
// modules font »: each state leads to its module. Every state is a dot and
// its word on one line, cut by « … » (Sacha 27/11/2026: one fact a column,
// no pill for a state); a link above the row's own link stays clickable
// (`relative z-10`).

const fr = { deals, projectTitles };

export const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]";
export const muted = "text-[color:var(--text-tertiary)]";

// A state that opens its module, above the row's own link.
export const PILL_LINK =
  "relative z-10 inline-flex max-w-full min-w-0 rounded-sm outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]";

/** A state, linked to its module when it has one: its word on one line,
 * cut by « … » when the column is narrower. */
export function LinkedPill({
  href,
  tone,
  label,
  full,
}: {
  href: string | null;
  tone: Tone;
  label: string;
  // The whole label, when the state shows its first words.
  full?: string;
}) {
  const pill = (
    <StatusBadge tone={tone} size="sm" className="max-w-full min-w-0">
      <span className="truncate">{label}</span>
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
 * « A refusé » (red), « Retiré » (grey): where the artist stands, a dot and
 * its word as every state (no tag since Sacha 27/11/2026). */
export function ContactStatePill({ status }: { status: ParticipationStatus }) {
  return (
    <StatusBadge tone={participationStatusTone[status]} size="sm">
      {fr.projectTitles.participations.statuses[status]}
    </StatusBadge>
  );
}

/** The words of a deal's stage in the recap: « Négociation », « Accord à
 * valider »… (`short`: « À valider », « Validé », the board's column). */
export function accordStageWords(
  accord: Pick<RecapAccord, "stage" | "agreementStatus">,
  short: boolean,
): string | null {
  const a = fr.projectTitles.recap.accord;
  if (!accord.stage) return null;
  return accord.stage === "agreement" && accord.agreementStatus
    ? (short ? a.agreementShort : a.agreement)[accord.agreementStatus]
    : a.stages[accord.stage];
}

/**
 * The accord of an artist (the Business module): its deal's stage alone, in
 * short (« À valider » while the direction decides), in the deal badge's
 * tone, linked to the deal. The rate, the call and who negotiates are read
 * in the side sheet (one fact a column, Sacha 27/11/2026). None: « — ».
 */
export function AccordStage({
  accord,
  artist,
}: {
  accord: RecapAccord;
  artist: string;
}) {
  const words = accordStageWords(accord, true);
  if (!accord.stage || !words)
    return <span className={muted}>{EMPTY_CELL}</span>;
  const long =
    accord.stage === "agreement" && accord.agreementStatus
      ? fr.deals.agreement[accord.agreementStatus]
      : fr.deals.stages[accord.stage];
  return (
    <LinkedPill
      href={accord.href}
      tone={dealStageToneOf({
        stage: accord.stage,
        agreementStatus: accord.agreementStatus,
      })}
      label={words}
      full={
        accord.href
          ? fr.projectTitles.board.negotiation.link(artist, long)
          : undefined
      }
    />
  );
}

/** A participation's contract as a pill, the same in the recap and in
 * « Participations et contrats »: its words (recapContractWords; `short`:
 * the « Contrat » column of the board and of the overview's recap) and
 * tone; null: none expected. */
export function contractStatePill(
  contract: RecapContract,
  short = false,
): { words: string; tone: Tone } | null {
  const words = recapContractWords(contract, short);
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

/** The artist's contract alone (the « Contrat » column of the board and of
 * the overview's recap), its short words (« À rédiger », « Envoyé », « À
 * contresigner »), opening the person's démarche. None expected: « — ». */
export function ContractFacts({
  contract,
}: {
  contract: { state: RecapContract; href: string | null };
}) {
  const pill = contractStatePill(contract.state, true);
  if (!pill) return <span className={muted}>{EMPTY_CELL}</span>;
  return (
    <LinkedPill href={contract.href} tone={pill.tone} label={pill.words} />
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

/** A fiche's pill in three words, under a « Fiche » column (« Pas
 * envoyée », « Envoyée », « Renseignée »), opening the fiche itself, filled
 * or not. A fiche received and not yet validated says so on hover and to a
 * screen reader; `name`: whose fiche, for a screen reader. No démarche yet
 * (a guest not credited in the Catalogue): no link, and the hover says when
 * there will be one. */
export function FichePill({
  fiche,
  name,
}: {
  fiche: RecapFiche;
  name?: string;
}) {
  const r = fr.projectTitles.recap.legal;
  const state =
    fiche.status === "toValidate"
      ? r.ficheToValidate
      : r.ficheStates[fiche.state];
  const full = !fiche.href
    ? r.ficheLater
    : name
      ? r.openFiche(name, state)
      : state;
  return (
    <LinkedPill
      href={fiche.href}
      tone={RECAP_FICHE_TONE[fiche.state]}
      label={r.ficheStates[fiche.state]}
      full={full}
    />
  );
}
