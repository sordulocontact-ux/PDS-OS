import { IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { MasterActions } from "@/components/catalog/master-actions";
import { MasterTabs } from "@/components/catalog/master-page/master-tabs";
import { TitleAudioState } from "@/components/catalog/title/title-audio-state";
import { BackLink } from "@/components/shell/back-link";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { ReturnBanner } from "@/components/shell/return-banner";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
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
      <Suspense fallback={null}>
        <ReturnBanner scope={master.id} />
      </Suspense>
      <PageHeader
        title={master.title}
        badge={
          master.audioState && (
            <TitleAudioState
              state={master.audioState}
              validated={master.finalValidatedAt !== null}
            />
          )
        }
        description={[master.artists, variantText(master)]
          .filter(Boolean)
          .join(" · ")}
        action={
          <div className="flex flex-wrap gap-2">
            {can(access, "create_projects") && (
              <Link
                href={routes.projectsNewFromMaster(master.id)}
                // Secondary: the title's next action is « Maintenant »
                // (proto docs/protos/titre.html, one primary per view).
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                <ButtonRoll>
                  <IconPlus aria-hidden data-icon="inline-start" />
                  {t.createProject}
                </ButtonRoll>
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
