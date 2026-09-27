"use client";

import { IconLock, IconPenWriting2, IconXmark } from "nucleo-sharp-essential";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { fr } from "@/lib/i18n/fr";
import { memberAction } from "@/lib/members/actions";
import {
  idleMemberActionState,
  retainedMemberValue,
  type MemberActionState,
  type MembershipRow,
} from "@/lib/members/types";

import { CopyLinkButton } from "./copy-link-button";
import { MemberEditForm } from "./member-edit-form";

type Mode = "idle" | "approve" | "reject" | "suspend";

// Actions of one team row. One server action, an "intent" field per form.
// The decision waiting on the row stays a visible button (approve,
// reactivate, copy the link); editing and removing sit in the "⋯" menu, as
// on the other lists. "Modifier" (name, position) opens the modal; a reason
// or a position to approve with opens inline.
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

  const [, startTransition] = useTransition();
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

  // A menu item has no form around it: the same action, called directly.
  const submit = (intent: string) => {
    const data = new FormData();
    data.set("intent", intent);
    data.set("membershipId", id);
    startTransition(() => action(data));
  };

  const [editing, setEditing] = useState(false);
  const menu: RowAction[] = [
    {
      key: "edit",
      label: fr.records.menu.edit,
      icon: IconPenWriting2,
      onSelect: () => setEditing(true),
    },
  ];
  if (status === "pending") {
    menu.push({
      key: "reject",
      label: a.reject,
      icon: IconXmark,
      onSelect: () => setMode("reject"),
    });
  }
  if (status === "invited") {
    menu.push({
      key: "cancel",
      label: a.cancelInvite,
      icon: IconXmark,
      onSelect: () => submit("cancel_invite"),
    });
  }
  if (status === "approved" && !isSelf) {
    menu.push({
      key: "suspend",
      label: a.suspend,
      icon: IconLock,
      onSelect: () => setMode("suspend"),
    });
  }
  const fullName = [person.firstName, person.lastName]
    .filter(Boolean)
    .join(" ");

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
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {status === "invited" && signupLink && (
            <CopyLinkButton url={signupLink} label={a.copyLink} size="sm" />
          )}
          {(status === "pending" || status === "rejected") && (
            <Button type="button" size="sm" onClick={() => setMode("approve")}>
              {a.approve}
            </Button>
          )}
          {status === "suspended" && quick("reactivate", a.reactivate, true)}
          <RowActions label={fr.records.menu.label(fullName)} actions={menu} />
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

      {mode === "approve" && (
        <form
          action={action}
          noValidate
          className="flex w-full max-w-xs flex-col gap-2 text-left"
        >
          {hidden("approve")}
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
              {a.approve}
            </SubmitButton>
          </div>
        </form>
      )}

      {state.status === "error" && !state.fieldErrors && (
        <FormMessage kind="error">{state.error}</FormMessage>
      )}

      <FormDialog
        open={editing}
        onOpenChange={setEditing}
        title={t.edit.title}
        description={t.edit.description}
        closeLabel={fr.records.edit.close}
      >
        <MemberEditForm
          membership={membership}
          isSelf={isSelf}
          onDone={(saved) => {
            setEditing(false);
            if (saved) toast.success(t.edit.saved);
          }}
        />
      </FormDialog>
    </div>
  );
}
