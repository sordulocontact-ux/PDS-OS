"use server";

import { z } from "zod";

import {
  activationDone,
  activationFailure,
  invalid,
} from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const t = fr.activationPress.template;

export type PrepareDraftsResult =
  { ok: true; count: number } | { ok: false; error: string };

/**
 * « Préparer les brouillons par cible » : from the validated common template,
 * one draft per target that has no pitch yet — the greeting (journalist or
 * media) and the target's angle added by code, the rest the template's
 * words. Drafts only : each is personalised and validated before any send.
 */
export async function prepareTargetDrafts(input: {
  projectId: string;
  activationId: string;
}): Promise<PrepareDraftsResult> {
  const access = await requireApproved();
  const parsed = z
    .object({ projectId: z.uuid(), activationId: z.uuid() })
    .safeParse(input);
  if (!parsed.success) return invalid();
  const { projectId, activationId } = parsed.data;
  const supabase = await createClient();
  const [messages, targets] = await Promise.all([
    supabase
      .from("activation_messages")
      .select(
        "id, target_id, kind, status, subject, body, channel, press_kit_document_id, created_at",
      )
      .eq("activation_id", activationId)
      .eq("kind", "pitch")
      .order("created_at", { ascending: false }),
    supabase
      .from("activation_targets")
      .select("id, contact_id, journalist_contact_id, angle, outcome")
      .eq("activation_id", activationId),
  ]);
  const template = messages.data?.find(
    (m) => m.target_id === null && m.status === "validated",
  );
  if (!template) return invalid(t.needsValidated);
  const covered = new Set(
    messages.data?.flatMap((m) =>
      m.target_id && m.status !== "cancelled" ? [m.target_id] : [],
    ),
  );
  const open = (targets.data ?? []).filter(
    (x) => !covered.has(x.id) && !x.outcome,
  );
  if (open.length === 0) return invalid(t.nothingToPrepare);
  const ids = [
    ...new Set(
      open.flatMap((x) => [
        x.contact_id,
        ...(x.journalist_contact_id ? [x.journalist_contact_id] : []),
      ]),
    ),
  ];
  const { data: contacts } = await supabase
    .from("network_contacts")
    .select("id, name")
    .in("id", ids);
  const nameOf = (id: string | null) =>
    contacts?.find((c) => c.id === id)?.name ?? null;
  const { error } = await supabase.from("activation_messages").insert(
    open.map((x) => ({
      activation_id: activationId,
      target_id: x.id,
      kind: "pitch",
      subject: template.subject,
      channel: template.channel,
      press_kit_document_id: template.press_kit_document_id,
      body: [
        t.greeting(nameOf(x.journalist_contact_id), nameOf(x.contact_id) ?? ""),
        x.angle ? `${t.angleIntro} ${x.angle}` : null,
        template.body,
      ]
        .filter(Boolean)
        .join("\n\n"),
      organization_id: access.organizationId ?? "",
      project_id: projectId,
    })),
  );
  if (error) return activationFailure(error);
  activationDone(projectId);
  return { ok: true, count: open.length };
}
