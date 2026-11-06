// Checks a fiche's answers against the versioned definition before they
// reach the database: only the fields of the chosen roles, trimmed and
// bounded, required ones present, emails well formed, choices among the
// options. Splits them into the person's and the contribution's. Pure.

import { ficheNeeded } from "@/lib/legal/forms/completeness";
import { z } from "zod";

import {
  FORM_ROLES,
  MAX_ANSWER,
  fieldsFor,
  type FormRole,
} from "@/lib/legal/forms/definition";

export const submissionSchema = z.object({
  roles: z.array(z.enum(FORM_ROLES)).min(1).max(FORM_ROLES.length),
  otherRole: z.string().trim().max(200).nullable(),
  answers: z.record(z.string(), z.string().max(MAX_ANSWER)),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;

export type CheckedSubmission =
  | {
      ok: true;
      roles: FormRole[];
      otherRole: string | null;
      person: Record<string, string>;
      contribution: Record<string, string>;
    }
  | { ok: false; missing: string[]; invalid: string[] };

const email = z.email();

export function checkSubmission(input: SubmissionInput): CheckedSubmission {
  const fields = fieldsFor(input.roles);
  // What the contract needs is required too (the same list as the team's).
  const needed = new Set(ficheNeeded(input.roles, input.answers));
  const missing: string[] = [];
  const invalid: string[] = [];
  const person: Record<string, string> = {};
  const contribution: Record<string, string> = {};

  for (const field of fields) {
    const value = (input.answers[field.id] ?? "").trim();
    if (!value) {
      if (field.required || needed.has(field.id)) missing.push(field.id);
      continue;
    }
    if (field.type === "email" && !email.safeParse(value).success)
      invalid.push(field.id);
    else if (field.options && !field.options.includes(value))
      invalid.push(field.id);
    else (field.target === "person" ? person : contribution)[field.id] = value;
  }
  // « Autre » needs its words.
  if (input.roles.includes("other") && !input.otherRole?.trim())
    missing.push("other_role");

  if (missing.length > 0 || invalid.length > 0)
    return { ok: false, missing, invalid };
  return {
    ok: true,
    roles: input.roles,
    otherRole: input.roles.includes("other")
      ? (input.otherRole?.trim() ?? null)
      : null,
    person,
    contribution,
  };
}
