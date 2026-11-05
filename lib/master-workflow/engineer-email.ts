import "server-only";

import { emailContact } from "@/lib/email/contact-email";
import { masterJourney } from "@/lib/i18n/fr/master-journey";
import { masterRound } from "@/lib/i18n/fr/master-round";
import { createClient } from "@/lib/supabase/server";

const t = masterRound.notify;

type Stage = "mix" | "mastering";

/** The engineer of a round: the contact of its latest live sending, or of
 * the mix link that carries the mastering too. */
export async function engineerOf(
  projectId: string,
  stage: Stage,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("master_transmissions")
    .select("role, contact_id")
    .eq("project_id", projectId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  return (
    rows.find((r) => r.role === stage)?.contact_id ??
    (stage === "mastering"
      ? (rows.find((r) => r.role === "mix")?.contact_id ?? null)
      : null)
  );
}

async function projectTitle(projectId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("title")
    .eq("id", projectId)
    .maybeSingle();
  return data?.title ?? "";
}

/**
 * Tells the engineer, by e-mail, what the team just did on their round
 * (Sacha, 05/11/2026): a version validated or sent back, feedback, a
 * reopened mix, a reply, a refused rate, a reminder. The link is their
 * page by project, opened on the versions or the thread. Never blocks the
 * gesture: without SMTP or address, their page still says it.
 */
export async function emailEngineer(
  projectId: string,
  stage: Stage,
  build: (title: string) => {
    subject: string;
    body: string;
    anchor?: string;
  },
): Promise<"sent" | "failed" | "disabled"> {
  const contactId = await engineerOf(projectId, stage);
  if (!contactId) return "disabled";
  const mail = build(await projectTitle(projectId));
  return emailContact({
    projectId,
    contactId,
    subject: mail.subject,
    body: mail.body,
    open: t.open,
    anchor: mail.anchor,
  });
}

/** The version a gesture is about: its stage and its name (« Mix V2 »). */
export async function versionOf(
  versionId: string,
): Promise<{ stage: Stage; name: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("master_mix_versions")
    .select("stage, number")
    .eq("id", versionId)
    .maybeSingle();
  if (!data || (data.stage !== "mix" && data.stage !== "mastering"))
    return null;
  return {
    stage: data.stage,
    name: `${masterJourney.versionLabel[data.stage]} V${data.number}`,
  };
}
