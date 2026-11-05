import { IconPlus } from "nucleo-sharp-essential";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DemoActions } from "@/components/catalog/demos/demo-actions";
import { MasterActions } from "@/components/catalog/master-actions";
import { MasterTabs } from "@/components/catalog/master-page/master-tabs";
import { TitleAudioState } from "@/components/catalog/title/title-audio-state";
import { TitleCover } from "@/components/catalog/title/title-cover";
import { BackLink } from "@/components/shell/back-link";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { ReturnBanner } from "@/components/shell/return-banner";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { listMasterCovers } from "@/lib/catalog/covers";
import { getMaster } from "@/lib/catalog/queries";
import { variantText } from "@/lib/catalog/title-rules";
import { fr } from "@/lib/i18n/fr";
import { demoStatusTone } from "@/lib/ui/state-tones";
import { allInOrder } from "@/lib/utils/parallel";

// The tab names the title and the section, as a project's pages do
// (« Nuit blanche · Fichiers · PDS OS »).
export async function generateMetadata({
  params,
}: LayoutProps<"/app/catalog/masters/[masterId]">): Promise<Metadata> {
  const { masterId } = await params;
  const master = await getMaster(masterId).catch(() => null);
  if (!master) return {};
  return {
    title: {
      template: `${master.title} · %s · ${fr.app.name}`,
      default: `${master.title} · ${fr.app.name}`,
    },
  };
}

// Title frame ("master" in the code): header (cover, title, audio state,
// artists, variant, actions) and section tabs. Pages
// below check access themselves (a layout does not re-run on client
// navigation); getMaster is cached per request, so they reuse it.
export default async function MasterLayout({
  children,
  params,
}: LayoutProps<"/app/catalog/masters/[masterId]">) {
  const { masterId } = await params;
  const [access, master, covers] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
    listMasterCovers(masterId),
  ]);
  if (!master) notFound();
  const t = fr.catalog.master;
  const canEdit = can(access, "manage_catalog");
  // A maquette (retours d'Ibé du 01 et du 05/11/2026): its status and the
  // release decision instead of « Créer un projet ».
  const demo = master.demoStatus;

  return (
    <PageContainer className="max-w-6xl">
      <BackLink href={demo ? routes.demos : routes.masters}>
        {demo ? fr.demos.back : t.back}
      </BackLink>
      <Suspense fallback={null}>
        <ReturnBanner scope={master.id} />
      </Suspense>
      <PageHeader
        title={master.title}
        leading={
          <TitleCover
            masterId={master.id}
            organizationId={access.organizationId}
            title={master.title}
            cover={covers.get(master.id) ?? null}
            canEdit={canEdit}
          />
        }
        badge={
          demo ? (
            <StatusBadge tone={demoStatusTone[demo]}>
              {fr.demos.badge(fr.demos.statuses[demo])}
            </StatusBadge>
          ) : (
            master.audioState && (
              <TitleAudioState
                state={master.audioState}
                validated={master.finalValidatedAt !== null}
              />
            )
          )
        }
        description={[master.artists, variantText(master)]
          .filter(Boolean)
          .join(" · ")}
        action={
          <div className="flex flex-wrap gap-2">
            {demo && (
              <DemoActions
                masterId={master.id}
                title={master.title}
                status={demo}
                artistic={
                  can(access, "validate") || can(access, "creative_work")
                }
                canManage={canEdit}
                canPromote={can(access, "validate")}
              />
            )}
            {!demo && can(access, "create_projects") && (
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
                canEdit,
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
