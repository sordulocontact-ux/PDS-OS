import type { Metadata } from "next";
import { IconGlobePointer } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { DeliveryCard } from "@/components/release/delivery-card";
import { DetectionCard } from "@/components/release/detection-card";
import { SmartlinkCard } from "@/components/release/smartlink-card";
import { EmptyState } from "@/components/shell/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { getPublicEnv } from "@/lib/env-public";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { loadDelivery } from "@/lib/release/delivery-queries";
import { getProjectRelease } from "@/lib/release/queries";
import { isUuid } from "@/lib/release/uuid";
import { createClient } from "@/lib/supabase/server";
import { allInOrder } from "@/lib/utils/parallel";

import { checkRelease, setSmartlinkEnabled } from "../actions";

const t = fr.release;

export const metadata: Metadata = {
  title: `${t.online.title} · ${fr.app.name}`,
};

// "Vérifier maintenant" queries several catalogues in a row.
export const maxDuration = 60;

// Distribution, En ligne: the delivery to the distributor (what blocks it,
// then its trace), the detection on the platforms and the public smartlink.
// Without a recorded release, it says what it waits for (the step stays
// readable, ticket « Architecture globale » § 5).
export default async function ReleaseOnlinePage({
  params,
}: PageProps<"/app/projects/[projectId]/release/online">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  const [access, project, data] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    createClient().then((supabase) => getProjectRelease(supabase, projectId)),
  ]);
  if (!data) notFound();
  const { release, links } = data;
  const delivery = release
    ? await loadDelivery(projectId, release, access)
    : null;

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h2 className="text-lg font-semibold">{t.online.title}</h2>
        <p className="text-sm text-muted-foreground">{t.online.description}</p>
      </header>

      {release && delivery ? (
        <>
          <DeliveryCard
            projectId={projectId}
            view={delivery}
            canEdit={canEditProject(access, project)}
          />
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <DetectionCard
              release={release}
              links={links}
              checkAction={checkRelease.bind(null, projectId)}
            />
            <SmartlinkCard
              url={`${getPublicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}${routes.smartlink(release.smartlink_token)}`}
              enabled={release.smartlink_enabled}
              toggleAction={setSmartlinkEnabled.bind(null, projectId)}
            />
          </div>
        </>
      ) : (
        <EmptyState
          icon={IconGlobePointer}
          title={t.online.title}
          body={t.online.empty}
          action={
            <ViewLink
              href={routes.projectRelease(projectId)}
              className={buttonVariants({ variant: "outline" })}
            >
              {t.online.toPrepare}
            </ViewLink>
          }
        />
      )}
    </div>
  );
}
