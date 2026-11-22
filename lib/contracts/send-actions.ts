"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { emailOutcome } from "@/lib/email/outcome";
import { emailContractSigner } from "@/lib/contracts/signer-email";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { legalOutcome } from "@/lib/legal/outcome";
import { listCatalogFiles } from "@/lib/catalog/files";
import { envelopeInput } from "@/lib/email/envelope";
import { emailMessage } from "@/lib/email/link-email";
import { getContractDocument } from "@/lib/legal/contracts/document";
import { documentFileName } from "@/lib/legal/contracts/document-name";
import { contractPdf } from "@/lib/legal/contracts/document-pdf";
import { loadContractLetterhead } from "@/lib/legal/contracts/letterhead";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// « Envoyer pour signature » from a contract's page (send_contract, SQL,
// 20261020070101): on the person's private link when the contract comes
// from the Juridique and they have one, else how it went and the day. PDS
// OS e-mails the signer itself on their link when it can (lib/contracts/
// signer-email.ts); else the person sends the prepared one from their own
// mail app, and this records that it went (the proof of sending).

const input = z.object({
  contractId: z.uuid(),
  // To revalidate the project's pages (Juridique) too.
  projectId: z.uuid().nullable(),
  via: z.enum(["link", "other"]),
  how: z.string().trim().max(200).optional(),
  on: z.iso.date().optional(),
});

export async function sendContractForSignature(
  values: z.input<typeof input>,
): Promise<WriteResult> {
  const t = fr.signedReturns.team;
  const v = input.safeParse(values);
  if (!v.success) return { ok: false, error: t.errors.failed };
  const { contractId, projectId, via, how, on } = v.data;
  if (via === "other" && !how) return { ok: false, error: t.errors.how };
  if (via === "other" && !on) return { ok: false, error: t.errors.date };
  await requireApproved();
  const write = async (): Promise<WriteResult> => {
    const supabase = await createClient();
    const { error } = await supabase.rpc("send_contract", {
      p_contract_id: contractId,
      p_via: via,
      p_how: via === "other" ? (how ?? null) : null,
      p_on: via === "other" ? (on ?? null) : null,
    });
    if (error) {
      const m = error.message ?? "";
      console.error("sendContractForSignature:", error.code, m);
      if (m.includes("contact_link_missing"))
        return { ok: false, error: t.errors.noLink };
      if (error.code === "23514") return { ok: false, error: t.errors.date };
      if (error.code === "42501" || m.includes("contract_not_allowed"))
        return { ok: false, error: fr.contracts.errors.forbidden };
      if (m.includes("contract_wrong_status"))
        return { ok: false, error: fr.contracts.errors.status };
      return { ok: false, error: t.errors.failed };
    }
    revalidatePath(routes.contracts);
    revalidatePath(routes.contract(contractId));
    if (projectId) revalidatePath(routes.project(projectId), "layout");
    return via === "link" ? emailSigned(contractId) : { ok: true };
  };
  // From the Juridique (a project known): says what follows (JUR-04).
  return projectId
    ? legalOutcome(projectId, fr.legalJourney.done.contract.sent, write)
    : write();
}

/** On their private link, PDS OS e-mails the signer itself when it can. */
async function emailSigned(contractId: string): Promise<WriteResult> {
  const auto = fr.contracts.now.auto;
  const sent = await emailContractSigner(contractId, "send");
  return emailOutcome(sent, {
    sent: auto.sendDone,
    failed: auto.sendFailed,
  });
}

/** « Relancer »: the reminder goes by e-mail, with the link of their page. */
export async function remindContractSigner(
  contractId: string,
  projectId: string | null,
): Promise<WriteResult> {
  const auto = fr.contracts.now.auto;
  const id = z.uuid().safeParse(contractId);
  if (!id.success)
    return { ok: false, error: fr.signedReturns.team.errors.failed };
  await requireApproved();
  const sent = await emailContractSigner(id.data, "remind");
  if (sent === "disabled") return { ok: false, error: auto.noAddress };
  if (projectId) revalidatePath(routes.project(projectId), "layout");
  revalidatePath(routes.contract(id.data));
  return emailOutcome(sent, {
    sent: auto.remindDone,
    failed: auto.remindFailed,
  });
}

const emailInput = z.object({
  contractId: z.uuid(),
  projectId: z.uuid().nullable(),
  envelope: envelopeInput,
  subject: z.string().trim().min(1).max(300),
  message: z.string().trim().min(1).max(4000),
});

/** The contract's PDF to join: its latest draft filed (printed at its
 * generation, or deposited), else its generated document printed now. */
async function contractAttachment(
  contractId: string,
  title: string,
): Promise<{ filename: string; content: Uint8Array } | null> {
  const { files } = await listCatalogFiles({
    kind: "contract",
    id: contractId,
  });
  const filed = files.find((f) => f.category === "draft" && f.openUrl);
  if (filed?.openUrl) {
    const response = await fetch(filed.openUrl);
    if (response.ok)
      return {
        filename: filed.fileName,
        content: new Uint8Array(await response.arrayBuffer()),
      };
  }
  const document = await getContractDocument(contractId);
  if (!document) return null;
  const supabase = await createClient();
  return {
    filename: documentFileName(`${title} v${document.latest.version}`),
    content: await contractPdf({
      title,
      body: document.latest.body,
      language: document.language,
      letterhead: await loadContractLetterhead(supabase, contractId),
    }),
  };
}

/**
 * « Envoyer par e-mail » sent by PDS OS itself (Sacha 22/11/2026: « pourquoi
 * on ne peut pas envoyer depuis PDS OS ? »), for a contract the person signs
 * without a private link (a deal's): the e-mail as shown and edited, from
 * po@ in the member's name, the contract's PDF joined; once it left, the
 * sending is kept (send_contract, « Envoyé par PDS OS », today). Without
 * SMTP, nothing leaves: « disabled ».
 */
export async function emailContractForSignature(
  values: z.input<typeof emailInput>,
): Promise<WriteResult> {
  const t = fr.signedReturns.team;
  const v = emailInput.safeParse(values);
  if (!v.success) return { ok: false, error: t.errors.failed };
  await requireApproved();
  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("title")
    .eq("id", v.data.contractId)
    .maybeSingle();
  if (!contract) return { ok: false, error: fr.contracts.errors.forbidden };
  const file = await contractAttachment(v.data.contractId, contract.title);
  if (!file) return { ok: false, error: fr.contracts.now.sendMail.noFile };
  const [first, ...alsoTo] = v.data.envelope.to;
  const outcome = await emailMessage({
    to: { name: first, email: first },
    alsoTo,
    cc: v.data.envelope.cc,
    bcc: v.data.envelope.bcc,
    subject: v.data.subject,
    text: v.data.message,
    attachments: [
      {
        filename: file.filename,
        content: file.content,
        contentType: "application/pdf",
      },
    ],
  });
  if (outcome !== "sent")
    return {
      ok: false,
      error:
        outcome === "failed"
          ? fr.contracts.now.sendMail.failed
          : fr.contracts.now.sendMail.disabled,
    };
  return sendContractForSignature({
    contractId: v.data.contractId,
    projectId: v.data.projectId,
    via: "other",
    how: "Envoyé par PDS OS",
    on: new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(
      new Date(),
    ),
  });
}
