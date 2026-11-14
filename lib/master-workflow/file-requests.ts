import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

/** A member of the organization the owner may ask for files (lot 9 bis):
 * the project's team, an in-house engineer of its Master, the direction. */
export type FileRequestRecipient = {
  personId: string;
  name: string;
  reason: "team" | "engineer" | "direction";
};

/**
 * Whom « Demander des fichiers » may ask in a collective, the viewer aside
 * (list_file_request_recipients: names only, never a contact).
 */
export const loadFileRequestRecipients = trackedCache(
  async (projectId: string): Promise<FileRequestRecipient[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_file_request_recipients", {
      p_project_id: projectId,
    });
    if (error) console.error("loadFileRequestRecipients:", error.message);
    return (data ?? []).map((row) => ({
      personId: row.person_id,
      name: personName(row.first_name, row.last_name),
      reason:
        row.reason === "team" || row.reason === "engineer"
          ? row.reason
          : "direction",
    }));
  },
);
