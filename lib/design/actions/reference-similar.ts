"use server";

import { createHash } from "node:crypto";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import {
  linkExistingFile,
  recordReferenceFile,
} from "@/lib/design/actions/reference-files";
import {
  invalid,
  targets,
  type ReferenceResult,
} from "@/lib/design/reference-db";
import {
  DIRECTION_TARGET,
  REFERENCE_BUCKET,
  isReferenceMime,
} from "@/lib/design/reference-rules";
import {
  cleanSearches,
  readMoodboard,
  searchSimilar,
} from "@/lib/design/similar-references";
import {
  ALL_IMAGES,
  parseArenaLink,
  type SimilarGroup,
} from "@/lib/design/similar-rules";
import { fr } from "@/lib/i18n/fr";
import { getArenaImage } from "@/lib/integrations/arena";
import { IntegrationError } from "@/lib/integrations/http";
import { downloadImageOf, type ExternalImage } from "@/lib/integrations/images";
import { getOpenverseImage } from "@/lib/integrations/openverse";
import { createClient } from "@/lib/supabase/server";

// « Chercher des références semblables » (étape 6): PO reads, Are.na (and
// Openverse when it is on) finds, a human keeps. Only the writers of the Conception get
// there (the same check as RLS, before any model or outside call); what is
// kept is written with the user's session, like a deposited file.

type Failed = { ok: false; error: string };
const base = z.union([
  z.literal(ALL_IMAGES),
  z.literal(DIRECTION_TARGET),
  z.uuid(),
]);

function sourceFailure(error: unknown, where: string): Failed {
  const t = fr.conceptionRefs.similar.errors;
  const reason = error instanceof IntegrationError ? error.reason : null;
  console.error(`${where}:`, reason ?? error);
  if (reason === "rate_limited") return { ok: false, error: t.rateLimited };
  if (reason === "unauthorized") return { ok: false, error: t.unauthorized };
  if (reason === "premium_required") return { ok: false, error: t.premium };
  if (reason === "too_large") return { ok: false, error: t.tooLarge };
  if (reason) return { ok: false, error: t.unreachable };
  return { ok: false, error: t.generic };
}

/** The user's session, once it is allowed to write in this Conception. */
async function writer(projectId: string) {
  const access = await requireApproved();
  if (!access.organizationId) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("design_can_write", {
    p_project_id: projectId,
  });
  return data === true
    ? { supabase, organizationId: access.organizationId }
    : null;
}

/** Step 1: what PO sees in the moodboard (null: no image to read). */
export async function readSimilarMoodboard(input: {
  projectId: string;
  base: string;
}): Promise<
  { ok: true; reading: { look: string; searches: string[] } | null } | Failed
> {
  const parsed = z.object({ projectId: z.uuid(), base }).safeParse(input);
  if (!parsed.success) return invalid();
  const session = await writer(parsed.data.projectId);
  if (!session) return { ok: false, error: fr.conception.errors.notAllowed };
  try {
    const reading = await readMoodboard(
      session.supabase,
      parsed.data.projectId,
      parsed.data.base,
    );
    return { ok: true, reading };
  } catch (error) {
    return sourceFailure(error, "readSimilarMoodboard");
  }
}

/** Step 2: Are.na's channels and Openverse's searches, minus what is kept. */
export async function searchSimilarReferences(input: {
  projectId: string;
  base: string;
  searches: string[];
  arenaLink: string;
}): Promise<{ ok: true; groups: SimilarGroup[] } | Failed> {
  const parsed = z
    .object({
      projectId: z.uuid(),
      base,
      searches: z.array(z.string().max(80)).max(6),
      arenaLink: z.string().trim().max(500),
    })
    .safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  const t = fr.conceptionRefs.similar;
  const link = parseArenaLink(v.arenaLink);
  if (v.arenaLink && !link) return { ok: false, error: t.errors.badLink };
  const session = await writer(v.projectId);
  if (!session) return { ok: false, error: fr.conception.errors.notAllowed };
  try {
    const groups = await searchSimilar(session.supabase, v.projectId, {
      base: v.base,
      searches: cleanSearches(v.searches),
      link,
    });
    if (!groups) return { ok: false, error: t.noSource };
    return { ok: true, groups };
  } catch (error) {
    return sourceFailure(error, "searchSimilarReferences");
  }
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/**
 * Keeps one proposal: the image is read again at its source by its id (only
 * the id comes from the browser), its file stored in the project's bucket,
 * then recorded like a deposited file, its source page in the note.
 */
export async function keepSimilarImage(input: {
  projectId: string;
  source: string;
  imageId: string;
  targets: string[];
}): Promise<ReferenceResult> {
  const parsed = z
    .object({
      projectId: z.uuid(),
      source: z.enum(["arena", "openverse"]),
      imageId: z.string().max(64),
      targets,
    })
    .safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  const session = await writer(v.projectId);
  if (!session) return { ok: false, error: fr.conception.errors.notAllowed };
  const t = fr.conceptionRefs.similar;

  let image: ExternalImage | null;
  let file: { data: Uint8Array; mime: string };
  try {
    image =
      v.source === "arena"
        ? await getArenaImage(v.imageId)
        : await getOpenverseImage(v.imageId);
    if (!image) return { ok: false, error: t.errors.gone };
    file = await downloadImageOf(v.source, image);
  } catch (error) {
    return sourceFailure(error, "keepSimilarImage");
  }
  const ext = EXTENSIONS[file.mime];
  if (!isReferenceMime(file.mime) || !ext)
    return { ok: false, error: t.errors.notImage };

  const sha256 = createHash("sha256").update(file.data).digest("hex");
  const existing = await linkExistingFile({
    projectId: v.projectId,
    sha256,
    targets: v.targets,
  });
  if (existing) return existing;

  const path = `${session.organizationId}/${v.projectId}/${crypto.randomUUID()}.${ext}`;
  const bucket = session.supabase.storage.from(REFERENCE_BUCKET);
  const { error } = await bucket.upload(path, file.data, {
    contentType: file.mime,
    upsert: false,
  });
  if (error) {
    console.error("keepSimilarImage (upload):", error.message);
    return { ok: false, error: fr.conceptionRefs.errors.upload };
  }
  const result = await recordReferenceFile({
    projectId: v.projectId,
    path,
    fileName: (image.fileName ?? `${v.source}-${image.id}.${ext}`).slice(
      0,
      255,
    ),
    mime: file.mime,
    bytes: file.data.byteLength,
    sha256,
    title: (image.title ?? "").slice(0, 200),
    note: t.note(t.sources[v.source], image),
    targets: v.targets,
  });
  if (!result.ok) await bucket.remove([path]);
  return result;
}
