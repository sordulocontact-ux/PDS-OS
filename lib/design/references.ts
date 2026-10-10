import "server-only";

import type { ConceptionReference } from "@/lib/design/conception";
import {
  REFERENCE_BUCKET,
  referenceMediaOf,
} from "@/lib/design/reference-rules";
import {
  referenceStatusOf,
  validatedReferenceIds,
  type ReferenceStatus,
} from "@/lib/design/reference-status";
import { createClient } from "@/lib/supabase/server";

/** A reference as the references page shows it. */
export type ReferenceView = ConceptionReference & {
  // What it reads as: a thumbnail, an icon, or a link.
  media: "image" | "pdf" | "video" | "other" | "link";
  // Opened in a new tab: a short-lived signed URL for a file, the address
  // for a link; null when the file could not be signed.
  href: string | null;
  // Images only: the same signed URL, shown small.
  thumbnail: string | null;
  // Its title, else its file name, else its address.
  name: string;
  // Proposed until a validated section of the direction carries it.
  status: ReferenceStatus;
};

// Signed links are short-lived: the page is rendered on demand.
const SIGNED_SECONDS = 15 * 60;

/** Signs the files, reads the direction's decisions: one round trip each. */
export async function loadReferenceViews(
  projectId: string,
  references: ConceptionReference[],
): Promise<ReferenceView[]> {
  const supabase = await createClient();
  const paths = references.flatMap((r) => (r.path ? [r.path] : []));
  const [signedRes, versionsRes] = await Promise.all([
    paths.length
      ? supabase.storage
          .from(REFERENCE_BUCKET)
          .createSignedUrls(paths, SIGNED_SECONDS)
      : null,
    supabase
      .from("design_submissions")
      .select("mode, snapshot, design_decisions(section, decision)")
      .eq("project_id", projectId)
      .eq("kind", "direction"),
  ]);

  const signed = new Map(
    (signedRes?.data ?? []).flatMap((s) =>
      s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [],
    ),
  );
  const validated = validatedReferenceIds(
    (versionsRes.data ?? []).map((v) => ({
      mode: v.mode,
      snapshot: v.snapshot,
      decisions: v.design_decisions,
    })),
  );

  return references.map((r) => {
    const media = r.kind === "link" ? "link" : referenceMediaOf(r.mime);
    const href = r.kind === "link" ? r.url : (signed.get(r.path ?? "") ?? null);
    return {
      ...r,
      media,
      href,
      thumbnail: media === "image" ? href : null,
      name: r.title ?? r.fileName ?? r.url ?? "",
      status: referenceStatusOf(r.id, validated),
    };
  });
}
