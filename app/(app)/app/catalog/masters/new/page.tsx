import { CreateMasterForm } from "@/components/catalog/create-master-form";
import { SectionFrame } from "@/components/shell/section-frame";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { getMaster, listArtistOptions } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";

export const metadata = {
  title: `${fr.catalog.masterForm.title} · ${fr.app.name}`,
};

// ?artist=<id>: opened from an artist page — that artist is already credited
// as main artist. ?variantOf=<id>: a new variant of that title — its name
// and credits are copied, and it is linked to the family's original (a
// variant of a variant names the same original, retour 08). Credits stay editable (featuring, other artists,
// order).
export default async function NewMasterPage({
  searchParams,
}: PageProps<"/app/catalog/masters/new">) {
  const access = await requirePermission("manage_catalog");
  const t = fr.catalog.masterForm;
  const { artist: artistParam, variantOf, maquette } = await searchParams;
  // « Nouvelle maquette » (the Catalogue's Maquettes): no variant then.
  const demo = maquette === "1" && typeof variantOf !== "string";
  const [artists, original] = await Promise.all([
    listArtistOptions(),
    typeof variantOf === "string" ? getMaster(variantOf) : null,
  ]);
  const fromArtist =
    typeof artistParam === "string"
      ? artists.find((a) => a.id === artistParam)
      : undefined;

  return (
    <SectionFrame
      list={false}
      className="max-w-2xl"
      title={demo ? fr.demos.newDemo : t.title}
      description={demo ? fr.demos.createHint : t.subtitle}
      parent={
        original
          ? [
              { label: fr.shell.nav.masters, href: routes.masters },
              {
                label: original.title,
                href: routes.masterVariants(original.id),
              },
            ]
          : fromArtist
            ? [
                { label: fr.shell.nav.artists, href: routes.artists },
                { label: fromArtist.name, href: routes.artist(fromArtist.id) },
              ]
            : demo
              ? { label: fr.demos.title, href: routes.demos }
              : { label: fr.shell.nav.masters, href: routes.masters }
      }
    >
      <Card>
        <CardContent>
          <CreateMasterForm
            artists={artists}
            organizationId={access.organizationId}
            defaults={original ? { title: original.title } : undefined}
            demo={demo}
            variantOf={
              original
                ? {
                    id: original.sourceMasterId ?? original.id,
                    title: original.title,
                  }
                : undefined
            }
            defaultCredits={
              original
                ? original.credits
                : fromArtist
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
    </SectionFrame>
  );
}
