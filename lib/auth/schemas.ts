import { z } from "zod";
import { fr } from "@/lib/i18n/fr";
import type { FieldErrors, FormValues } from "@/lib/auth/form-state";
import { ORGANIZATION_ROLES } from "@/lib/auth/redirects";

// Form validation. The database enforces its own rules (email
// normalisation, mandatory reason…); they are anticipated here to show a
// clear message before sending.

// Trimmed, lowercased. Nothing else: dots and "+" suffixes are kept, as in
// the database.
export const emailSchema = z
  .string({ error: fr.auth.errors.required })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: fr.auth.errors.invalidEmail }));

export const passwordSchema = z
  .string({ error: fr.auth.errors.required })
  .min(10, { error: fr.auth.errors.weakPassword })
  .max(200, { error: fr.auth.errors.tooLong });

const requiredNameSchema = z
  .string({ error: fr.auth.errors.required })
  .trim()
  .min(1, { error: fr.auth.errors.required })
  .max(80, { error: fr.auth.errors.tooLong });

const optionalNameSchema = z
  .string()
  .trim()
  .max(80, { error: fr.auth.errors.tooLong })
  .transform((value) => (value === "" ? null : value));

export const signUpSchema = z.object({
  firstName: requiredNameSchema,
  lastName: optionalNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: fr.auth.errors.required })
    .min(1, { error: fr.auth.errors.required }),
});

export const emailOnlySchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    passwordConfirm: z.string({ error: fr.auth.errors.required }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    error: fr.auth.errors.passwordMismatch,
    path: ["passwordConfirm"],
  });

export const membershipIdSchema = z.object({
  membershipId: z.uuid(),
});

export const membershipDecisionSchema = z.object({
  membershipId: z.uuid(),
  note: z
    .string({ error: fr.auth.errors.required })
    .trim()
    .min(1, { error: fr.auth.errors.required })
    .max(500, { error: fr.auth.errors.tooLong }),
});

export const membershipRoleSchema = z.object({
  membershipId: z.uuid(),
  role: z.enum(ORGANIZATION_ROLES, { error: fr.auth.errors.invalidRole }),
});

export const inviteMemberSchema = z.object({
  firstName: requiredNameSchema,
  lastName: optionalNameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(ORGANIZATION_ROLES, { error: fr.auth.errors.required }),
});

export const personNameSchema = z.object({
  personId: z.uuid(),
  firstName: requiredNameSchema,
  lastName: optionalNameSchema,
});

// Fields never sent back to the screen after an error.
const SENSITIVE_FIELDS = new Set(["password", "passwordConfirm"]);

// What the person typed, shown again so nothing has to be retyped.
// Passwords are excluded on principle.
export function retainedValues(formData: FormData): FormValues {
  const values: FormValues = {};
  for (const [field, value] of formData.entries()) {
    if (SENSITIVE_FIELDS.has(field)) continue;
    if (typeof value !== "string") continue;
    values[field] = value;
  }
  return values;
}

type ParseResult<T> =
  | { ok: true; data: z.output<T extends z.ZodType ? T : never> }
  | {
      ok: false;
      fieldErrors: FieldErrors;
      formError?: string;
      values: FormValues;
    };

export function parseForm<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): ParseResult<T> {
  const result = schema.safeParse(Object.fromEntries(formData));
  if (result.success) {
    return { ok: true, data: result.data };
  }

  const flat = z.flattenError(result.error);
  const fieldErrors: FieldErrors = {};
  for (const [field, messages] of Object.entries(flat.fieldErrors)) {
    fieldErrors[field] = (messages as string[] | undefined)?.[0];
  }
  return {
    ok: false,
    fieldErrors,
    formError: flat.formErrors[0],
    values: retainedValues(formData),
  };
}
