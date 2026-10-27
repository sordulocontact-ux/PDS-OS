"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { productionLocations } from "@/lib/i18n/fr/production-locations";
import { productionPreprod } from "@/lib/i18n/fr/production-preprod";
import { decideLocation } from "@/lib/production/locations/actions";
import type { LocationOption } from "@/lib/production/locations/types";

import { LocationMediaForm } from "./location-media-form";
import { LocationOptionForm } from "./location-option-form";

const fr = { productionPreprod, productionLocations };

const t = fr.productionLocations;

/**
 * The owner's actions on a candidate (PROD-011, PROD-013): modify it, add
 * a media, keep it (verified first; a former choice reopens what depends on
 * the place, said before), discard it with a reason, or put it back.
 */
export function LocationActions({
  scope,
  option,
  hasChoice,
}: {
  scope: { projectId: string; sheetId: string; organizationId: string };
  option: LocationOption;
  // Another place is already kept.
  hasChoice: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const restore = () =>
    startTransition(async () => {
      const result = await decideLocation({
        projectId: scope.projectId,
        optionId: option.id,
        decision: "restore",
        reason: "",
      });
      if (result.ok) toast.success(t.decide.restored);
      else toast.error(result.error);
    });
  return (
    <div className="flex flex-wrap gap-2">
      {option.status === "candidate" && (
        <DialogButton
          label={t.decide.choose}
          variant="default"
          title={t.decide.chooseTitle(option.name)}
          description={t.decide.chooseDescription}
        >
          {(close) => (
            <DecideForm
              projectId={scope.projectId}
              option={option}
              decision="choose"
              impact={hasChoice}
              onDone={close}
            />
          )}
        </DialogButton>
      )}
      <DialogButton
        label={t.media.add}
        variant="outline"
        title={t.media.addTitle}
        description={t.media.description}
      >
        {(close) => (
          <LocationMediaForm
            scope={scope}
            optionId={option.id}
            onDone={close}
          />
        )}
      </DialogButton>
      <DialogButton
        label={fr.productionPreprod.edit}
        variant="ghost"
        title={t.editTitle(option.name)}
        description={t.formDescription}
      >
        {(close) => (
          <LocationOptionForm
            projectId={scope.projectId}
            sheetId={scope.sheetId}
            option={option}
            onDone={close}
          />
        )}
      </DialogButton>
      {option.status === "candidate" && (
        <DialogButton
          label={t.decide.discard}
          variant="ghost"
          title={t.decide.discardTitle(option.name)}
          description={t.decide.discardDescription}
        >
          {(close) => (
            <DecideForm
              projectId={scope.projectId}
              option={option}
              decision="discard"
              impact={false}
              onDone={close}
            />
          )}
        </DialogButton>
      )}
      {option.status === "discarded" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={restore}>
          {t.decide.restore}
        </Button>
      )}
    </div>
  );
}

function DecideForm({
  projectId,
  option,
  decision,
  impact,
  onDone,
}: {
  projectId: string;
  option: LocationOption;
  decision: "choose" | "discard";
  impact: boolean;
  onDone: () => void;
}) {
  const [missing, setMissing] = useState(false);
  const { pending, error, setError, run } = useWriteSubmit(
    onDone,
    decision === "choose" ? t.decide.chosen : t.decide.discarded,
  );
  const unverified =
    decision === "choose" && option.verification !== "verified";
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const reason = String(
          new FormData(event.currentTarget).get("reason") ?? "",
        ).trim();
        const lack = decision === "discard" && !reason;
        setMissing(lack);
        if (lack) return;
        // PROD-013: never kept before it is verified — said in red, here.
        if (unverified) return setError(t.errors.location_not_verified);
        run(() =>
          decideLocation({ projectId, optionId: option.id, decision, reason }),
        );
      }}
    >
      {unverified && (
        <ToneCallout tone="warning">{t.decide.notVerified}</ToneCallout>
      )}
      {impact && (
        <ToneCallout tone="warning">{t.decide.chooseImpact}</ToneCallout>
      )}
      <TextareaField
        id={`decide-${option.id}`}
        name="reason"
        label={decision === "choose" ? t.decide.reason : t.decide.discardReason}
        required={decision === "discard"}
        rows={2}
        maxLength={1000}
        error={missing ? t.decide.discardMissing : undefined}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={decision === "choose" ? t.decide.choose : t.decide.discard}
        onCancel={onDone}
      />
    </form>
  );
}
