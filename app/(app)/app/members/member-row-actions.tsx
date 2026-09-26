"use client";

import { useActionState, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { memberAction } from "@/lib/members/actions";
import {
  idleMemberActionState,
  retainedMemberValue,
  type MemberActionState,
  type MembershipRow,
} from "@/lib/members/types";

import { CopyLinkButton } from "./copy-link-button";

type Mode = "idle" | "approve" | "reject" | "suspend" | "rename" | "role";

// Actions of one team row. One server action, an "intent" field per form.
// Reason and name forms open inline, without a modal.
export function MemberRowActions({
  membership,
  isSelf,
  signupLink,
}: {
  membership: MembershipRow;
  isSelf: boolean;
  // Invitations only: the link the person signs up with.
  signupLink: string | null;
}) {
  const [state, action, pending] = useActionState(
    memberAction,
    idleMemberActionState,
  );
  // The inline form stays open until an action succeeds. Derived during
  // render (no effect): a success returned after the form was opened closes
  // it; reopening records the current state as the new starting point.
  const [opened, setOpened] = useState<{
    mode: Mode;
    at: MemberActionState;
  }>({ mode: "idle", at: idleMemberActionState });
  const mode: Mode =
    state.status === "success" && state !== opened.at ? "idle" : opened.mode;
  const setMode = (next: Mode) => setOpened({ mode: next, at: state });

  const { id, status, role, person } = membership;
  const t = fr.auth.members;
  const a = t.actions;
  const c = fr.auth.common;
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  const hidden = (intent: string) => (
    <>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="membershipId" value={id} />
    </>
  );

  const quick = (intent: string, label: string, primary = false) => (
    <form action={action}>
      {hidden(intent)}
      <SubmitButton
        size="sm"
        variant={primary ? "default" : "outline"}
        pendingLabel={c.loading}
      >
        {label}
      </SubmitButton>
    </form>
  );

  return (
    <div className="flex flex-col items-end gap-2">
      {mode === "idle" && (
        <div className="flex flex-wrap justify-end gap-1.5">
          {status === "invited" && signupLink && (
            <CopyLinkButton url={signupLink} label={a.copyLink} size="sm" />
          )}
          {status === "invited" && quick("cancel_invite", a.cancelInvite)}
          {(status === "pending" || status === "rejected") && (
            <Button type="button" size="sm" onClick={() => setMode("approve")}>
              {a.approve}
            </Button>
          )}
          {status === "pending" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setMode("reject")}
            >
              {a.reject}
            </Button>
          )}
          {status === "suspended" && quick("reactivate", a.reactivate, true)}
          {status === "approved" && !isSelf && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setMode("suspend")}
            >
              {a.suspend}
            </Button>
          )}
          {(status === "invited" || status === "approved") && !isSelf && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setMode("role")}
            >
              {a.editRole}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setMode("rename")}
          >
            {a.editName}
          </Button>
        </div>
      )}

      {(mode === "reject" || mode === "suspend") && (
        <form
          action={action}
          noValidate
          className="flex w-full max-w-xs flex-col gap-2 text-left"
        >
          {hidden(mode)}
          <Field
            name="note"
            id={`note-${id}`}
            label={t.reasonLabel}
            placeholder={t.reasonPlaceholder}
            required
            autoFocus
            defaultValue={retainedMemberValue(state, "note", "")}
            error={fieldErrors?.note}
          />
          <div className="flex justify-end gap-1.5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMode("idle")}
              disabled={pending}
            >
              {c.cancel}
            </Button>
            <SubmitButton size="default" pendingLabel={c.loading}>
              {mode === "reject" ? a.reject : a.suspend}
            </SubmitButton>
          </div>
        </form>
      )}

      {(mode === "role" || mode === "approve") && (
        <form
          action={action}
          noValidate
          className="flex w-full max-w-xs flex-col gap-2 text-left"
        >
          {hidden(mode === "approve" ? "approve" : "set_role")}
          <OptionSelect
            id={`role-${id}`}
            name="role"
            label={t.columns.role}
            items={t.roles}
            placeholder={a.rolePlaceholder}
            defaultValue={
              retainedMemberValue(state, "role", role ?? "") || null
            }
            error={fieldErrors?.role}
          />
          <div className="flex justify-end gap-1.5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMode("idle")}
              disabled={pending}
            >
              {c.cancel}
            </Button>
            <SubmitButton size="default" pendingLabel={c.saving}>
              {mode === "approve" ? a.approve : c.save}
            </SubmitButton>
          </div>
        </form>
      )}

      {mode === "rename" && (
        <form
          action={action}
          noValidate
          className="flex w-full max-w-xs flex-col gap-2 text-left"
        >
          <input type="hidden" name="intent" value="rename" />
          <input type="hidden" name="personId" value={person.id} />
          <Field
            name="firstName"
            id={`firstName-${id}`}
            label={fr.auth.fields.firstName}
            defaultValue={retainedMemberValue(
              state,
              "firstName",
              person.firstName,
            )}
            required
            autoFocus
            error={fieldErrors?.firstName}
          />
          <Field
            name="lastName"
            id={`lastName-${id}`}
            label={fr.auth.fields.lastName}
            defaultValue={retainedMemberValue(
              state,
              "lastName",
              person.lastName ?? "",
            )}
            error={fieldErrors?.lastName}
          />
          <div className="flex justify-end gap-1.5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMode("idle")}
              disabled={pending}
            >
              {c.cancel}
            </Button>
            <SubmitButton size="default" pendingLabel={c.saving}>
              {c.save}
            </SubmitButton>
          </div>
        </form>
      )}

      {state.status === "error" && !state.fieldErrors && (
        <FormMessage kind="error">{state.error}</FormMessage>
      )}
    </div>
  );
}
