import { notFound } from "next/navigation";

import { SheetPanel } from "@/components/activations/sheets/sheet-panel";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { loadActivationFiche } from "@/lib/activations/fiche";
import { loadSheets, versionsOf } from "@/lib/activations/sheet-queries";
import { sheetFieldKeys } from "@/lib/activations/sheets";
import { loadTargets } from "@/lib/activations/targets";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { activationSheetTone } from "@/lib/ui/state-tones";

export const metadata = {
  title: `${fr.activations.tabs.concepts} · ${fr.app.name}`,
};

/** Influence in house : the generic concept, validated by PDS, and where
 * each influencer's own concept stands (« La personnalisation d'un profil ne
 * modifie pas le concept des autres profils »). */
export default async function ActivationConceptsPage({
  params,
}: PageProps<"/app/projects/[projectId]/activations/[activationId]/concepts">) {
  const { projectId, activationId } = await params;
  const access = await requireApproved();
  const {
    activation: a,
    members,
    canWrite,
    canValidate,
  } = await loadActivationFiche(projectId, activationId, access);
  if (a.kind !== "influence" || a.mode !== "internal") notFound();
  const [sheets, targets] = await Promise.all([
    loadSheets(a.id, a.kind),
    loadTargets(a.id),
  ]);
  const t = fr.activationWork;

  return (
    <div className="grid gap-8">
      <SheetPanel
        id="concept"
        title={t.concepts.title}
        description={t.concepts.description}
        projectId={projectId}
        activationId={a.id}
        kind="concept"
        targetId={null}
        keys={sheetFieldKeys("concept", a.kind)}
        versions={versionsOf(sheets, "concept", null)}
        prefill={{}}
        members={members}
        canWrite={canWrite}
        canValidate={canValidate}
      />
      <PageSection id="variations" title={t.concepts.variations}>
        {targets.length === 0 ? (
          <EmptyNote>{t.concepts.variationsNone}</EmptyNote>
        ) : (
          <ul className="flex flex-col divide-y divide-[color:var(--border-hairline)] rounded-xl border bg-card">
            {targets.map((x) => {
              const current = versionsOf(sheets, "concept", x.id)[0];
              return (
                <li
                  key={x.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <ViewLink
                    href={`${routes.projectActivationTarget(projectId, a.id, x.id)}#concept`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {x.contactName}
                  </ViewLink>
                  {current ? (
                    <StatusBadge
                      size="sm"
                      tone={activationSheetTone[current.status]}
                    >
                      {t.sheet.version(current.version)} ·{" "}
                      {t.sheet.statuses[current.status]}
                    </StatusBadge>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {t.sheet.none}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PageSection>
    </div>
  );
}
