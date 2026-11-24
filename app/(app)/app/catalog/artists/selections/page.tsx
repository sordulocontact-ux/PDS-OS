import { IconUsers2 } from "nucleo-sharp-essential";
import Link from "next/link";

import { FormMessage } from "@/components/auth/form-message";
import { NewSelectionButton } from "@/components/catalog/selections/new-selection-button";
import { SelectionsTable } from "@/components/catalog/selections/selections-table";
import { EmptyState } from "@/components/shell/empty-state";
import { SectionFrame } from "@/components/shell/section-frame";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { DataTableViews } from "@/components/ui/data-table";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { listArtistOptions } from "@/lib/catalog/queries";
import { listSelections } from "@/lib/catalog/selections";
import { fr } from "@/lib/i18n/fr";
import { viewHref } from "@/lib/ui/view-href";

export const metadata = {
  title: `${fr.artistSelections.title} · ${fr.app.name}`,
};

/**
 * The selections of artists (lot 4 of docs/pds-mic-plan.md), under the
 * artists: read by the whole team. Who manages the Catalogue (direction,
 * project managers) holds selections: « Mes sélections » first (those
 * created or handed to them), « Toutes » beside; the others see them all,
 * without tabs. « Nouvelle sélection » for who manages the Catalogue.
 */
export default async function ArtistSelectionsPage({
  searchParams,
}: PageProps<"/app/catalog/artists/selections">) {
  const access = await requireApproved();
  const t = fr.artistSelections;
  const canManage = can(access, "manage_catalog");
  const params = await searchParams;
  // Who manages the Catalogue holds selections: theirs first.
  const mineView = canManage && params.view !== "all";
  const [{ selections: all, error }, artists] = await Promise.all([
    listSelections(),
    canManage ? listArtistOptions() : Promise.resolve([]),
  ]);
  const mine = all.filter((s) => s.holder.personId === access.personId);
  const shown = mineView ? mine : all;
  const newButton = canManage ? <NewSelectionButton artists={artists} /> : null;

  const empty = mineView ? (
    <EmptyState
      icon={IconUsers2}
      title={t.empty.mine.title}
      body={t.empty.mine.body}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          {newButton}
          {all.length > 0 && (
            <Link
              href={viewHref(routes.artistSelections, { view: "all" })}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              <ButtonRoll>{t.empty.seeAll}</ButtonRoll>
            </Link>
          )}
        </div>
      }
    />
  ) : (
    <EmptyState
      icon={IconUsers2}
      title={t.empty.all.title}
      body={canManage ? t.empty.all.body : t.empty.readOnly}
      action={newButton}
    />
  );

  return (
    <SectionFrame
      title={t.title}
      description={t.subtitle}
      action={shown.length > 0 ? newButton : null}
      list={false}
      parent={{ label: fr.shell.nav.artists, href: routes.artists }}
    >
      {error ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : (
        <DataTableViews
          label={t.views.label}
          views={
            canManage
              ? [
                  {
                    href: routes.artistSelections,
                    label: t.views.mine,
                    count: mine.length,
                    current: mineView,
                  },
                  {
                    href: viewHref(routes.artistSelections, { view: "all" }),
                    label: t.views.all,
                    count: all.length,
                    current: !mineView,
                  },
                ]
              : []
          }
        >
          {shown.length === 0 ? (
            empty
          ) : (
            <SelectionsTable
              selections={shown}
              viewerPersonId={access.personId}
            />
          )}
        </DataTableViews>
      )}
    </SectionFrame>
  );
}
