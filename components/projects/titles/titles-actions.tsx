"use client";

import { IconMicrophone, IconScale } from "nucleo-sharp-essential";

import {
  AddTitleForm,
  MainArtistForm,
  type ArtistChoices,
} from "@/components/projects/titles/title-forms";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { ViewLink } from "@/components/ui/view-link";
import { legalParticipations } from "@/lib/i18n/fr/legal-participations";
import { projectTitles } from "@/lib/i18n/fr/project-titles";

const fr = { legalParticipations, projectTitles };

/**
 * The gestures at the head of « Titres » (lot 6 of docs/pds-mic-plan.md):
 * « Ajouter un titre » in outline for whoever writes the project, the rest
 * in « ⋯ » (Sacha 27/11/2026: never three text buttons side by side):
 * « Changer l'artiste principal » in its modal, « Participations et
 * contrats » for whoever reads the Juridique; a single one left stays a
 * button (a reader: « Participations et contrats »). Before the launch the main
 * artist is changed in the project's form: `mainArtist` false.
 */
export function TitlesActions({
  projectId,
  masterOptions,
  artists,
  mainArtist = true,
  canManage = true,
  legalHref = null,
}: {
  projectId: string;
  // The Catalogue's titles not in the project yet: id → « Titre · Artistes ».
  masterOptions: Record<string, string>;
  artists: ArtistChoices;
  mainArtist?: boolean;
  // Writes the titles (« Ajouter un titre », the main artist).
  canManage?: boolean;
  // Each participation's contract, deal and waivers, in the Juridique.
  legalHref?: string | null;
}) {
  const t = fr.projectTitles;
  const current = artists.mainArtistId
    ? (artists.options[artists.mainArtistId] ?? null)
    : null;
  const more: RowAction[] = [
    ...(canManage && mainArtist
      ? [
          {
            key: "main-artist",
            label: t.mainArtist.action,
            icon: IconMicrophone,
            dialog: {
              title: t.mainArtist.title,
              description: t.mainArtist.description(current),
              body: (close: () => void) => (
                <MainArtistForm
                  projectId={projectId}
                  artists={artists}
                  onDone={close}
                />
              ),
            },
          },
        ]
      : []),
    ...(legalHref
      ? [
          {
            key: "legal",
            label: fr.legalParticipations.link,
            icon: IconScale,
            href: legalHref,
          },
        ]
      : []),
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canManage && (
        // The page's main gesture: full size and filled (Sacha, 27/11/2026),
        // its neighbours stay small.
        <DialogButton
          variant="default"
          size="default"
          label={t.add.button}
          title={t.add.title}
          description={t.add.description}
        >
          {(close) => (
            <AddTitleForm
              projectId={projectId}
              masterOptions={masterOptions}
              onDone={close}
            />
          )}
        </DialogButton>
      )}
      {/* One gesture left: a button, never a menu of one. */}
      {more.length === 1 && more[0].href ? (
        <ViewLink
          href={more[0].href}
          className={buttonVariants({
            variant: canManage ? "ghost" : "outline",
            size: "sm",
          })}
        >
          <ButtonRoll>{more[0].label}</ButtonRoll>
        </ViewLink>
      ) : more.length === 1 && more[0].dialog ? (
        <DialogButton
          label={more[0].label}
          variant="ghost"
          title={more[0].dialog.title}
          description={more[0].dialog.description ?? ""}
        >
          {more[0].dialog.body}
        </DialogButton>
      ) : (
        <RowActions label={t.board.more} actions={more} />
      )}
    </div>
  );
}
