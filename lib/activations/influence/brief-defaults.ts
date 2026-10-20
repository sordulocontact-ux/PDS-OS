import "server-only";

import {
  briefDefaults,
  type BriefDefaults,
} from "@/lib/activations/influence/brief-message";
import type { SheetFieldKey, SheetVersion } from "@/lib/activations/sheets";
import type { TargetRecord } from "@/lib/activations/targets";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatShortDay } from "@/lib/utils/day";

/** What « Brief et proposition » opens with for a creator: her validated
 * concept, her platform, the project, her latest rate noted in the Réseau
 * (in euros, not invalidated). */
export async function loadBriefDefaults(input: {
  target: TargetRecord;
  concept: SheetVersion | undefined;
  project: { title: string; artistName: string; dueDate: string | null };
}): Promise<BriefDefaults> {
  const { target, concept, project } = input;
  const supabase = await createClient();
  const { data: rate } = await supabase
    .from("network_observations")
    .select("value, observed_on")
    .eq("contact_id", target.contactId)
    .eq("kind", "rate")
    .eq("unit", "eur")
    .is("invalidated_at", null)
    .order("observed_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  const field = (key: SheetFieldKey) =>
    concept?.fields[key]?.value || undefined;
  return briefDefaults({
    creator: target.contactName,
    platform: target.tiktok
      ? "TikTok"
      : target.instagram
        ? "Instagram"
        : "privé",
    artist: project.artistName,
    title: project.title,
    releaseDay: project.dueDate ? formatDay(project.dueDate) : null,
    concept: {
      angle: field("angle"),
      format: field("format"),
      message: field("message"),
    },
    rate:
      rate?.value != null
        ? {
            amount: Number(rate.value),
            day: formatShortDay(rate.observed_on, { bare: true }),
          }
        : null,
  });
}
