import "server-only";

import type { ContentFormatOption } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

/** The reusable content formats of the organization (RLS: every member). */
export async function listContentFormats(): Promise<ContentFormatOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_formats")
    .select("id, name, description")
    .is("archived_at", null)
    .order("name");
  if (error) {
    console.error("listContentFormats:", error.message);
    return [];
  }
  return data;
}
