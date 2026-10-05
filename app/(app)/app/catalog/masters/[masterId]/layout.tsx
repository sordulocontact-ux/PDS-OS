import { IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MasterActions } from "@/components/catalog/master-actions";
import { MasterTabs } from "@/components/catalog/master-page/master-tabs";
import { AudioStateBadge } from "@/components/catalog/title/audio-state-badge";
import { BackLink } from "@/components/shell/back-link";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { getMaster } from "@/lib/catalog/queries";
import { variantText } from "@/lib/catalog/title-rules";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

// Title frame ("master" in the code): header (title, audio state, artists,
// variant, actions) and section tabs. Pages
// below check access themselves (a layout does not re-run on client
// navigation); getMaster is cached per request, so they reuse it.
export default async function MasterLayout({
  children,
  params,
}: LayoutProps<"/app/catalog/masters/[masterId]">) {
  const { masterId } = await params;
  const [access, master] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
  ]);
  if (!master) notFound();
  const t = fr.catalog.master;

  return (
    <PageContainer className="max-w-6xl">
      <BackLink href={routes.masters}>{t.back}</BackLink>
      <PageHeader
        title={master.title}
        badge={
          master.audioState && <AudioStateBadge state={master.audioState} />
        }
        description={[master.artists, variantText(master)]
          .filter(Boolean)
          .join(" · ")}
        action={
          <div className="flex flex-wrap gap-2">
            {can(access, "create_projects") && (
              <Link
                href={routes.projectsNewFromMaster(master.id)}
                className={buttonVariants({ size: "lg" })}
              >
                <IconPlus aria-hidden data-icon="inline-start" />
                {t.createProject}
              </Link>
            )}
            <MasterActions
              master={{
                id: master.id,
                title: master.title,
                projectCount: master.projects.length,
              }}
              rights={{
                canEdit: can(access, "manage_catalog"),
                canArchive: can(access, "archive_records"),
                archived: false,
              }}
              leaveTo={routes.masters}
              size="icon-lg"
            />
          </div>
        }
      />

      <MasterTabs masterId={master.id} />
      <div className="-mt-2 flex flex-col gap-[var(--section-gap)]">
        {children}
      </div>
    </PageContainer>
  );
}
