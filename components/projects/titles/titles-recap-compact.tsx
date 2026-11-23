import {
  AccordFacts,
  ContactStatePill,
  LegalFacts,
  MixPill,
  caption,
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
} from "@/components/ui/data-table";
import { ViewLink } from "@/components/ui/view-link";
import type { DealStage } from "@/lib/deals/types";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import type { ParticipationStatus } from "@/lib/projects/participation-rules";
import type { RecapAccord, TitleRecap } from "@/lib/projects/recap-rules";
import { titleMixFact } from "@/lib/projects/title-board-rules";

const fr = { projectTitles };

// The columns besides the artist, shown from 1280 px; under it, said under
// the name.
const COLUMN = {
  status: "w-28",
  accord: "w-48 whitespace-normal",
  legal: "w-48 whitespace-normal",
  mix: "w-40 whitespace-normal",
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

/** Under 1280 px, a hidden column under the name. */
function StackedFact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
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
 * the title's label under the name (no note: too much here, Maël
 * 23/11/2026); Statut, Accord
 * (when the reader sees deals), Juridique (manage_legal), the title's Mix. Read only: the row
 * opens « Titres et artistes » (`href`), each pill its module. Rendered on
 * the server.
 */
export function TitlesRecapCompact({
  recap,
  href,
  masterHref,
}: {
  recap: TitleRecap;
  // « Titres et artistes », where everything is edited.
  href: string;
  // The project's Master, when it has one (a title opens on itself).
  masterHref: string | null;
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
          <DataTableHead hideBelow="xl" className={COLUMN.legal}>
            {r.columns.legal}
          </DataTableHead>
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
          const accordFacts = (inline: boolean) =>
            facts.accord && (
              <AccordFacts
                accord={facts.accord}
                artist={artist}
                inline={inline}
                planCall={
                  awaitsCall(participation.status, facts.accord) ? (
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
            );
          const legalFacts = (inline: boolean) => (
            <LegalFacts
              fiche={facts.fiche}
              contract={facts.contract}
              inline={inline}
            />
          );
          return (
            <DataTableRow key={participation.id}>
              <DataTableCell fill className="whitespace-normal">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex min-w-0">
                    <DataTableLink href={href}>{artist}</DataTableLink>
                  </span>
                  <span className={`${caption} truncate`}>
                    {title.recap.label}
                  </span>
                  <span className="sm:hidden">
                    <ContactStatePill status={participation.status} />
                  </span>
                  <span className="mt-1.5 flex flex-col gap-1.5 xl:hidden">
                    {accord && (
                      <StackedFact label={r.columns.accord}>
                        {accordFacts(true)}
                      </StackedFact>
                    )}
                    {legal && (
                      <StackedFact label={r.columns.legal}>
                        {legalFacts(true)}
                      </StackedFact>
                    )}
                    <StackedFact label={r.columns.mix}>{mix}</StackedFact>
                  </span>
                </span>
              </DataTableCell>
              <DataTableCell hideBelow="sm" className={COLUMN.status}>
                <ContactStatePill status={participation.status} />
              </DataTableCell>
              {accord && (
                <DataTableCell hideBelow="xl" className={COLUMN.accord}>
                  {accordFacts(false)}
                </DataTableCell>
              )}
              {legal && (
                <DataTableCell hideBelow="xl" className={COLUMN.legal}>
                  {legalFacts(false)}
                </DataTableCell>
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
