"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import {
  DEP_DR_CHOICES,
  QUALITIES,
  SACEM_725,
  SACEM_725_FIELDS,
} from "@/lib/legal/formalities/definition";
import type { Prefill } from "@/lib/legal/formalities/prefill";
import { loadFormalities } from "@/lib/legal/formalities/queries";
import { run } from "@/lib/legal/formalities/run";
import { getProject } from "@/lib/projects/queries";
import type { Json } from "@/lib/supabase/database.types";

// The steps of a formality (ticket Juridique 06). Every write is a SQL
// function: it checks manage_legal, the bulletin's rules and the order of
// the states itself.

const id = catalogIdSchema;
const share = z
  .string()
  .trim()
  .regex(/^(\d{1,3}(\.\d{1,4})?)?$/);
// A participant: their roles and their share within each role's category
// (retour d'Ibé du 02/11/2026), or « interprète uniquement ».
const creator = z.object({
  last_name: z.string().trim().max(200),
  first_name: z.string().trim().max(200),
  pseudonym: z.string().trim().max(200),
  ipi: z.string().trim().max(40),
  roles: z.array(z.enum(QUALITIES)).max(QUALITIES.length),
  performer_only: z.boolean().optional(),
  shares: z.partialRecord(z.enum(QUALITIES), share),
  signs: z.boolean(),
  contact_id: id.optional(),
  main_artist: z.boolean().optional(),
  artist_id: z.uuid().optional(),
  confirmed: z.boolean().optional(),
});
const publisher = z.object({
  name: z.string().trim().max(200),
  ipi: z.string().trim().max(40),
  share,
  contact_id: id.optional(),
  // Whom it publishes (JUR-22) and the contract that founds it (JUR-25):
  // kept, or formality_missing reads « publisher_link » on every typed line.
  represents: z.array(z.number().int().min(1).max(10)).max(10).optional(),
  contract_id: id.optional(),
  // PDS Éditions, signed by the direction (20261028000601).
  house: z.boolean().optional(),
});
const VALUE: Record<string, z.ZodType> = {
  // Five on the bulletin at most (formality_missing); performers only too.
  creators: z.array(creator).max(10),
  publishers: z.array(publisher).max(3),
  phono_split: z.object({
    no_publisher: z.boolean().optional(),
    custom: z
      .object({ author: share, composer: share, publisher: share })
      .nullable()
      .optional(),
  }),
  dep_dr: z.object({
    choice: z.enum(DEP_DR_CHOICES).or(z.literal("")),
    // The sharing rule the dossier was computed with (JUR-23).
    rule: z.string().max(40).optional(),
    // « J'ai vérifié les parts DEP et DR » (JUR-02, formality_missing).
    checked: z.boolean().optional(),
  }),
  arrangement: z.object({
    scope: z.enum(["all", "specific"]).or(z.literal("")),
    detail: z.string().trim().max(500),
  }),
  publishing_contract: z.object({
    provided: z.boolean(),
    rubric_g: z.string().trim().max(2000),
  }),
};
const KEYS = SACEM_725_FIELDS.map((f) => f.key);

export async function openFormality(projectId: string, masterId: string) {
  const p = z
    .object({ projectId: id, masterId: id })
    .safeParse({ projectId, masterId });
  if (!p.success)
    return { ok: false as const, error: fr.auth.errors.forbidden };
  return run(
    p.data.projectId,
    (s) =>
      s.rpc("open_formality", {
        p_project_id: p.data.projectId,
        p_master_id: p.data.masterId,
        p_key: SACEM_725,
      }),
    fr.legalJourney.done.formality.opened,
  );
}

type Values = Record<string, { value: unknown; typed: boolean }>;
type Stored = Record<string, { value: unknown; source: string }>;

// The values as written: a typed one checked against its schema; one left
// as PDS OS proposed it read again from its source (`prefill`). `skipInvalid`:
// a value caught half typed (« 33. ») waits for the next save instead of
// refusing the whole dossier.
function toWrite(
  values: Values,
  prefill: Prefill,
  skipInvalid = false,
): Stored | null {
  const out: Stored = {};
  for (const [key, entry] of Object.entries(values)) {
    if (!KEYS.includes(key)) continue;
    // A field left empty is not an answer: nothing to write (and a null
    // creators or text would fail its schema and refuse the whole dossier).
    if (entry.value === null || entry.value === undefined) continue;
    if (!entry.typed) {
      const sourced = prefill[key];
      if (sourced) out[key] = sourced;
      continue;
    }
    const schema = VALUE[key] ?? z.string().trim().max(2000);
    const parsed = schema.safeParse(entry.value);
    if (!parsed.success) {
      if (skipInvalid) continue;
      return null;
    }
    out[key] = { value: parsed.data, source: "Saisi" };
  }
  return out;
}

/** « Justine valide les valeurs » : a value typed is kept as typed; one
 * left as PDS OS proposed it is read again here from its source. */
export async function saveFormalityValues(
  projectId: string,
  masterId: string,
  formalityId: string,
  values: Values,
) {
  const p = z
    .object({ projectId: id, masterId: id, formalityId: id })
    .safeParse({ projectId, masterId, formalityId });
  const access = await requireApproved();
  if (!p.success)
    return { ok: false as const, error: fr.auth.errors.forbidden };
  const project = await getProject(p.data.projectId);
  if (!project) return { ok: false as const, error: fr.auth.errors.forbidden };
  const title = (await loadFormalities(project, access)).find(
    (t) => t.masterId === p.data.masterId,
  );
  if (!title) return { ok: false as const, error: fr.auth.errors.forbidden };

  const out = toWrite(values, title.prefill);
  if (!out)
    return { ok: false as const, error: fr.legalFormalities.errors.failed };
  return run(
    p.data.projectId,
    (s) =>
      s.rpc("save_formality_values", {
        p_formality_id: p.data.formalityId,
        p_values: out as Json,
      }),
    fr.legalJourney.done.formality.valuesSaved,
  );
}

/** The dossier saved as it is filled (Sacha, 10/11/2026): only what the
 * person typed or confirmed, quietly — no banner, no step moved on. A value
 * still as PDS OS proposed it waits for « Générer ». The SQL function checks
 * the rights and the state itself. */
export async function autosaveFormalityValues(
  projectId: string,
  formalityId: string,
  values: Values,
) {
  const p = z
    .object({ projectId: id, formalityId: id })
    .safeParse({ projectId, formalityId });
  if (!p.success)
    return { ok: false as const, error: fr.auth.errors.forbidden };
  const typed = Object.fromEntries(
    Object.entries(values).filter(([, e]) => e.typed),
  );
  const out = toWrite(typed, {}, true) ?? {};
  if (Object.keys(out).length === 0) return { ok: true as const };
  return run(p.data.projectId, (s) =>
    s.rpc("save_formality_values", {
      p_formality_id: p.data.formalityId,
      p_values: out as Json,
    }),
  );
}
