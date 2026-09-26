import { IconPlus } from "nucleo-sharp-essential";
import { IconArrowLeft, IconExternalLink } from "@/components/icons";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArtistAvatar } from "@/components/catalog/artist-avatar";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { getArtist } from "@/lib/catalog/queries";
import { masterLabel } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

// Minimal artist page: where "Cet artiste existe déjà" leads.
export default async function ArtistPage({
  params,
}: PageProps<"/app/catalog/artists/[artistId]">) {
  const access = await requireApproved();
  const { artistId } = await params;
  const artist = await getArtist(artistId);
  if (!artist) notFound();
  const t = fr.catalog.artist;

  return (
    <PageContainer className="max-w-4xl">
      <Link
        href={routes.artists}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="size-4" aria-hidden />
        {t.back}
      </Link>
      <PageHeader
        title={artist.name}
        leading={
          <ArtistAvatar
            name={artist.name}
            pictureUrl={artist.pictureUrl}
            className="size-16 text-[length:var(--type-body-md)]"
          />
        }
        action={
          can(access, "manage_catalog") ? (
            <Link
              href={routes.mastersNewForArtist(artist.id)}
              className={buttonVariants({ size: "lg" })}
            >
              <IconPlus aria-hidden data-icon="inline-start" />
              {t.newMaster}
            </Link>
          ) : null
        }
      />

      {artist.deezerUrl && (
        <a
          href={artist.deezerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="-mt-2 flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          {t.openDeezer}
          <IconExternalLink className="size-3.5" aria-hidden />
        </a>
      )}

      <section aria-labelledby="notes-title" className="flex flex-col gap-3">
        <h2 id="notes-title" className="text-base font-medium">
          {t.notes}
        </h2>
        <p
          className={`text-sm whitespace-pre-line ${artist.notes ? "" : "text-muted-foreground"}`}
        >
          {artist.notes ?? t.noNotes}
        </p>
      </section>

      <section aria-labelledby="masters-title" className="flex flex-col gap-3">
        <h2 id="masters-title" className="text-base font-medium">
          {t.masters}
        </h2>
        {artist.masters.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noMasters}</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {artist.masters.map((master) => (
              <li key={master.id} className="relative px-4 py-3">
                <Link
                  href={routes.master(master.id)}
                  className="text-sm font-medium no-underline after:absolute after:inset-0 hover:underline"
                >
                  {masterLabel(master)}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {master.artists}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
