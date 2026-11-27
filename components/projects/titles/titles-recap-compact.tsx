import { boardColumns } from "@/components/projects/titles/board-columns";
import {
  NAME_COLUMN,
  type BoardColumn,
} from "@/components/projects/titles/board-columns";
import type { BoardRow } from "@/components/projects/titles/board-rows";
import {
  ContactStatePill,
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
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import type { TitleRecap } from "@/lib/projects/recap-rules";

const fr = { projectTitles };

/**
 * The collective's recap at the foot of its overview (retours d'Ibé du
 * 18/11/2026, lot 2: « une vue récap sur tous les titres qui éviterait
 * d'aller dans chaque module »), and « Artistes » of a title's page: one
 * row per artist in play (a participation neither declined nor withdrawn,
 * on a title not abandoned), read as « Titres » par artiste with fewer
 * columns — the same cells and states (board-columns.tsx, Sacha
 * 27/11/2026: one fact a column, a dot and its word): Artiste, Titre,
 * Statut, Accord (when the reader sees deals), Fiche and Contrat
 * (manage_legal), Mix, hidden under 1280 px as before. Read only: the
 * name opens the artist's side sheet in
 * « Titres » (`?ouvrir=`), each state its module. Rendered on the server.
 * On a phone, the title and the status under the name. `oneTitle`: a
 * title's page, no Titre column.
 */
export function TitlesRecapCompact({
  projectId,
  recap,
  href,
  masterHref,
  oneTitle = false,
}: {
  projectId: string;
  recap: TitleRecap;
  // « Titres » par artiste, where everything is read and edited.
  href: string;
  // The project's Master, when it has one (a title opens on itself).
  masterHref: string | null;
  // A title's page: its label on each row would only repeat it.
  oneTitle?: boolean;
}) {
  const r = fr.projectTitles.recap;
  const rows: BoardRow[] = recap.titles
    .filter((title) => title.status !== "abandoned")
    .flatMap((title) =>
      title.participations
        .filter((p) => p.recap.contactState !== null)
        .map((p) => ({ id: p.id, title, participation: p })),
    );
  if (rows.length === 0) return <EmptyNote>{r.overview.empty}</EmptyNote>;
  const columns: BoardColumn[] = boardColumns({
    recap,
    projectId,
    links: { master: masterHref, distribution: null, tracks: true },
    title: !oneTitle,
    compact: true,
  });

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill icon="artist" className={NAME_COLUMN}>
          {r.columns.artist}
        </DataTableHead>
        {columns.map((column) => (
          <DataTableHead
            key={column.key}
            icon={column.icon}
            hideBelow={column.hideBelow}
            fill={column.fill}
            className={column.className}
          >
            {column.label}
          </DataTableHead>
        ))}
      </DataTableHeader>
      <DataTableBody>
        {rows.map((row) => (
          <DataTableRow key={row.id}>
            <DataTableCell fill className={NAME_COLUMN}>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex min-w-0">
                  <DataTableLink href={`${href}?ouvrir=${row.id}`}>
                    {row.participation?.artist.name}
                  </DataTableLink>
                </span>
                {/* On a phone, its hidden columns under the name. */}
                {!oneTitle && (
                  <span className={`${caption} truncate md:hidden`}>
                    {row.title.recap.label}
                  </span>
                )}
                {row.participation && (
                  <span className="flex sm:hidden">
                    <ContactStatePill status={row.participation.status} />
                  </span>
                )}
              </span>
            </DataTableCell>
            {columns.map((column) => (
              <DataTableCell
                key={column.key}
                hideBelow={column.hideBelow}
                fill={column.fill}
                className={column.className}
              >
                {column.cell(row)}
              </DataTableCell>
            ))}
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
