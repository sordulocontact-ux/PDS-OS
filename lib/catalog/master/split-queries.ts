import "server-only";

import { oneOf, SPLIT_KINDS, type SplitKind } from "@/lib/catalog/master/rules";
import type {
  SplitLine,
  SplitValidation,
} from "@/lib/catalog/master/split-review";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

type Person = { first_name: string | null; last_name: string | null } | null;
const nameOf = (p: Person) => (p ? personName(p.first_name, p.last_name) : "");

function lineOf(value: Json): SplitLine | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const party = typeof value.party === "string" ? value.party : null;
  const share = Number(value.share);
  if (!party || !Number.isFinite(share)) return null;
  return {
    party,
    role: typeof value.role === "string" ? value.role : "other",
    share,
    contactId: typeof value.contact_id === "string" ? value.contact_id : null,
    artistId: typeof value.artist_id === "string" ? value.artist_id : null,
  };
}

/**
 * The latest validation of each split kind of a title (retours Catalogue
 * 44, 48), read with manage_catalog (RLS).
 */
export async function loadSplitReview(masterId: string): Promise<{
  validations: Partial<Record<SplitKind, SplitValidation>>;
  error: boolean;
}> {
  if (!catalogIdSchema.safeParse(masterId).success)
    return { validations: {}, error: false };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("master_split_validations")
    .select(
      "id, kind, lines, validated_at, validator:people!master_split_validations_validated_by_fkey(first_name, last_name)",
    )
    .eq("master_id", masterId)
    .order("validated_at", { ascending: false });
  if (error) {
    console.error("loadSplitReview:", error.message);
    return { validations: {}, error: true };
  }
  const latest: Partial<Record<SplitKind, SplitValidation>> = {};
  for (const row of data ?? []) {
    const kind = oneOf(SPLIT_KINDS, row.kind, "master");
    if (latest[kind]) continue;
    latest[kind] = {
      id: row.id,
      kind,
      lines: Array.isArray(row.lines)
        ? row.lines.flatMap((l) => lineOf(l) ?? [])
        : [],
      validatedAt: row.validated_at,
      validatorName: nameOf(row.validator),
    };
  }
  return {
    validations: latest,
    error: false,
  };
}
