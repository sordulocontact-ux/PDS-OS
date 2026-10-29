import { IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";

import { FormMessage } from "@/components/auth/form-message";
import { TitleAudioState } from "@/components/catalog/title/title-audio-state";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { buttonVariants } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { variantText } from "@/lib/catalog/title-rules";
import type { MasterRow } from "@/lib/catalog/types";
import { catalog } from "@/lib/i18n/fr/catalog";

import { SectionRow, SectionRows } from "@/components/ui/section-rows";

const fr = { catalog };

/**
 * « Titres » of the artist's overview (proto `docs/protos/pages.html`): the
 * titles crediting the artist, the projects holding each, its audio state;
 * « Nouveau titre » for the catalog's managers.
 */
export function ArtistTitles({
  artistId,
  masters,
  error,
  canEdit,
}: {
  artistId: string;
  masters: MasterRow[];
  error: boolean;
  canEdit: boolean;
}) {
  const t = fr.catalog.artistPage.titles;
  return (
    <PageSection
      card
      id="titles"
      title={t.title}
      description={t.description}
      action={
        canEdit && (
          <Link
            href={routes.mastersNewForArtist(artistId)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <IconPlus aria-hidden data-icon="inline-start" />
            {fr.catalog.artist.newMaster}
          </Link>
        )
      }
    >
      {error ? (
        <FormMessage kind="error">
          {fr.catalog.artistPage.loadError}
        </FormMessage>
      ) : masters.length === 0 ? (
        <EmptyNote>{fr.catalog.artist.noMasters}</EmptyNote>
      ) : (
        <SectionRows label={t.title}>
          {masters.map((m) => {
            const variant = variantText(m);
            return (
              <SectionRow
                key={m.id}
                title={
                  <ViewLink
                    href={routes.master(m.id)}
                    className="font-semibold no-underline hover:underline"
                  >
                    {variant ? `${m.title} (${variant})` : m.title}
                  </ViewLink>
                }
                detail={
                  m.projects.length > 0
                    ? t.projects(m.projects.map((p) => p.title).join(", "))
                    : t.noProject
                }
                badge={
                  <TitleAudioState
                    state={m.audioState}
                    validated={m.finalValidatedAt !== null}
                  />
                }
              />
            );
          })}
        </SectionRows>
      )}
    </PageSection>
  );
}
