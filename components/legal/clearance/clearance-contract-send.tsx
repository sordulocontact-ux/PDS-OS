"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useLegalAction } from "@/components/legal/use-legal-action";
import { routes } from "@/lib/auth/redirects";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { sendClearanceContract } from "@/lib/legal/clearance/flow-actions";
import type { Clearance } from "@/lib/legal/clearance/types";
import { isEmail } from "@/lib/utils/email";

import { termsLine } from "./clearance-stages";
import { RequestSend, type RequestRecipient } from "./request-send";

const fr = { legalClearance };

/**
 * « Signer », the contract approved and to send (Sacha, 09/11/2026: « on
 * peut envoyer des choses par mail, pourquoi pas le contrat ? »): the same
 * e-mail card as the request — to each rights holder at their address of
 * the Réseau, the contract joined — sent by PDS OS, the holder's reply
 * filed in the borrowing's exchanges. Or « Je l'ai envoyé autrement » and
 * how. A contract with no text yet is said, with the way to its page:
 * PDS OS never writes one.
 */
export function ClearanceContractSend({
  projectId,
  clearance,
  canEmail,
}: {
  projectId: string;
  clearance: Clearance;
  canEmail: boolean;
}) {
  const t = fr.legalClearance.flow;
  const { pending, run } = useLegalAction({ refresh: true });
  const root = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [tried, setTried] = useState(false);
  const [otherwise, setOtherwise] = useState(false);
  const [message, setMessage] = useState(() =>
    t.contractTemplate(clearance.work, termsLine(clearance)),
  );
  const toSend = clearance.contracts.filter(
    (c, i, all) =>
      c.state === "approved" && all.findIndex((x) => x.id === c.id) === i,
  );
  const noText = toSend.find((c) => !c.document);
  // Each holder once, whatever rights they hold.
  const recipients: RequestRecipient[] = [
    ...new Map(
      clearance.holders.map((h) => [
        h.contactId ?? h.id,
        {
          key: h.contactId ?? h.id,
          name: h.name,
          contactId: h.contactId,
          email: h.email,
        },
      ]),
    ).values(),
  ];
  const addressOf = (r: RequestRecipient) =>
    (typed[r.key] ?? r.email ?? "").trim();
  const noAddress = recipients.filter((r) => !isEmail(addressOf(r)));
  const subject = t.contractSubject(clearance.work);

  const declare = (how: string) =>
    run(() =>
      sendClearanceContract({ projectId, clearanceId: clearance.id, how }),
    );
  const ways = (list: readonly string[]) => (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{t.otherwiseHow}</p>
      <div className="flex flex-wrap gap-2">
        {list.map((how) => (
          <Button
            key={how}
            variant="outline"
            disabled={pending}
            onClick={() => declare(how)}
          >
            {how}
          </Button>
        ))}
      </div>
    </div>
  );

  if (noText)
    return (
      <>
        <p className="text-sm text-muted-foreground">{t.noDocument}</p>
        <Button
          className="self-start"
          nativeButton={false}
          render={<Link href={routes.contract(noText.id)} />}
        >
          {t.openToWrite}
        </Button>
        {ways(t.sendBy)}
      </>
    );

  const single = toSend.length === 1 ? toSend[0] : null;
  const attachment = {
    name: toSend.map((c) => c.document!.fileName).join(", "),
    side: single ? (
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={
          single.document!.kind === "generated" ? (
            <a
              href={`${routes.contractDocumentPdf(single.id)}?view=1`}
              target="_blank"
              rel="noreferrer"
            />
          ) : (
            <Link href={routes.contract(single.id)} />
          )
        }
      >
        {t.attachmentSee}
      </Button>
    ) : undefined,
  };

  function send(byEmail: boolean) {
    // Without SMTP, « J'ai envoyé le contrat »: from their own mail app.
    if (!byEmail && !canEmail) return declare(t.sendBy[0]);
    if (!byEmail) return setOtherwise(true);
    if (noAddress.length > 0) {
      setTried(true);
      requestAnimationFrame(() =>
        root.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    run(() =>
      sendClearanceContract({
        projectId,
        clearanceId: clearance.id,
        how: t.sendBy[0],
        email: {
          subject,
          message,
          recipients: recipients.map((r) => ({
            name: r.name,
            email: addressOf(r),
            contactId: r.contactId,
          })),
        },
      }),
    );
  }

  return (
    <div ref={root} className="flex flex-col gap-3">
      <RequestSend
        canEmail={canEmail}
        recipients={recipients}
        typed={typed}
        onType={(key, value) => setTyped((all) => ({ ...all, [key]: value }))}
        subject={subject}
        message={message}
        onMessage={setMessage}
        name={`contract-mail-${clearance.id}`}
        tried={tried}
        missingCount={tried ? noAddress.length : 0}
        pending={pending}
        onSend={send}
        labels={{
          title: t.contractCard,
          ownMail: t.contractOwnMail,
          send: t.contractSent,
          sendTo: t.contractSendTo,
          sent: t.contractSent,
          sentOtherwise: t.contractSentOtherwise,
        }}
        attachment={attachment}
      />
      {canEmail
        ? otherwise && ways(t.sendBy)
        : // The other ways (a signing tool, by hand), the e-mail above.
          ways(t.sendBy.slice(1))}
    </div>
  );
}
