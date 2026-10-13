"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { useDesignAction } from "@/components/design/work/use-design-action";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { formatDay } from "@/lib/assistant/facts";
import {
  delegateDesignRole,
  revokeDesignDelegation,
} from "@/lib/design/actions/roles";
import type { DesignDelegation } from "@/lib/design/delegations";
import { fr } from "@/lib/i18n/fr";

type Person = { personId: string; name: string };

/**
 * The delegations of one scope (MKT-C2-08): who holds whose role, why and
 * until when; « Déléguer » and « Révoquer » for the project's owner. Only a
 * role someone holds can be delegated (the database checks it too).
 */
export function DelegationsPanel({
  projectId,
  scope,
  sheetId,
  delegations,
  responsible,
  validators,
  members,
  canManage,
  today,
}: {
  projectId: string;
  scope: "direction" | "sheet";
  sheetId: string | null;
  delegations: DesignDelegation[];
  responsible: Person | null;
  validators: Person[];
  members: Person[];
  canManage: boolean;
  today: string;
}) {
  const t = fr.conceptionRoles.delegations;
  const { pending, run } = useDesignAction();
  const state = (d: DesignDelegation) =>
    d.revoked
      ? "revoked"
      : d.active
        ? "active"
        : d.startsOn > today
          ? "upcoming"
          : "ended";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-body-md font-semibold">{t.title}</h3>
          <p className="text-caption text-muted-foreground">{t.hint}</p>
        </div>
        {canManage && (
          <DialogButton
            label={t.add}
            title={t.addTitle}
            description={t.addBody}
          >
            {(close) => (
              <DelegateForm
                projectId={projectId}
                scope={scope}
                sheetId={sheetId}
                responsible={responsible}
                validators={validators}
                members={members}
                today={today}
                onDone={close}
              />
            )}
          </DialogButton>
        )}
      </div>
      {delegations.length === 0 ? (
        <p className="text-caption text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {delegations.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2"
            >
              <StatusBadge
                tone={state(d) === "active" ? "info" : "neutral"}
                size="sm"
              >
                {t.states[state(d)]}
              </StatusBadge>
              <span className="min-w-0 flex-1 text-caption break-words">
                {t.line(
                  t.roles[d.role],
                  d.fromName,
                  d.toName,
                  formatDay(d.startsOn),
                  formatDay(d.endsOn),
                )}
                <span className="block text-muted-foreground">{d.reason}</span>
              </span>
              {canManage && !d.revoked && state(d) !== "ended" && (
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    run(() => revokeDesignDelegation(projectId, d.id), {
                      success: t.revoked,
                    })
                  }
                >
                  {t.revoke}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DelegateForm({
  projectId,
  scope,
  sheetId,
  responsible,
  validators,
  members,
  today,
  onDone,
}: {
  projectId: string;
  scope: "direction" | "sheet";
  sheetId: string | null;
  responsible: Person | null;
  validators: Person[];
  members: Person[];
  today: string;
  onDone: () => void;
}) {
  const t = fr.conceptionRoles.delegations;
  const [role, setRole] = useState<"responsible" | "validator">(
    responsible ? "responsible" : "validator",
  );
  const [missing, setMissing] = useState<string[]>([]);
  const { pending, error, run } = useWriteSubmit(onDone, t.done);
  const holders =
    role === "responsible" ? (responsible ? [responsible] : []) : validators;
  if (!responsible && validators.length === 0)
    return <p className="text-body-md text-muted-foreground">{t.nobody}</p>;
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const get = (k: string) => String(form.get(k) ?? "").trim();
        const values = {
          fromId: get("fromId"),
          toId: get("toId"),
          reason: get("reason"),
          startsOn: get("startsOn"),
          endsOn: get("endsOn"),
        };
        const empty = Object.entries(values)
          .filter(([, v]) => !v)
          .map(([k]) => k);
        if (values.startsOn && values.endsOn && values.endsOn < values.startsOn)
          empty.push("order");
        setMissing(empty);
        if (empty.length) return;
        run(() =>
          delegateDesignRole({ projectId, scope, sheetId, role, ...values }),
        );
      }}
    >
      <OptionSelect
        id="delegation-role"
        name="role"
        label={t.role}
        required
        items={{
          ...(responsible ? { responsible: t.roles.responsible } : {}),
          ...(validators.length ? { validator: t.roles.validator } : {}),
        }}
        defaultValue={role}
        onValueChange={(v) =>
          setRole(v === "validator" ? "validator" : "responsible")
        }
      />
      <OptionSelect
        key={role}
        id="delegation-from"
        name="fromId"
        label={t.from}
        required
        items={Object.fromEntries(holders.map((h) => [h.personId, h.name]))}
        defaultValue={holders.length === 1 ? holders[0].personId : null}
        error={missing.includes("fromId") ? t.required : undefined}
      />
      <OptionSelect
        id="delegation-to"
        name="toId"
        label={t.to}
        required
        items={Object.fromEntries(members.map((m) => [m.personId, m.name]))}
        error={missing.includes("toId") ? t.required : undefined}
      />
      <TextareaField
        id="delegation-reason"
        name="reason"
        label={t.reason}
        required
        rows={2}
        maxLength={1000}
        error={missing.includes("reason") ? t.required : undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="delegation-starts"
          name="startsOn"
          type="date"
          label={t.startsOn}
          required
          defaultValue={today}
          error={missing.includes("startsOn") ? t.required : undefined}
        />
        <Field
          id="delegation-ends"
          name="endsOn"
          type="date"
          label={t.endsOn}
          required
          min={today}
          error={
            missing.includes("endsOn")
              ? t.required
              : missing.includes("order")
                ? t.datesOrder
                : undefined
          }
        />
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}
