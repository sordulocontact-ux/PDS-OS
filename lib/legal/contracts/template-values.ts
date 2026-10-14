"use server";

import { z } from "zod";

import { contractTemplateValuesInstructions } from "@/lib/ai/instructions/contract-template-values";
import { extract } from "@/lib/ai/llm";
import { aiQuotaMessage } from "@/lib/ai/quota";
import { templateValuesSchema } from "@/lib/ai/schemas/contract-template-values";
import { can } from "@/lib/auth/access";
import type { ContractType } from "@/lib/contracts/types";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import type { ContractFieldId } from "@/lib/legal/contracts/fields";
import { countExcerpt } from "@/lib/legal/contracts/template-text";
import { valuesByShape } from "@/lib/legal/contracts/value-patterns";
import type { FormRole } from "@/lib/legal/forms/definition";

// « Repérer les valeurs »: a contract already filled in for someone becomes
// a template. The code finds what has a shape (e-mail, phone, SIRET, IPI),
// PO points at names, address, titles and the fee; the code keeps an
// excerpt only when it is written as is in the text. Nothing is replaced
// here: the person replaces each value in the editor, or not. PO also
// describes the template (name, type, roles, usage), only to pre-fill the
// empty fields of the form.

export type TemplateAbout = {
  name: string;
  type: ContractType;
  roles: FormRole[];
  usage: string;
};

export type ValueSuggestion = {
  excerpt: string;
  field: ContractFieldId;
  count: number;
};

// The parties and the fee are written at the top of a contract.
const READ_LIMIT = 40_000;
const MAX_SUGGESTIONS = 40;

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const unescapeData = (text: string) =>
  text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

export async function suggestTemplateValues(body: string): Promise<
  | {
      ok: true;
      suggestions: ValueSuggestion[];
      about: TemplateAbout | null;
      partial: boolean;
      /** The day's limit of requests to PO is reached: the sentence to show. */
      quota: string | null;
    }
  | { ok: false; error: string }
> {
  const t = fr.legalContracts.templates.values;
  const access = await requireApproved();
  if (!can(access, "manage_legal"))
    return { ok: false, error: fr.auth.errors.forbidden };
  const input = z.string().min(1).max(200_000).safeParse(body);
  if (!input.success || !input.data.trim())
    return { ok: false, error: t.empty };
  const text = input.data;

  const candidates = valuesByShape(text);
  let partial = false;
  let quota: string | null = null;
  let about: TemplateAbout | null = null;
  try {
    const { output } = await extract(
      templateValuesSchema,
      `<contract>\n${escape(text.slice(0, READ_LIMIT))}\n</contract>`,
      contractTemplateValuesInstructions,
    );
    if (output.template)
      about = {
        name: output.template.name.trim().slice(0, 200),
        type: output.template.type,
        roles: [...new Set(output.template.roles)],
        usage: output.template.usage.trim().slice(0, 500),
      };
    candidates.push(
      ...output.values.map((v) => ({
        excerpt: unescapeData(v.excerpt).trim(),
        field: v.field,
      })),
    );
  } catch (error) {
    console.error("suggestTemplateValues:", error);
    partial = true;
    quota = aiQuotaMessage(error);
  }

  const seen = new Set<string>();
  const suggestions: Array<ValueSuggestion & { at: number }> = [];
  for (const { excerpt, field } of candidates) {
    if (seen.has(excerpt) || excerpt.length < 2 || excerpt.length > 200)
      continue;
    if (excerpt.includes("\n") || excerpt.includes("{{")) continue;
    if (field === "remuneration" && !/\d/.test(excerpt)) continue;
    const count = countExcerpt(text, excerpt);
    if (count === 0) continue;
    seen.add(excerpt);
    suggestions.push({ excerpt, field, count, at: text.indexOf(excerpt) });
  }
  return {
    ok: true,
    partial,
    quota,
    about,
    suggestions: suggestions
      .sort((a, b) => a.at - b.at)
      .slice(0, MAX_SUGGESTIONS)
      .map(({ excerpt, field, count }) => ({ excerpt, field, count })),
  };
}
