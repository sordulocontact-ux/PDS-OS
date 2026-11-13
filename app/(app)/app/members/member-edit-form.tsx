"use client";

import { useActionState, useEffect } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { aiUsage } from "@/lib/i18n/fr/ai-usage";
import { auth } from "@/lib/i18n/fr/auth";
import { googleConnections } from "@/lib/i18n/fr/google-connections";
import { memberAction } from "@/lib/members/actions";
import {
  idleMemberActionState,
  retainedMemberValue,
  type MembershipRow,
} from "@/lib/members/types";

const fr = { aiUsage, auth, googleConnections };

// Body of the "Modifier" modal of a team row: name, the position when it
// can change here (invitation or active access, never one's own), the
// daily requests to PO, and the work address read by Paramètres › Connexions.
export function MemberEditForm({
  membership,
  isSelf,
  onDone,
}: {
  membership: MembershipRow;
  isSelf: boolean;
  onDone: (saved: boolean) => void;
}) {
  const [state, action] = useActionState(memberAction, idleMemberActionState);
  const { id, status, role, person, ai, googleWorkEmail } = membership;
  const t = fr.auth.members;
  const c = fr.auth.common;
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;
  const roleEditable =
    (status === "invited" || status === "approved") && !isSelf;
  const roleLocked = isSelf
    ? t.edit.roleLocked.self
    : status === "suspended"
      ? t.edit.roleLocked.suspended
      : t.edit.roleLocked.undecided;

  useEffect(() => {
    if (state.status === "success") onDone(true);
    // onDone changes identity on every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="intent" value="edit" />
      <input type="hidden" name="personId" value={person.id} />
      <input type="hidden" name="membershipId" value={id} />
      <Field
        name="firstName"
        id={`firstName-${id}`}
        label={fr.auth.fields.firstName}
        autoComplete="off"
        defaultValue={retainedMemberValue(state, "firstName", person.firstName)}
        required
        error={fieldErrors?.firstName}
      />
      <Field
        name="lastName"
        id={`lastName-${id}`}
        label={fr.auth.fields.lastName}
        autoComplete="off"
        defaultValue={retainedMemberValue(
          state,
          "lastName",
          person.lastName ?? "",
        )}
        error={fieldErrors?.lastName}
      />
      {roleEditable ? (
        <OptionSelect
          id={`role-${id}`}
          name="role"
          label={t.columns.role}
          required
          items={t.roles}
          placeholder={t.actions.rolePlaceholder}
          defaultValue={retainedMemberValue(state, "role", role ?? "") || null}
          error={fieldErrors?.role}
        />
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t.columns.role}</span>
          <p className="text-sm">{role ? t.roles[role] : t.noRole}</p>
          <p className="text-xs text-muted-foreground">{roleLocked}</p>
        </div>
      )}
      <Field
        name="aiDailyLimit"
        id={`aiDailyLimit-${id}`}
        label={fr.aiUsage.team.field}
        type="number"
        inputMode="numeric"
        min={0}
        max={10000}
        step={1}
        autoComplete="off"
        defaultValue={retainedMemberValue(
          state,
          "aiDailyLimit",
          String(ai.limit),
        )}
        required
        hint={fr.aiUsage.team.hint(ai.used)}
        error={fieldErrors?.aiDailyLimit}
      />
      <Field
        name="googleWorkEmail"
        id={`googleWorkEmail-${id}`}
        label={fr.googleConnections.workField.label}
        type="email"
        autoComplete="off"
        defaultValue={retainedMemberValue(
          state,
          "googleWorkEmail",
          googleWorkEmail ?? "",
        )}
        hint={fr.googleConnections.workField.hint}
        error={fieldErrors?.googleWorkEmail}
      />
      {state.status === "error" && !state.fieldErrors && (
        <FormMessage kind="error">{state.error}</FormMessage>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => onDone(false)}
        >
          {c.cancel}
        </Button>
        <SubmitButton pendingLabel={c.saving}>{c.save}</SubmitButton>
      </div>
    </form>
  );
}
