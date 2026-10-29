"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  IDENTITY_REF_KINDS,
  IDENTITY_TEXTS,
} from "@/lib/catalog/identity-fields";
import { refreshConception } from "@/lib/design/actions/shared";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// The artist's identity (MKT-C2-04). Rights and states are the database's
// (propose_artist_identity, decide_artist_identity…): these only validate
// the input and say the outcome in French.

const t = fr.artistIdentity.errors;
const CODES = [
  "forbidden",
  "invalid_identity",
  "reason_required",
  "own_proposal",
  "already_decided",
] as const;

function failed(error: { message?: string } | null): WriteResult {
  const code = CODES.find((c) => error?.message?.includes(c));
  return { ok: false, error: code ? t[code] : t.generic };
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const fieldsSchema = z.object({
  manifesto: optionalText(4000),
  tone: optionalText(2000),
  palette: optionalText(1000),
  typography: optionalText(1000),
  symbols: optionalText(2000),
  refs: z
    .array(
      z.object({
        kind: z.enum(IDENTITY_REF_KINDS),
        url: z
          .string()
          .trim()
          .max(2000)
          .regex(/^https:\/\/\S+$/),
        title: optionalText(200),
        note: optionalText(500),
      }),
    )
    .max(60),
});

const proposeInput = z.object({
  artistId: z.uuid(),
  fields: fieldsSchema,
  changeNote: optionalText(1000),
  // From a release (« Proposer une évolution de l'identité »).
  projectId: z.uuid().nullable(),
});

/** A new version: approved at once for a validator, proposed otherwise. */
export async function proposeArtistIdentity(
  input: z.input<typeof proposeInput>,
): Promise<WriteResult> {
  const p = proposeInput.safeParse(input);
  if (!p.success) return { ok: false, error: t.invalid_identity };
  await requireApproved();
  const supabase = await createClient();
  const fields = Object.fromEntries(
    IDENTITY_TEXTS.map((k) => [k, p.data.fields[k]]),
  );
  const { error } = await supabase.rpc("propose_artist_identity", {
    p_artist_id: p.data.artistId,
    p_fields: { ...fields, refs: p.data.fields.refs },
    p_change_note: p.data.changeNote,
    p_project_id: p.data.projectId,
  });
  if (error) return failed(error);
  revalidatePath(routes.artistIdentity(p.data.artistId));
  if (p.data.projectId) refreshConception(p.data.projectId);
  return { ok: true };
}

const decideInput = z.object({
  artistId: z.uuid(),
  versionId: z.uuid(),
  approve: z.boolean(),
  comment: optionalText(1000),
});

/** A validator approves or rejects a proposed version. */
export async function decideArtistIdentity(
  input: z.input<typeof decideInput>,
): Promise<WriteResult> {
  const p = decideInput.safeParse(input);
  if (!p.success) return { ok: false, error: t.invalid_identity };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_artist_identity", {
    p_version_id: p.data.versionId,
    p_approve: p.data.approve,
    p_comment: p.data.comment,
  });
  if (error) return failed(error);
  // The whole artist: its « Maintenant » (the layout) and the Identité tab.
  revalidatePath(routes.artist(p.data.artistId), "layout");
  return { ok: true };
}

const projectInput = z.object({ projectId: z.uuid() });

/** The release moves to another approved version (its owner, open). */
export async function pickIdentityVersion(input: {
  projectId: string;
  versionId: string;
}): Promise<WriteResult> {
  const p = projectInput.extend({ versionId: z.uuid() }).safeParse(input);
  if (!p.success) return { ok: false, error: t.invalid_identity };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("use_artist_identity_version", {
    p_project_id: p.data.projectId,
    p_version_id: p.data.versionId,
  });
  if (error) return failed(error);
  refreshConception(p.data.projectId);
  return { ok: true };
}

/** The release's deviation from the identity, in words (empty: none). */
export async function setIdentityDeviation(input: {
  projectId: string;
  text: string;
}): Promise<WriteResult> {
  const p = projectInput
    .extend({ text: z.string().trim().max(2000) })
    .safeParse(input);
  if (!p.success) return { ok: false, error: t.invalid_identity };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_design_identity_deviation", {
    p_project_id: p.data.projectId,
    p_text: p.data.text || null,
  });
  if (error) return failed(error);
  refreshConception(p.data.projectId);
  return { ok: true };
}
