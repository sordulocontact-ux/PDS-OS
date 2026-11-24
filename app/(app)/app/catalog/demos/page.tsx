import { IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";

import { FormMessage } from "@/components/auth/form-message";
import { DemosList } from "@/components/catalog/demos/demos-list";
import { TitleListViews } from "@/components/catalog/title/title-list-views";
import { IconDisc } from "@/components/icons";
import { EmptyState } from "@/components/shell/empty-state";
import { SectionFrame } from "@/components/shell/section-frame";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { UrlFilters } from "@/components/ui/url-filters";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { DEMO_STATUSES, demoStatusOf } from "@/lib/catalog/demo-rules";
import { listMasters } from "@/lib/catalog/queries";
import { countTitleViews } from "@/lib/catalog/title-views";
import { fr } from "@/lib/i18n/fr";
import { filterValues } from "@/lib/ui/filter-options";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.demos.title} · ${fr.catalog.masters.title} · ${fr.app.name}`,
};

// The Catalogue's maquettes (retours d'Ibé du 01 et du 05/11/2026): the last
// tab of the Catalogue, a status filter (by default, the ones under way: the
// abandoned ones apart), a search. A maquette opens on its title page, where
// its status changes and, validated, it passes to the masters.
export default async function DemosPage({
  searchParams,
}: PageProps<"/app/catalog/demos">) {
  const [access, { masters: demos, error }, { masters }, params] =
    await allInOrder([
      requireApproved(),
      listMasters({ demos: true }),
      listMasters(),
      searchParams,
    ]);
  const t = fr.demos;
  // Several statuses: any of them.
  const statuses = filterValues(params.statut).flatMap(
    (value) => demoStatusOf(value) ?? [],
  );
  const active = demos.filter((d) => d.demoStatus !== "abandoned");
  const rows =
    statuses.length > 0
      ? demos.filter((d) => d.demoStatus && statuses.includes(d.demoStatus))
      : active;
  const newDemo = can(access, "manage_catalog") ? (
    <Link href={routes.demosNew} className={buttonVariants({ size: "lg" })}>
      <ButtonRoll>
        <IconPlus aria-hidden data-icon="inline-start" />
        {t.newDemo}
      </ButtonRoll>
    </Link>
  ) : null;

  return (
    <SectionFrame
      title={fr.catalog.masters.title}
      description={t.subtitle}
      action={demos.length > 0 ? newDemo : null}
      toolsAction
    >
      {error ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : (
        <TitleListViews
          view="demos"
          counts={countTitleViews(masters)}
          demoCount={active.length}
          archived={false}
          filters={{}}
          pageAction={demos.length > 0 ? newDemo : null}
        >
          {demos.length === 0 ? (
            <EmptyState
              icon={IconDisc}
              title={t.empty.title}
              body={t.empty.body}
              action={newDemo}
            />
          ) : (
            <DemosList
              rows={rows}
              filters={
                <UrlFilters
                  path={routes.demos}
                  params={{}}
                  groups={[
                    {
                      key: "statut",
                      label: t.status.label,
                      allLabel: t.views.active,
                      options: DEMO_STATUSES.filter((s) =>
                        demos.some((d) => d.demoStatus === s),
                      ).map((value) => ({
                        value,
                        label: t.statuses[value],
                      })),
                      current: statuses,
                    },
                  ]}
                />
              }
              empty={
                <EmptyState
                  icon={IconDisc}
                  title={t.empty.view}
                  body={t.empty.viewBody}
                />
              }
            />
          )}
        </TitleListViews>
      )}
    </SectionFrame>
  );
}
