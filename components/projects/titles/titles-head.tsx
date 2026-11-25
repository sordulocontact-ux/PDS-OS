import { ProjectHeader } from "@/components/projects/project-header";
import { TitlesActions } from "@/components/projects/titles/titles-actions";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { DataTableViews } from "@/components/ui/data-table-views";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { legalParticipations } from "@/lib/i18n/fr/legal-participations";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { titleTracks } from "@/lib/i18n/fr/title-tracks";
import { projectArtists } from "@/lib/projects/participation-rules";
import { titleCounts } from "@/lib/projects/title-board-rules";
import type { ProjectTitle } from "@/lib/projects/title-rules";
import { legalParticipationsHref } from "@/lib/ui/legal-steps";
import type { ModuleFact } from "@/lib/ui/module-frame";

const fr = { legalParticipations, projectTitles, titleTracks };

// « Titres » of a collective (Maël 25/11/2026): one entry, two views of
// the same titles — « Par titre » (/tracks: each title's journeys, the way
// into its page) and « Par artiste » (/titles: the team's recap, where the
// titles and their artists are edited). Both pages share this head and
// these views, so that switching view changes the table alone.

/**
 * The head of « Titres », the same on both views: the main artist, the
 * titles by status and the artists of the project; for its owner
 * « Ajouter un titre » and « Changer l'artiste principal », and
 * « Participations et contrats » for whoever reads the Juridique.
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
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <TitlesActions
                projectId={project.id}
                masterOptions={choices.masterOptions}
                artists={choices.artists}
              />
            )}
            {/* Lots 11 and 12: each participation's contract, deal and
                waivers, in the Juridique. */}
            {canOpenLegal && (
              <ViewLink
                href={legalParticipationsHref(project.id)}
                className={buttonVariants({ variant: "ghost" })}
              >
                <ButtonRoll>{fr.legalParticipations.link}</ButtonRoll>
              </ViewLink>
            )}
          </div>
        ) : undefined
      }
    />
  );
}

/** « Par titre » and « Par artiste » above the table, each its own page. */
export function TitlesViews({
  projectId,
  current,
  children,
}: {
  projectId: string;
  current: "tracks" | "artists";
  children: React.ReactNode;
}) {
  const t = fr.titleTracks.views;
  return (
    <DataTableViews
      label={t.label}
      views={[
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
      ]}
    >
      {children}
    </DataTableViews>
  );
}
