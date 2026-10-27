import { PressKitPanel } from "@/components/activations/sheets/press-kit-panel";
import { SheetPanel } from "@/components/activations/sheets/sheet-panel";
import { VersionCard } from "@/components/ui/version-card";
import type { ActivationFiche } from "@/lib/activations/fiche";
import { loadPressKit } from "@/lib/activations/press-kit";
import {
  framingPrefill,
  loadSheets,
  strategyChangedAt,
  versionsOf,
} from "@/lib/activations/sheet-queries";
import { sheetFieldKeys } from "@/lib/activations/sheets";
import { activationJourney } from "@/lib/i18n/fr/activation-journey";
import { activationWork } from "@/lib/i18n/fr/activation-work";
import { activationSheetTone } from "@/lib/ui/state-tones";

import { TransmissionCard } from "./transmission-card";

const fr = { activationWork, activationJourney };

const t = fr.activationJourney.pressBlock;

/**
 * RP, common to both modes (proto rpCadrage, rpKit): the « Cadrage RP »
 * card (taken from the Stratégie with its provenance, versioned, validated
 * by the direction), the « Dossier de presse » card — the one of the
 * Stratégie, never a copy (decision of 19/10, docs/ARCHITECTURE.md § 8
 * duodecies) — and, through an agency, « Transmission à l'agence ».
 */
export async function PressFraming({ fiche }: { fiche: ActivationFiche }) {
  const {
    activation: a,
    project,
    board,
    members,
    canWrite,
    canValidate,
  } = fiche;
  const [sheets, prefill, changedAt, kit] = await Promise.all([
    loadSheets(a.id, a.kind),
    framingPrefill(project.id, a.kind, project),
    strategyChangedAt(project.id),
    loadPressKit(project.id),
  ]);
  const versions = versionsOf(sheets, "framing", null);
  const current = versions[0];
  const validated = versions.find((v) => v.status === "validated");
  const sentWithKit = kit.approved
    ? board.modules.messages.filter(
        (m) => m.activation_id === a.id && m.status === "sent_declared",
      ).length
    : 0;
  const w = fr.activationWork;
  const transmission = board.modules.transmissions.find(
    (x) => x.activation_id === a.id,
  );
  return (
    <>
      <VersionCard
        id="framing"
        title={t.framing}
        status={{
          tone: current ? activationSheetTone[current.status] : "neutral",
          label: current ? w.sheet.statuses[current.status] : t.framingNone,
        }}
        meta={t.common}
        defaultOpen={!validated}
        className="scroll-mt-5"
      >
        <SheetPanel
          id="framing-sheet"
          title={w.framing.title}
          description={w.framing.descriptionPress}
          projectId={project.id}
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
            validated?.decidedAt &&
            changedAt &&
            changedAt > validated.decidedAt,
          )}
        />
      </VersionCard>
      <VersionCard
        id="kit"
        title={t.kit}
        status={
          kit.approved
            ? {
                tone: "success",
                label: w.pressKit.validated(kit.approved.version),
              }
            : kit.latest?.state === "sent"
              ? {
                  tone: "action",
                  label: w.pressKit.pending(kit.latest.version),
                }
              : { tone: "warning", label: w.pressKit.draft }
        }
        meta={t.kitMeta}
        defaultOpen={Boolean(validated) && !kit.approved}
        className="scroll-mt-5"
      >
        <PressKitPanel
          projectId={project.id}
          kit={kit}
          sentCount={sentWithKit}
        />
      </VersionCard>
      {a.mode === "agency" && (
        <TransmissionCard
          projectId={project.id}
          activationId={a.id}
          agency={null}
          ready={Boolean(validated) && Boolean(kit.approved)}
          canWrite={canWrite}
          done={
            transmission
              ? {
                  by:
                    members.find((m) => m.personId === transmission.actor)
                      ?.name ?? "—",
                  at: transmission.at,
                }
              : null
          }
        />
      )}
    </>
  );
}
