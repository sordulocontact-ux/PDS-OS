import { contracts } from "@/lib/i18n/fr/contracts";
import { formatDate } from "@/lib/release/format";

const fr = { contracts };

// The e-mails of a contract, written by code from what PDS OS knows (who
// signs and their address in the Réseau, their private link, who sends):
// « Envoyer pour signature » and « Relancer ». PDS OS sends none itself
// (lib/utils/mailto.ts). Client-safe, pure.

type Signer = {
  contactId: string;
  name: string;
  kind: "person" | "organization";
  email: string | null;
} | null;

const greetingOf = (signer: Signer) =>
  fr.contracts.now.greeting(
    signer
      ? signer.kind === "person"
        ? (signer.name.split(/\s+/)[0] ?? signer.name)
        : signer.name
      : null,
  );

export function contractMails({
  title,
  dueOn,
  signer,
  link,
  me,
}: {
  title: string;
  dueOn: string | null;
  signer: Signer;
  link: string | null;
  me: string;
}) {
  const t = fr.contracts.now;
  const to = signer && { contactId: signer.contactId, email: signer.email };
  const greeting = greetingOf(signer);
  return {
    send: {
      to,
      link,
      subject: t.send.subject(title),
      message: t.send.body(greeting, title, link, me),
    },
    remind: {
      to,
      link,
      subject: t.remind.subject(title),
      message: t.remind.body(
        greeting,
        title,
        dueOn ? formatDate(dueOn) : null,
        link,
        me,
      ),
    },
  };
}
