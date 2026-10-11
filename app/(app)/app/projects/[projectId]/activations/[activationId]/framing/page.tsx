import { notFound } from "next/navigation";

import { PressKitPanel } from "@/components/activations/sheets/press-kit-panel";
import { SheetPanel } from "@/components/activations/sheets/sheet-panel";
import { loadActivationFiche } from "@/lib/activations/fiche";
import { loadPressKit } from "@/lib/activations/press-kit";
import {
  framingPrefill,
  loadSheets,
  strategyChangedAt,
  versionsOf,
} from "@/lib/activations/sheet-queries";
import { sheetFieldKeys } from "@/lib/activations/sheets";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: `${fr.activationWork.framing.title} · ${fr.app.name}`,
};

/**
 * The framing of an Influence or RP activation, common to both modes : taken
 * from the Stratégie with its provenance, versioned, validated by a PDS
 * validator ; for RP, the Dossier de presse of the Stratégie next to it.
 */
export default async function ActivationFramingPage({
  params,
}: PageProps<"/app/projects/[projectId]/activations/[activationId]/framing">) {
  const { projectId, activationId } = await params;
  const access = await requireApproved();
  const {
    activation: a,
    project,
    members,
    canWrite,
    canValidate,
  } = await loadActivationFiche(projectId, activationId, access);
  if (a.kind !== "influence" && a.kind !== "press") notFound();
  const [sheets, prefill, changedAt, kit] = await Promise.all([
    loadSheets(a.id, a.kind),
    framingPrefill(projectId, a.kind, project),
    strategyChangedAt(projectId),
    a.kind === "press" ? loadPressKit(projectId) : null,
  ]);
  const versions = versionsOf(sheets, "framing", null);
  const validated = versions.find((v) => v.status === "validated");
  let sentWithKit = 0;
  if (kit?.approved) {
    const { count } = await (
      await createClient()
    )
      .from("activation_messages")
      .select("id", { count: "exact", head: true })
      .eq("activation_id", a.id)
      .eq("status", "sent_declared")
      .eq("press_kit_document_id", kit.approved.id);
    sentWithKit = count ?? 0;
  }
  const t = fr.activationWork.framing;

  return (
    <div className="grid gap-8">
      <SheetPanel
        id="framing"
        title={t.title}
        description={a.kind === "press" ? t.descriptionPress : t.description}
        projectId={projectId}
        activationId={a.id}
        kind="framing"
        targetId={null}
        keys={sheetFieldKeys("framing", a.kind)}
        versions={versions}
        prefill={prefill}
        members={members}
        canWrite={canWrite}
        canValidate={canValidate}
        strategyChanged={Boolean(
          validated?.decidedAt && changedAt && changedAt > validated.decidedAt,
        )}
      />
      {kit && (
        <PressKitPanel
          projectId={projectId}
          kit={kit}
          sentCount={sentWithKit}
        />
      )}
    </div>
  );
}
