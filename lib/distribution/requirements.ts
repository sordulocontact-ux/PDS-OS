import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";
import { createClient } from "@/lib/supabase/server";

// What the distributor asks of the audio files (« WAV 24 bits / 44,1 kHz »),
// owned by the Distribution and set by the administration in /app/settings
// (organization_distribution). The Master's Brief reads it, never hardcodes
// it (ticket « Workflow Master » § 3 and § 14).

export const loadDistributionFormats = trackedCache(
  async (organizationId: string): Promise<string | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organization_distribution")
      .select("audio_formats")
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error) console.error("loadDistributionFormats:", error.message);
    return data?.audio_formats ?? null;
  },
);
