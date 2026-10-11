"use client";

import { DialogButton } from "@/components/ui/dialog-button";
import type { InfluenceData } from "@/lib/activations/influence/queries";
import { decideRights } from "@/lib/activations/influence/rights-actions";
import { fr } from "@/lib/i18n/fr";

import { ReasonForm } from "@/components/ui/reason-form";
import { RightsForm } from "./rights-form";

const t = fr.activationInfluence.rights;

/** The acts on one rights block, by its status. */
export function RightsButtons({
  projectId,
  activationId,
  targetId,
  kind,
  current,
}: {
  projectId: string;
  activationId: string;
  targetId: string;
  kind: "organic" | "ads";
  current: InfluenceData["rights"][number] | null;
}) {
  const proposed = current?.status === "proposed";
  const decide = (
    decision: "accepted" | "refused" | "revoked",
    label: string,
  ) => (
    <DialogButton
      label={label}
      size="xs"
      variant={decision === "accepted" ? "default" : "ghost"}
      title={t.kinds[kind]}
      description={t.formDescription}
    >
      {(close) => (
        <ReasonForm
          label={t.decisionNote}
          required={decision !== "accepted"}
          submitLabel={label}
          doneMessage={t.decided}
          run={(note) =>
            decideRights({
              projectId,
              rightsId: current?.id ?? "",
              decision,
              note,
            })
          }
          onDone={close}
        />
      )}
    </DialogButton>
  );
  return (
    <div className="flex flex-wrap gap-2">
      <DialogButton
        label={!current ? t.define : proposed ? t.edit : t.newVersion}
        size="xs"
        title={t.kinds[kind]}
        description={t.formDescription}
        wide
      >
        {(close) => (
          <RightsForm
            projectId={projectId}
            activationId={activationId}
            targetId={targetId}
            kind={kind}
            current={current}
            editing={proposed}
            onDone={close}
          />
        )}
      </DialogButton>
      {proposed && decide("accepted", t.accept)}
      {proposed && decide("refused", t.refuse)}
      {current?.status === "accepted" && decide("revoked", t.revoke)}
    </div>
  );
}
