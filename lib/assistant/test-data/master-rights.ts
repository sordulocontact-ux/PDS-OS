import "server-only";

import {
  fakeDeclaration,
  fakeIswc,
  fakeSplits,
} from "@/lib/assistant/test-data/fake-master";
import type { Step } from "@/lib/assistant/test-data/fill-master";
import { logged, type Supabase } from "@/lib/assistant/test-data/writes";
import { ORGANISMS } from "@/lib/catalog/master/rules";

// The fictional label holding the rights of a test title.
const LABEL = "PDS";

/**
 * Rights of a title filled with test data: splits (each kind only if
 * empty, 100 % each), ISWC and ℗ (only the missing fields), a declaration to
 * each organism not filed yet.
 */
export async function fillMasterRights(
  supabase: Supabase,
  organizationId: string,
  id: string,
  artist: string,
): Promise<{
  masterSplits?: Step;
  publishingSplits?: Step;
  rights: Step;
  declarations: Step;
}> {
  const steps: Awaited<ReturnType<typeof fillMasterRights>> = {
    rights: null,
    declarations: null,
  };
  // Splits are read and written with manage_catalog only (RLS).
  const { data: splits } = await supabase
    .from("master_splits")
    .select("kind")
    .eq("master_id", id);
  const fake = fakeSplits(artist, LABEL);
  for (const kind of ["master", "publishing"] as const) {
    const key = kind === "master" ? "masterSplits" : "publishingSplits";
    steps[key] = splits?.some((s) => s.kind === kind)
      ? null
      : logged(
          await supabase.from("master_splits").insert(
            fake[kind].map((s) => ({
              ...s,
              organization_id: organizationId,
              master_id: id,
            })),
          ),
          key,
        );
  }

  const { data: rights } = await supabase
    .from("masters")
    .select("iswc, rights_holder, rights_year")
    .eq("id", id)
    .maybeSingle();
  steps.rights =
    rights?.iswc && rights.rights_holder && rights.rights_year
      ? null
      : logged(
          await supabase
            .from("masters")
            .update({
              iswc: rights?.iswc ?? fakeIswc(),
              rights_holder: rights?.rights_holder ?? LABEL,
              rights_year: rights?.rights_year ?? new Date().getUTCFullYear(),
            })
            .eq("id", id),
          "rights",
        );

  const { data: filed } = await supabase
    .from("master_declarations")
    .select("organism")
    .eq("master_id", id);
  const missing = ORGANISMS.filter(
    (o) => !filed?.some((d) => d.organism === o),
  );
  steps.declarations = missing.length
    ? logged(
        await supabase.from("master_declarations").insert(
          missing.map((organism) => ({
            ...fakeDeclaration(organism),
            organism,
            organization_id: organizationId,
            master_id: id,
          })),
        ),
        "declarations",
      )
    : null;

  return steps;
}
