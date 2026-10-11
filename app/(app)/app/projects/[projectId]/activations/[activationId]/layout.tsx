import { ActivationHeader } from "@/components/activations/activation-header";
import { SectionTabs } from "@/components/shell/section-tabs";
import { activationTabs, loadActivationFiche } from "@/lib/activations/fiche";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";

// One activation: its header (type, mode, the three axes, its source) and
// one tab per part of its module, each its own URL. Pages check access
// themselves; the fiche is read once per request (loadActivationFiche).
export default async function ActivationLayout({
  children,
  params,
}: LayoutProps<"/app/projects/[projectId]/activations/[activationId]">) {
  const { projectId, activationId } = await params;
  const access = await requireApproved();
  const { activation } = await loadActivationFiche(
    projectId,
    activationId,
    access,
  );
  const tabs = activationTabs(projectId, activation);
  return (
    <div className="flex flex-col gap-6 pt-6">
      <ActivationHeader projectId={projectId} activation={activation} />
      {tabs.length > 1 && (
        <SectionTabs label={fr.activations.tabsLabel} tabs={tabs} />
      )}
      {children}
    </div>
  );
}
