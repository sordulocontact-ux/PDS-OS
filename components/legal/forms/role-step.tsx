"use client";

import { Field } from "@/components/auth/field";
import { Button } from "@/components/ui/button";
import { legalForms } from "@/lib/i18n/fr/legal-forms";
import { FORM_ROLES, type FormRole } from "@/lib/legal/forms/definition";
import { Checkbox } from "@/components/ui/checkbox";

const fr = { legalForms };

/** The fiche's first question (Juridique 02): « Quel est votre rôle sur ce
 * projet ? », several choices, « Autre » with its words. */
export function RoleStep({
  roles,
  otherRole,
  onToggle,
  onOtherRole,
  onNext,
}: {
  roles: FormRole[];
  otherRole: string;
  onToggle: (role: FormRole) => void;
  onOtherRole: (value: string) => void;
  onNext: () => void;
}) {
  const t = fr.legalForms;
  return (
    <fieldset className="flex flex-col gap-4 rounded-2xl border bg-background p-6">
      <legend className="sr-only">{t.public.rolesTitle}</legend>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t.public.rolesTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.public.rolesHint}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {FORM_ROLES.map((role) => (
          <label
            key={role}
            className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 has-checked:border-selection has-checked:bg-selection-bg"
          >
            <Checkbox
              className="shrink-0"
              checked={roles.includes(role)}
              onChange={() => onToggle(role)}
            />
            <span className="font-medium">{t.roles[role]}</span>
          </label>
        ))}
      </div>
      {roles.includes("other") && (
        <Field
          name="other_role"
          label={t.public.otherRole}
          aria-required
          maxLength={200}
          value={otherRole}
          onChange={(event) => onOtherRole(event.target.value)}
        />
      )}
      <Button
        type="button"
        size="lg"
        className="self-end"
        disabled={
          roles.length === 0 || (roles.includes("other") && !otherRole.trim())
        }
        onClick={onNext}
      >
        {t.public.next}
      </Button>
    </fieldset>
  );
}
