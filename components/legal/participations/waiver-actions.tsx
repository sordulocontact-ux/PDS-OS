"use client";

import { IconShieldCheck, IconXmark } from "nucleo-sharp-essential";
import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FactList } from "@/components/ui/fact-list";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { participationWaivers } from "@/lib/i18n/fr/participation-waivers";
import {
  grantParticipationWaiver,
  revokeParticipationWaiver,
} from "@/lib/legal/waiver-actions";
import {
  WAIVER_SCOPES,
  type ParticipationWaiver,
  type WaiverScope,
} from "@/lib/projects/title-board-rules";
import { formatShortDate } from "@/lib/release/format";

const fr = { dialogs, participationWaivers };
const t = fr.participationWaivers;

type Open =
  { kind: "grant" } | { kind: "revoke"; waiver: ParticipationWaiver } | null;

/**
 * The direction's gestures on a participation whose contract is not
 * signed (lot 12): « Accorder une dérogation » for a scope not covered yet,
 * « Révoquer la dérogation de … » for each open one. Nothing for anyone
 * else (the database checks « validate » again).
 */
export function WaiverActions({
  projectId,
  participationId,
  artist,
  title,
  open: openWaivers,
  grantable,
}: {
  projectId: string;
  participationId: string;
  artist: string;
  // The title's name in the project.
  title: string;
  // Its open waivers (revocable).
  open: ParticipationWaiver[];
  // The scopes still to cover (none: « Accorder » is not offered).
  grantable: WaiverScope[];
}) {
  const [dialog, setDialog] = useState<Open>(null);
  const actions: RowAction[] = [
    ...(grantable.length > 0
      ? [
          {
            key: "grant",
            label: t.actions.grant,
            icon: IconShieldCheck,
            onSelect: () => setDialog({ kind: "grant" }),
          },
        ]
      : []),
    ...openWaivers.map((waiver) => ({
      key: `revoke-${waiver.id}`,
      label: t.actions.revoke(t.scopeOf[waiver.scope]),
      icon: IconXmark,
      onSelect: () => setDialog({ kind: "revoke" as const, waiver }),
    })),
  ];
  const close = (next: boolean) => {
    if (!next) setDialog(null);
  };
  return (
    <>
      <RowActions label={t.actions.label(artist)} actions={actions} />
      <FormDialog
        open={dialog?.kind === "grant"}
        onOpenChange={close}
        title={t.grant.title(artist, title)}
        description={t.grant.description}
        closeLabel={fr.dialogs.close}
      >
        {dialog?.kind === "grant" && (
          <GrantForm
            projectId={projectId}
            participationId={participationId}
            grantable={grantable}
            onDone={() => setDialog(null)}
          />
        )}
      </FormDialog>
      <FormDialog
        open={dialog?.kind === "revoke"}
        onOpenChange={close}
        title={
          dialog?.kind === "revoke"
            ? t.revoke.title(t.scopeOf[dialog.waiver.scope], artist)
            : ""
        }
        description={t.revoke.description}
        closeLabel={fr.dialogs.close}
      >
        {dialog?.kind === "revoke" && (
          <RevokeForm
            projectId={projectId}
            waiver={dialog.waiver}
            onDone={() => setDialog(null)}
          />
        )}
      </FormDialog>
    </>
  );
}

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(
    new Date(),
  );
}

function GrantForm({
  projectId,
  participationId,
  grantable,
  onDone,
}: {
  projectId: string;
  participationId: string;
  grantable: WaiverScope[];
  onDone: () => void;
}) {
  const [scope, setScope] = useState<WaiverScope>(grantable[0] ?? "shoot");
  const [missing, setMissing] = useState<{ reason?: true; due?: true }>({});
  const { pending, error, run } = useWriteSubmit(onDone, t.grant.done);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const reason = String(data.get("reason") ?? "").trim();
        const risk = String(data.get("risk") ?? "").trim();
        const dueOn = String(data.get("dueOn") ?? "");
        const gaps = {
          ...(reason ? {} : { reason: true as const }),
          ...(dueOn ? {} : { due: true as const }),
        };
        setMissing(gaps);
        if (gaps.reason || gaps.due) return;
        run(() =>
          grantParticipationWaiver({
            projectId,
            participationId,
            scope,
            reason,
            risk,
            dueOn,
          }),
        );
      }}
    >
      <OptionSelect
        id={`waiver-scope-${participationId}`}
        name="scope"
        label={t.grant.scope}
        required
        items={Object.fromEntries(
          WAIVER_SCOPES.filter((s) => grantable.includes(s)).map((s) => [
            s,
            t.scopes[s],
          ]),
        )}
        defaultValue={scope}
        onValueChange={(next) =>
          setScope(next === "release" ? "release" : "shoot")
        }
      />
      <TextareaField
        id={`waiver-reason-${participationId}`}
        name="reason"
        label={t.grant.reason}
        placeholder={t.grant.reasonPlaceholder}
        aria-required
        maxLength={2000}
        rows={3}
        error={missing.reason ? t.errors.reasonRequired : undefined}
      />
      <TextareaField
        id={`waiver-risk-${participationId}`}
        name="risk"
        label={t.grant.risk}
        placeholder={t.grant.riskPlaceholder}
        maxLength={2000}
        rows={2}
      />
      <Field
        id={`waiver-due-${participationId}`}
        name="dueOn"
        type="date"
        label={t.grant.due}
        hint={t.grant.dueHint}
        aria-required
        min={todayIso()}
        error={missing.due ? t.errors.dueRequired : undefined}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.grant.submit}
        onCancel={onDone}
      />
    </form>
  );
}

function RevokeForm({
  projectId,
  waiver,
  onDone,
}: {
  projectId: string;
  waiver: ParticipationWaiver;
  onDone: () => void;
}) {
  const { pending, error, run } = useWriteSubmit(onDone, t.revoke.done);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const reason = String(
          new FormData(event.currentTarget).get("reason") ?? "",
        ).trim();
        run(() =>
          revokeParticipationWaiver({
            projectId,
            waiverId: waiver.id,
            reason,
          }),
        );
      }}
    >
      <FactList
        facts={[
          { label: t.revoke.reasonLabel, value: waiver.reason },
          { label: t.revoke.due, value: formatShortDate(waiver.dueOn) },
          {
            label: t.revoke.grantedLabel,
            value: t.revoke.granted(
              waiver.grantedBy ?? "—",
              formatShortDate(waiver.grantedAt),
            ),
          },
        ]}
      />
      <TextareaField
        id={`waiver-revoke-${waiver.id}`}
        name="reason"
        label={t.revoke.reason}
        maxLength={2000}
        rows={2}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.revoke.submit}
        onCancel={onDone}
      />
    </form>
  );
}
