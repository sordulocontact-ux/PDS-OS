"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { guestTitles } from "@/lib/projects/guest-titles";
import { createClient } from "@/lib/supabase/server";
import type { WriteDone } from "@/lib/utils/write-result";

// « Changer l'artiste principal » of a collective, from « Titres et
// artistes » (lot 6 of docs/pds-mic-plan.md), through
// set_project_main_artist (lot 1): the database decides who may (the owner
// once launched, who creates projects before) and refuses an artist who
// takes part in a title of the project (main_artist_is_guest, lot 5).

const idSchema = z.uuid();

/** `field`: the refusal is about the artist chosen, said under its field. */
export type MainArtistResult =
  WriteDone | { ok: false; error: string; field: boolean };

export async function setProjectMainArtist(input: {
  projectId: string;
  artistId: string;
}): Promise<MainArtistResult> {
  const t = fr.projectTitles.mainArtist;
  await requireApproved();
  const projectId = idSchema.safeParse(input.projectId);
  if (!projectId.success) return { ok: false, error: t.failed, field: false };
  const artistId = idSchema.safeParse(input.artistId);
  if (!artistId.success)
    return { ok: false, error: t.artistRequired, field: true };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_project_main_artist", {
    p_project_id: projectId.data,
    p_artist_id: artistId.data,
  });
  if (error) {
    const message = error.message;
    if (error.code === "42501")
      return { ok: false, error: fr.auth.errors.forbidden, field: false };
    // The artist takes part in titles of the project: named.
    if (message.includes("main_artist_is_guest"))
      return {
        ok: false,
        error: fr.shell.newProject.errors.mainArtistIsGuest(
          await guestTitles(supabase, projectId.data, artistId.data),
        ),
        field: true,
      };
    if (message.includes("artist_not_found"))
      return {
        ok: false,
        error: fr.shell.newProject.errors.invalidMainArtist,
        field: true,
      };
    if (message.includes("project_not_found"))
      return { ok: false, error: t.notFound, field: false };
    console.error("setProjectMainArtist:", message);
    return { ok: false, error: t.failed, field: false };
  }
  // Its name heads the project everywhere (header, lists, the switcher);
  // a credited title's page shows its credits.
  revalidatePath(routes.project(projectId.data), "layout");
  revalidatePath(routes.projects, "layout");
  revalidatePath(routes.artists, "layout");
  return { ok: true };
}
