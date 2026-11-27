import { ProjectHeader } from "@/components/projects/project-header";
import { TitlesActions } from "@/components/projects/titles/titles-actions";
import { DataTableViews } from "@/components/ui/data-table-views";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { routes } from "@/lib/auth/redirects";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { titleTracks } from "@/lib/i18n/fr/title-tracks";
import { legalParticipationsHref } from "@/lib/ui/legal-steps";

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
  canManage,
  canOpenLegal,
  choices,
  view,
}: {
  project: { id: string; artistName: string | null };
  canManage: boolean;
  canOpenLegal: boolean;
  // titleBoardChoices: what « Ajouter un titre » and « Changer l'artiste
  // principal » choose from (empty when the viewer does not write).
  choices: {
    masterOptions: Record<string, string>;
    artists: { options: Record<string, string>; mainArtistId: string | null };
  };
  // The view shown: « Participations et contrats » opens over it.
  view: "titles" | "tracks";
}) {
  // No facts line (Sacha, 27/11/2026: « Artiste principal PDS · Titres 2 en
  // cours · Artistes 7 » floated under the title): the counts are the list's,
  // the main artist is changed from « ⋯ ».
  return (
    <ProjectHeader
      projectId={project.id}
      facts={[]}
      actions={
        canManage || canOpenLegal ? (
          <TitlesActions
            projectId={project.id}
            masterOptions={choices.masterOptions}
            artists={choices.artists}
            canManage={canManage}
            legalHref={
              canOpenLegal ? legalParticipationsHref(project.id, view) : null
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
