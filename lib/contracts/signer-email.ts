import "server-only";

import { emailContact } from "@/lib/email/contact-email";
import { contracts } from "@/lib/i18n/fr/contracts";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/release/format";

const t = contracts.now.auto;

/**
 * E-mails the person who signs a contract of the Juridique (Sacha,
 * 05/11/2026: « l'e-mail automatique partout »): their page by project
 * carries the contract to read, sign and deposit. `send` after « Envoyer
 * pour signature » on their link, `remind` for « Relancer ». Nothing when
 * PDS OS cannot (no SMTP, address, link, or a contract outside a
 * project's Juridique): the prepared e-mail stays, as before. Never fails
 * the gesture.
 */
export async function emailContractSigner(
  contractId: string,
  kind: "send" | "remind",
): Promise<"sent" | "failed" | "disabled"> {
  const supabase = await createClient();
  const { data: need } = await supabase
    .from("legal_agreement_needs")
    .select("contact_id, project_id")
    .eq("contract_id", contractId)
    .maybeSingle();
  if (!need) return "disabled";
  const { data: contract } = await supabase
    .from("contracts")
    .select("title, due_on")
    .eq("id", contractId)
    .maybeSingle();
  if (!contract) return "disabled";
  return emailContact({
    projectId: need.project_id,
    contactId: need.contact_id,
    subject:
      kind === "send"
        ? t.sendSubject(contract.title)
        : t.remindSubject(contract.title),
    body:
      kind === "send"
        ? t.sendBody(contract.title)
        : t.remindBody(
            contract.title,
            contract.due_on ? formatDate(contract.due_on) : null,
          ),
    open: t.open,
  });
}
