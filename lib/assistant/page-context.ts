import "server-only";

import { getArtist } from "@/lib/catalog/artist-queries";
import { getMaster } from "@/lib/catalog/queries";
import { masterLabel } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { getProject } from "@/lib/projects/queries";

/**
 * The page PO was opened from (Espace Espace), as one sentence written by
 * code: what "this artist", "this project", "here" refer to
 * (docs/ASSISTANT.md § 2 bis). Only the path travels from the client; the
 * names are read here with the user's session, so an unknown or invisible
 * record gives nothing. A hint, never a restriction.
 */

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const ARTIST = new RegExp(`^/app/catalog/artists/(${UUID})(?:/|$)`);
const MASTER = new RegExp(`^/app/catalog/masters/(${UUID})(?:/|$)`);
const PROJECT = new RegExp(`^/app/projects/(${UUID})(?:/([a-z-]+))?`);

/** The record a page shows, read from its path only (no database access). */
export type PageRecord = { kind: "artist" | "master" | "project"; id: string };

export function pageRecord(path: string | null | undefined): PageRecord | null {
  if (!path) return null;
  const artist = ARTIST.exec(path);
  if (artist) return { kind: "artist", id: artist[1] };
  const master = MASTER.exec(path);
  if (master) return { kind: "master", id: master[1] };
  const project = PROJECT.exec(path);
  return project ? { kind: "project", id: project[1] } : null;
}

export async function pageContext(
  path: string | undefined,
): Promise<string | null> {
  const t = fr.assistant.pageContext;
  if (!path) return null;

  const artist = ARTIST.exec(path);
  if (artist) {
    const found = await getArtist(artist[1]);
    return found ? t.artist(found.name) : null;
  }
  const master = MASTER.exec(path);
  if (master) {
    const found = await getMaster(master[1]);
    return found ? t.master(masterLabel(found), found.artists) : null;
  }
  const project = PROJECT.exec(path);
  if (project) {
    const found = await getProject(project[1]);
    if (!found) return null;
    const section = project[2] ? t.sections[project[2]] : undefined;
    return t.project(found.title, found.id, section);
  }
  if (path.startsWith("/app/catalog/artists")) return t.artists;
  if (path.startsWith("/app/catalog/masters")) return t.masters;
  if (path.startsWith("/app/projects")) return t.projects;
  if (path.startsWith("/app/work")) return t.work;
  if (path.startsWith("/app/feedback")) return t.feedback;
  return null;
}
