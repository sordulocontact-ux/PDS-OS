import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

import { CreateMasterForm } from "@/components/catalog/create-master-form";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { listArtistOptions } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";

// ?artist=<id>: opened from an artist page — that artist is already credited
// as main artist. Credits stay editable (featuring, other artists, order).
export default async function NewMasterPage({
  searchParams,
}: PageProps<"/app/catalog/masters/new">) {
  await requirePermission("manage_catalog");
  const t = fr.catalog.masterForm;
  const { artist: artistParam } = await searchParams;
  const artists = await listArtistOptions();
  const fromArtist =
    typeof artistParam === "string"
      ? artists.find((a) => a.id === artistParam)
      : undefined;

  return (
    <PageContainer className="max-w-2xl">
      <Link
        href={fromArtist ? routes.artist(fromArtist.id) : routes.masters}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        {fromArtist
          ? fr.catalog.artist.backTo(fromArtist.name)
          : fr.catalog.master.back}
      </Link>
      <PageHeader title={t.title} description={t.subtitle} />
      <Card>
        <CardContent>
          <CreateMasterForm
            artists={artists}
            defaultCredits={
              fromArtist
                ? [
                    {
                      artistId: fromArtist.id,
                      name: fromArtist.name,
                      role: "main",
                    },
                  ]
                : undefined
            }
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
