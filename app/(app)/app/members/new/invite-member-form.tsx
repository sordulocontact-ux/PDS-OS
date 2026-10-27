"use client";

import { IconCircleCheck } from "@/components/icons";
import Link from "next/link";
import { useActionState, useState } from "react";

import { ChoiceCards } from "@/components/ui/choice-cards";
import { Field } from "@/components/auth/field";
import { FieldError, FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { ORGANIZATION_ROLES, routes } from "@/lib/auth/redirects";
import { auth } from "@/lib/i18n/fr/auth";
import { inviteMember } from "@/lib/members/actions";
import { idleInviteState, type InviteState } from "@/lib/members/types";

import { CopyLinkButton } from "../copy-link-button";

const fr = { auth };

// Account created by the director: identity, address, password and position.
// On success the form gives way to the login details (or, when the address
// must be confirmed first, the sign-up link to share).
export function InviteMemberForm() {
  const [state, action] = useActionState(inviteMember, idleInviteState);
  // "Create another account" dismisses this success and shows an empty form.
  const [dismissed, setDismissed] = useState<InviteState | null>(null);
  const t = fr.auth.newMember;

  if (state.status === "success" && state !== dismissed) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <IconCircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="flex flex-col gap-1" role="status">
            <p className="font-medium">{t.successTitle(state.firstName)}</p>
            <p className="text-sm text-muted-foreground">
              {state.ready
                ? t.readyBody(state.email)
                : t.confirmBody(state.email)}
            </p>
          </div>
        </div>

        {!state.ready && (
          <div className="grid gap-2">
            <label htmlFor="signup-link" className="text-sm font-medium">
              {t.linkLabel}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="signup-link"
                readOnly
                value={state.link}
                onFocus={(event) => event.currentTarget.select()}
                className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-muted/40 px-2.5 font-mono text-base text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-sm"
              />
              <CopyLinkButton url={state.link} label={t.copy} />
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => setDismissed(state)}
          >
            {t.another}
          </Button>
          <Link
            href={`${routes.members}?status=${state.ready ? "approved" : "invited"}`}
            className={buttonVariants({ size: "lg" })}
          >
            {t.toTeam}
          </Link>
        </div>
      </div>
    );
  }

  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const roleChoices = ORGANIZATION_ROLES.map((role) => ({
    value: role,
    label: fr.auth.members.roles[role],
    hint: t.roleHint[role],
  }));
  const defaultRole = ORGANIZATION_ROLES.find((r) => r === values.role);

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="firstName"
          label={fr.auth.fields.firstName}
          autoComplete="off"
          required
          autoFocus
          defaultValue={values.firstName ?? ""}
          error={errors.firstName}
        />
        <Field
          name="lastName"
          label={fr.auth.fields.lastName}
          autoComplete="off"
          defaultValue={values.lastName ?? ""}
          error={errors.lastName}
        />
      </div>
      <Field
        name="email"
        type="email"
        label={fr.auth.fields.email}
        autoComplete="off"
        inputMode="email"
        required
        defaultValue={values.email ?? ""}
        error={errors.email}
      />
      <Field
        name="password"
        type="password"
        label={fr.auth.fields.password}
        autoComplete="new-password"
        required
        minLength={10}
        hint={t.passwordHint}
        error={errors.password}
      />

      <div className="grid gap-1.5">
        <ChoiceCards
          key={defaultRole ?? ""}
          name="role"
          legend={t.role}
          required
          choices={roleChoices}
          defaultValue={defaultRole}
        />
        <FieldError id="role-error">{errors.role}</FieldError>
      </div>

      {state.status === "error" && state.error && (
        <FormMessage kind="error">{state.error}</FormMessage>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link
          href={routes.members}
          className={buttonVariants({ variant: "ghost", size: "lg" })}
        >
          {t.cancel}
        </Link>
        <SubmitButton pendingLabel={t.submitting}>{t.submit}</SubmitButton>
      </div>
    </form>
  );
}
