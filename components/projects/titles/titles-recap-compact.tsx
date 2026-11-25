import {
  AccordFacts,
  ContactStatePill,
  ContractFacts,
  FichePill,
  MixPill,
  caption,
  muted,
} from "@/components/projects/titles/recap-facts";
import { EmptyNote } from "@/components/shell/empty-state";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { ViewLink } from "@/components/ui/view-link";
import type { DealStage } from "@/lib/deals/types";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import type { ParticipationStatus } from "@/lib/projects/participation-rules";
import {
  recapContractWords,
  type RecapAccord,
  type TitleRecap,
} from "@/lib/projects/recap-rules";
import { titleMixFact } from "@/lib/projects/title-board-rules";

const fr = { projectTitles };

// The columns besides the artist, shown from 1280 px (under it, said under
// the name): each one short word on one line, the board's (Maël
// 25/11/2026), so that the artist keeps the rest of the width.
const COLUMN = {
  status: "w-32",
  accord: "w-36",
  fiche: "w-32",
  contract: "w-36",
  mix: "w-36 whitespace-normal",
} as const;

// The stages before the accord: the call is still to come.
const BEFORE_ACCORD: ReadonlySet<DealStage | null> = new Set([
  null,
  "to_contact",
  "call_planned",
  "negotiation",
]);

/** The artist agreed and no call is planned yet, before the accord: the
 * board has « Caler le call » (the overview only says it, and loads no
 * slots for it). */
const awaitsCall = (status: ParticipationStatus, accord: RecapAccord) =>
  status === "confirmed" &&
  !accord.nextCallAt &&
  BEFORE_ACCORD.has(accord.stage);

const Empty = () => <span className={muted}>{EMPTY_CELL}</span>;

/** Under 1280 px, a hidden column under the name: its label, then its
 * word; an empty one is not said there. */
function StackedFact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className={caption}>{label}</span>
      {children}
    </span>
  );
}

/**
 * The collective's recap at the foot of its overview (retours d'Ibé du
 * 18/11/2026, lot 2: « une vue récap sur tous les titres qui éviterait
 * d'aller dans chaque module »): one row per artist in play (a
 * participation neither declined nor withdrawn, on a title not abandoned),
 * the title's label under the name. Read as « Titres et artistes », lighter
 * (Maël 25/11/2026: two lines a cell, its short words): Statut in its tag,
 * the row's main state; Accord (the deal's stage in short, when the reader
 * sees deals); Fiche and Contrat, each its own column (manage_legal); the
 * title's Mix. Read only: the name opens « Titres et artistes » (`href`),
 * each state its module. Rendered on the server. `oneTitle`: a title's
 * page, no label under the name.
 */
export function TitlesRecapCompact({
  recap,
  href,
  masterHref,
  oneTitle = false,
}: {
  recap: TitleRecap;
  // « Titres et artistes », where everything is edited.
  href: string;
  // The project's Master, when it has one (a title opens on itself).
  masterHref: string | null;
  // A title's page: its label under each artist would only repeat it.
  oneTitle?: boolean;
}) {
  const r = fr.projectTitles.recap;
  const accord = recap.dealReach !== "none";
  const legal = recap.canReadLegal;
  const rows = recap.titles
    .filter((title) => title.status !== "abandoned")
    .flatMap((title) =>
      title.participations
        .filter((p) => p.recap.contactState !== null)
        .map((p) => ({ title, participation: p })),
    );
  if (rows.length === 0) return <EmptyNote>{r.overview.empty}</EmptyNote>;

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{r.columns.artist}</DataTableHead>
        {/* On a phone, the status under the name. */}
        <DataTableHead hideBelow="sm" className={COLUMN.status}>
          {r.columns.status}
        </DataTableHead>
        {accord && (
          <DataTableHead hideBelow="xl" className={COLUMN.accord}>
            {r.columns.accord}
          </DataTableHead>
        )}
        {legal && (
          <>
            <DataTableHead hideBelow="xl" className={COLUMN.fiche}>
              {r.columns.ficheShort}
            </DataTableHead>
            <DataTableHead hideBelow="xl" className={COLUMN.contract}>
              {r.columns.contract}
            </DataTableHead>
          </>
        )}
        <DataTableHead hideBelow="xl" className={COLUMN.mix}>
          {r.columns.mix}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {rows.map(({ title, participation }) => {
          const facts = participation.recap;
          const artist = participation.artist.name;
          const mixFact = titleMixFact(title.masterState);
          const status = <ContactStatePill status={participation.status} tag />;
          const mix = (
            <MixPill
              label={mixFact?.label ?? null}
              status={mixFact?.status ?? null}
              href={
                title.master && masterHref
                  ? `${masterHref}?titre=${title.master.id}`
                  : null
              }
            />
          );
          const planCall =
            facts.accord !== null &&
            awaitsCall(participation.status, facts.accord);
          // Under the name, its stage and « Call à caler » side by side.
          const accordFacts = (inline: boolean) =>
            facts.accord ? (
              <AccordFacts
                accord={facts.accord}
                artist={artist}
                inline={inline}
                brief
                board
                planCall={
                  planCall ? (
                    <ViewLink
                      href={href}
                      className="relative z-10 rounded-sm text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)] outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]"
                    >
                      {r.accord.callToPlan}
                      <span className="sr-only">{` · ${artist}`}</span>
                    </ViewLink>
                  ) : undefined
                }
              />
            ) : (
              <Empty />
            );
          const fiche = facts.fiche ? (
            <FichePill fiche={facts.fiche} name={artist} />
          ) : (
            <Empty />
          );
          const contract = facts.contract ? (
            <ContractFacts contract={facts.contract} />
          ) : (
            <Empty />
          );
          // Under the name, only what has a value: no « — » there.
          const stacked = [
            accord && (facts.accord?.stage || planCall)
              ? { label: r.columns.accord, node: accordFacts(true) }
              : null,
            legal && facts.fiche
              ? { label: r.columns.ficheShort, node: fiche }
              : null,
            legal &&
            facts.contract &&
            recapContractWords(facts.contract.state, true) !== null
              ? { label: r.columns.contract, node: contract }
              : null,
            mixFact ? { label: r.columns.mix, node: mix } : null,
          ].filter((fact) => fact !== null);
          return (
            <DataTableRow key={participation.id}>
              <DataTableCell fill className="whitespace-normal">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex min-w-0">
                    <DataTableLink href={href}>{artist}</DataTableLink>
                  </span>
                  {!oneTitle && (
                    <span className={`${caption} truncate`}>
                      {title.recap.label}
                    </span>
                  )}
                  <span className="sm:hidden">{status}</span>
                  {/* The other columns, side by side, wrapping. */}
                  {stacked.length > 0 && (
                    <span className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5 xl:hidden">
                      {stacked.map((fact) => (
                        <StackedFact key={fact.label} label={fact.label}>
                          {fact.node}
                        </StackedFact>
                      ))}
                    </span>
                  )}
                </span>
              </DataTableCell>
              <DataTableCell hideBelow="sm" className={COLUMN.status}>
                {status}
              </DataTableCell>
              {accord && (
                <DataTableCell hideBelow="xl" className={COLUMN.accord}>
                  {accordFacts(false)}
                </DataTableCell>
              )}
              {legal && (
                <>
                  <DataTableCell hideBelow="xl" className={COLUMN.fiche}>
                    {fiche}
                  </DataTableCell>
                  <DataTableCell hideBelow="xl" className={COLUMN.contract}>
                    {contract}
                  </DataTableCell>
                </>
              )}
              <DataTableCell hideBelow="xl" className={COLUMN.mix}>
                {mix}
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
