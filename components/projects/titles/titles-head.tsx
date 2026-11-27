import { ProjectHeader } from "@/components/projects/project-header";
import { TitlesActions } from "@/components/projects/titles/titles-actions";
import { DataTableViews } from "@/components/ui/data-table-views";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { routes } from "@/lib/auth/redirects";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { titleTracks } from "@/lib/i18n/fr/title-tracks";
import { projectArtists } from "@/lib/projects/participation-rules";
import { titleCounts } from "@/lib/projects/title-board-rules";
import type { ProjectTitle } from "@/lib/projects/title-rules";
import { legalParticipationsHref } from "@/lib/ui/legal-steps";
import type { ModuleFact } from "@/lib/ui/module-frame";

const fr = { projectTitles, titleTracks };

// « Titres » of a collective (Maël 25/11/2026): one entry, two views of
// the same titles — « Par titre » (/tracks: each title's journeys, the way
// into its page) and « Par artiste » (/titles: the team's recap, where the
// titles and their artists are edited). Both pages share this head and
// these views, so that switching view changes the table alone.

/**
 * The head of « Titres », the same on both views: the main artist, the
 * titles by status and the artists of the project; for its owner
 * « Ajouter un titre », then « ⋯ » (TitlesActions): « Changer l'artiste
 * principal », and « Participations et contrats » for whoever reads the
 * Juridique.
 */
export function TitlesHeader({
  project,
  titles,
  canManage,
  canOpenLegal,
  choices,
}: {
  project: { id: string; artistName: string | null };
  titles: ProjectTitle[];
  canManage: boolean;
  canOpenLegal: boolean;
  // titleBoardChoices: what « Ajouter un titre » and « Changer l'artiste
  // principal » choose from (empty when the viewer does not write).
  choices: {
    masterOptions: Record<string, string>;
    artists: { options: Record<string, string>; mainArtistId: string | null };
  };
}) {
  const t = fr.projectTitles.board.facts;
  const counts = titleCounts(titles);
  const facts: ModuleFact[] = [
    ...(project.artistName
      ? [{ key: "main", label: t.mainArtist, value: project.artistName }]
      : []),
    {
      key: "titles",
      label: t.titles,
      value: t.titleCounts(counts.active, counts.planned, counts.abandoned),
    },
    {
      key: "artists",
      label: t.artists,
      value: String(projectArtists(titles).length),
    },
  ];
  return (
    <ProjectHeader
      projectId={project.id}
      facts={facts}
      actions={
        canManage || canOpenLegal ? (
          <TitlesActions
            projectId={project.id}
            masterOptions={choices.masterOptions}
            artists={choices.artists}
            canManage={canManage}
            legalHref={
              canOpenLegal ? legalParticipationsHref(project.id) : null
            }
          />
        ) : undefined
      }
    />
  );
}

// « Par titre » (/tracks) and « Par artiste » (/titles).
type TitleView = "tracks" | "artists";

function titleViews(projectId: string, current: TitleView) {
  const t = fr.titleTracks.views;
  return [
    {
      href: routes.projectTracks(projectId),
      label: t.byTitle,
      current: current === "tracks",
    },
    {
      href: routes.projectTitles(projectId),
      label: t.byArtist,
      current: current === "artists",
    },
  ];
}

/** « Par titre » and « Par artiste » above the table, each its own page. */
export function TitlesViews({
  projectId,
  current,
  children,
}: {
  projectId: string;
  current: TitleView;
  children: React.ReactNode;
}) {
  return (
    <DataTableViews
      label={fr.titleTracks.views.label}
      views={titleViews(projectId, current)}
    >
      {children}
    </DataTableViews>
  );
}

/** The two views alone, for a list that puts its filter button beside
 * them (« Par artiste », TitlesBoard `views`). */
export function TitlesViewsSwitch({
  projectId,
  current,
}: {
  projectId: string;
  current: TitleView;
}) {
  return (
    <SegmentedLinks
      label={fr.titleTracks.views.label}
      options={titleViews(projectId, current).map((view) => ({
        key: view.href,
        href: view.href,
        label: view.label,
        current: view.current,
      }))}
    />
  );
}
