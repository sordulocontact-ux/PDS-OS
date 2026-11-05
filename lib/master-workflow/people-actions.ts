"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { masterBrief } from "@/lib/i18n/fr/master-brief";
import { withOutcome } from "@/lib/journey/outcome";
import { addContactRole } from "@/lib/network/add-role";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = masterBrief;

const input = z.object({
  projectId: z.uuid(),
  field: z.enum(["mix", "mastering", "same", "validator"]),
  value: z.string().max(80),
});

/**
 * The DG corrects who mixes, who masters or who validates the versions
 * (Ibé, 04/11/2026: « ces rôles doivent pouvoir être modifiés par le DG en
 * cas d'erreur »). The database checks the DG and that the round has no
 * validated version (direction_set_master_person); the owner keeps
 * `saveBriefFact`. Mix and mastering: « contact:<id> » or « person:<id> ».
 */
export async function setMasterPerson(
  projectId: string,
  field: "mix" | "mastering" | "same" | "validator",
  value: string,
): Promise<WriteResult> {
  const parsed = input.safeParse({ projectId, field, value });
  await requireApproved();
  if (!parsed.success) return { ok: false, error: t.errors.failed };
  const p = parsed.data;
  return withOutcome(p.projectId, ["master"], t.changed, async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc("direction_set_master_person", {
      p_project_id: p.projectId,
      p_field: p.field,
      p_value: p.value,
    });
    if (error) {
      console.error("setMasterPerson:", error.code, error.message);
      return {
        ok: false,
        error:
          error.code === "42501"
            ? t.errors.forbidden
            : error.message.includes("round_validated")
              ? t.errors.roundValidated
              : error.message.includes("validator_not_in_project")
                ? t.errors.validator
                : t.errors.failed,
      };
    }
    if (p.value.startsWith("contact:"))
      await addContactRole(
        supabase,
        p.value.slice("contact:".length),
        "engineer",
      );
    revalidatePath(routes.projectMaster(p.projectId), "layout");
    return { ok: true };
  });
}
