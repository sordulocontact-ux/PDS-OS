"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { writeBrief, type BriefFields } from "@/lib/master-workflow/brief-row";
import { loadBriefStep } from "@/lib/master-workflow/brief-step";
import {
  BRIEF_DATES,
  briefDeliverablesOf,
  type BriefDate,
} from "@/lib/master-workflow/brief-types";
import { calendarInOrder, isIsoDate } from "@/lib/master-workflow/calendar";
import { missingSentence } from "@/lib/master-workflow/brief-rules";
import { addContactRole } from "@/lib/network/add-role";
import { getProject } from "@/lib/projects/queries";
import { countedTitlesProject } from "@/lib/projects/counted-titles";
import { createClient } from "@/lib/supabase/server";
import { formatShortDay } from "@/lib/utils/day";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.masterBrief;

const text = z
  .string()
  .trim()
  .max(2000)
  .nullable()
  .transform((v) => (v ? v : null));

const patchSchema = z
  .object({
    mixContactId: z.uuid().nullable(),
    mixPersonId: z.uuid().nullable(),
    masteringSame: z.boolean(),
    masteringContactId: z.uuid().nullable(),
    masteringPersonId: z.uuid().nullable(),
    revisions: z.number().int().min(0).max(20).nullable(),
    validatorPersonId: z.uuid().nullable(),
    mixRateCents: z.number().int().min(0).max(100_000_000).nullable(),
    masteringRateCents: z.number().int().min(0).max(100_000_000).nullable(),
    direction: text,
    references: text,
    constraints: text,
    formats: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .transform((v) => (v ? v : null)),
    message: text,
    deliverables: z.array(z.string()).max(9),
    startMode: z.enum(["direct", "exchange"]),
    mixV1Due: z.string().nullable(),
    mixFinalDue: z.string().nullable(),
    masteringDue: z.string().nullable(),
    masterFinalDue: z.string().nullable(),
  })
  .partial();

export type BriefPatch = z.input<typeof patchSchema>;

const COLUMNS: Record<
  keyof z.output<typeof patchSchema>,
  keyof BriefFields | "start_mode"
> = {
  mixContactId: "mix_contact_id",
  mixPersonId: "mix_person_id",
  masteringSame: "mastering_same_engineer",
  masteringContactId: "mastering_contact_id",
  masteringPersonId: "mastering_person_id",
  revisions: "revisions",
  validatorPersonId: "validator_person_id",
  mixRateCents: "mix_rate_cents",
  masteringRateCents: "mastering_rate_cents",
  direction: "direction",
  references: "references_text",
  constraints: "constraints_text",
  formats: "delivery_formats",
  message: "engineer_message",
  deliverables: "deliverables",
  startMode: "start_mode",
  mixV1Due: "mix_v1_due",
  mixFinalDue: "mix_final_due",
  masteringDue: "mastering_due",
  masterFinalDue: "master_final_due",
};

const refresh = (projectId: string) =>
  revalidatePath(routes.projectMaster(projectId), "layout");

/**
 * One fact of the Brief changed in place (« Modifier », « Changer », a
 * deliverable): saved at once with the owner's session. The first change
 * writes the whole Brief as the project already knows it (engineers,
 * validator, proposed dates) with this change in it. The dates must follow
 * each other, said by the code before the database checks it again.
 */
export async function saveBriefFact(
  projectId: string,
  patch: BriefPatch,
): Promise<WriteResult> {
  const id = z.uuid().safeParse(projectId);
  const parsed = patchSchema.safeParse(patch);
  const access = await requireApproved();
  if (!id.success || !parsed.success || !access.organizationId)
    return { ok: false, error: t.errors.failed };
  const project = await getProject(id.data);
  if (!project) return { ok: false, error: t.errors.failed };
  const p = parsed.data;
  for (const key of BRIEF_DATES) {
    const value = p[key];
    if (value && !isIsoDate(value)) return { ok: false, error: t.errors.date };
  }

  const step = await loadBriefStep(project, access, null);
  const b = step.view.brief;
  const dates = Object.fromEntries(
    BRIEF_DATES.map((key) => [
      key,
      key in p ? (p[key] ?? null) : step.dates[key].value,
    ]),
  ) as Record<BriefDate, string | null>;
  if (!calendarInOrder(dates)) return { ok: false, error: t.orderError };

  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(p))
    changes[COLUMNS[key as keyof typeof COLUMNS]] =
      key === "deliverables" ? briefDeliverablesOf(value as string[]) : value;
  if (p.masteringSame) {
    changes.mastering_contact_id = null;
    changes.mastering_person_id = null;
  }
  // One engineer per round: a contact of the Réseau or a member of PDS.
  if (p.mixContactId) changes.mix_person_id = null;
  if (p.mixPersonId) changes.mix_contact_id = null;
  if (p.masteringContactId) changes.mastering_person_id = null;
  if (p.masteringPersonId) changes.mastering_contact_id = null;

  // A new engineer brings his usual rate from the Réseau, when the Brief
  // has none or had the previous engineer's (ticket § 4, proto « tarif
  // habituel »); a rate typed by hand stays.
  const usual = step.view.usualRates;
  const mixAfter =
    p.mixContactId !== undefined
      ? p.mixContactId
      : p.mixPersonId
        ? null
        : b.mixContactId;
  const sameAfter =
    p.masteringSame !== undefined
      ? p.masteringSame
      : p.masteringContactId || p.masteringPersonId
        ? false
        : b.masteringSameEngineer;
  const masteringAfter = sameAfter
    ? mixAfter
    : p.masteringContactId !== undefined
      ? p.masteringContactId
      : p.masteringPersonId
        ? null
        : b.masteringContactId;
  const masteringBefore = b.masteringSameEngineer
    ? b.mixContactId
    : b.masteringContactId;
  const takeUsual = (
    role: "mix" | "mastering",
    before: string | null,
    after: string | null,
    current: number | null,
  ) => {
    if (after === before || !after) return undefined;
    const next = usual[after]?.[role] ?? null;
    const previous = before ? (usual[before]?.[role] ?? null) : null;
    return next !== null && (current === null || current === previous)
      ? next
      : undefined;
  };
  const mixRate =
    p.mixRateCents === undefined
      ? takeUsual("mix", b.mixContactId, mixAfter, b.mixRateCents)
      : undefined;
  if (mixRate !== undefined) changes.mix_rate_cents = mixRate;
  const masteringRate =
    p.masteringRateCents === undefined
      ? takeUsual(
          "mastering",
          masteringBefore,
          masteringAfter,
          b.masteringRateCents,
        )
      : undefined;
  if (masteringRate !== undefined) changes.mastering_rate_cents = masteringRate;

  const fields = step.saved
    ? changes
    : {
        mix_contact_id: b.mixContactId,
        mix_person_id: b.mixPersonId,
        mastering_same_engineer: b.masteringSameEngineer,
        mastering_contact_id: b.masteringSameEngineer
          ? null
          : b.masteringContactId,
        mastering_person_id: b.masteringSameEngineer
          ? null
          : b.masteringPersonId,
        mix_rate_cents: b.mixRateCents,
        mastering_rate_cents: b.masteringRateCents,
        revisions: b.revisions,
        validator_person_id: b.validatorPersonId,
        references_text: b.references,
        direction: b.direction,
        constraints_text: b.constraints,
        delivery_formats: b.formats,
        engineer_message: b.message,
        deliverables: b.deliverables,
        mix_v1_due: dates.mixV1Due,
        mix_final_due: dates.mixFinalDue,
        mastering_due: dates.masteringDue,
        master_final_due: dates.masterFinalDue,
        ...changes,
      };
  const supabase = await createClient();
  const error = await writeBrief(
    supabase,
    access.organizationId,
    id.data,
    fields as BriefFields,
  );
  if (error) {
    console.error("saveBriefFact:", error.code, error.message);
    return {
      ok: false,
      error:
        error.code === "42501"
          ? t.errors.forbidden
          : error.message.includes("validator_not_in_project")
            ? t.errors.validator
            : error.message.includes("engineer_not_member")
              ? t.errors.failed
              : error.message.includes("calendar_order")
                ? t.orderError
                : t.errors.failed,
    };
  }
  // Someone of the Réseau chosen to mix or master is an engineer from now on.
  for (const contactId of [p.mixContactId, p.masteringContactId])
    if (contactId) await addContactRole(supabase, contactId, "engineer");
  refresh(id.data);
  return { ok: true };
}

/**
 * « Commencer directement » / « Préparer un échange »: the choice is kept;
 * starting directly asks the project's creative directors the artistic
 * direction when the Brief does not have it (a task in their Travail).
 */
export async function startBrief(
  projectId: string,
  mode: "direct" | "exchange",
): Promise<WriteResult> {
  const id = z.uuid().safeParse(projectId);
  await requireApproved();
  if (!id.success) return { ok: false, error: t.errors.failed };
  const done = mode === "direct" ? t.start.started : t.start.exchangeChosen;
  return withOutcome(id.data, ["master"], done, async () => {
    // « Directement »: the database asks the artistic direction to the
    // project's creative directors (_master_ask_direction, 06/11/2026).
    return saveBriefFact(id.data, { startMode: mode });
  });
}

/**
 * « Enregistrer le Brief »: never refused silently — what is missing is
 * said, and a Brief unchanged since it was recorded says so.
 */
export async function recordBrief(projectId: string): Promise<WriteResult> {
  const id = z.uuid().safeParse(projectId);
  const access = await requireApproved();
  if (!id.success) return { ok: false, error: t.errors.failed };
  const read = await getProject(id.data);
  if (!read) return { ok: false, error: t.errors.failed };
  // The same titles as the Brief step shows (lot 9).
  const project = countedTitlesProject(read);
  const step = await loadBriefStep(project, access, null);
  const missing = missingSentence(step.missing);
  if (missing) return { ok: false, error: missing };
  if (step.recordedAt && !step.dirty)
    return {
      ok: false,
      error: t.nothingChanged(formatShortDay(step.recordedAt)),
    };
  return withOutcome(id.data, ["master"], t.recorded, async () => {
    if (!step.saved) {
      const saved = await saveBriefFact(id.data, {});
      if (!saved.ok) return saved;
    }
    const supabase = await createClient();
    const { error } = await supabase.rpc("record_master_brief", {
      p_project_id: id.data,
    });
    if (error) {
      console.error("recordBrief:", error.code, error.message);
      return {
        ok: false,
        error: error.code === "42501" ? t.errors.forbidden : t.errors.failed,
      };
    }
    refresh(id.data);
    return { ok: true };
  });
}
