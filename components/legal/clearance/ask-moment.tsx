"use client";

import { IconXmark } from "nucleo-sharp-essential";
import { useRef, useState } from "react";

import { IconExternalLink } from "@/components/icons";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { StepSection } from "@/components/shell/journey/step-section";
import { usePickerLoad } from "@/components/network/use-picker-load";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { RequiredMark } from "@/components/ui/required-mark";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { removeRightsholder } from "@/lib/legal/clearance/actions";
import { requestClearance } from "@/lib/legal/clearance/flow-actions";
import {
  listClearanceHolders,
  type HolderOption,
} from "@/lib/legal/clearance/holder-actions";
import {
  rightsOf,
  type HolderRole,
  type RightKind,
  type Scope,
} from "@/lib/legal/clearance/matrix";
import type { Clearance } from "@/lib/legal/clearance/types";
import type { NetworkRole } from "@/lib/network/types";
import { isEmail } from "@/lib/utils/email";

import { useLegalAction } from "@/components/legal/use-legal-action";

import { RequestSend, type RequestRecipient } from "./request-send";
import { elementOf, takenOf, usageOf } from "./usage";

const fr = { legalClearance };

// « Rien à sécuriser » is not a scope to ask for: it is under « Autre issue ».
const SCOPE_ORDER: Exclude<Scope, "none">[] = ["both", "work", "master"];
// Who holds a right when the Réseau says nothing of the contact: the
// work's publisher, the original recording's label.
const DEFAULT_ROLE: Record<RightKind, HolderRole> = {
  work: "publisher",
  master: "label",
};
// The structure a new contact of the Réseau starts as, from the panel.
const NETWORK_ROLE_OF: Record<RightKind, NetworkRole> = {
  work: "publisher",
  master: "label",
};
// The SACEM's online repertoire: a work's page names its publisher.
const SACEM_REPERTOIRE = "https://repertoire.sacem.fr/";

/**
 * What the code proposes from the element the dossier names (to correct,
 * never applied without the click that ends the moment): a sample takes
 * the melody and the sound; a topline, an interpolation or a cover is
 * recorded again, so only the work. Anything else: nothing proposed.
 * Decision of 07/10/2026 (docs/ARCHITECTURE.md § 8 sexies): the ticket
 * only says « Le type d'usage détermine les droits ».
 */
function proposedScope(element: string): Scope | null {
  if (element === "sample") return "both";
  if (["topline", "interpolation", "cover"].includes(element)) return "work";
  return null;
}

type Picked = {
  name: string;
  contactId: string | null;
  role: HolderRole;
  email: string | null;
};

/** « Demander » as the panel's own sections, apart enough to read as blocks
 * (Sacha, 07/11/2026: no numbers, no « Demander » title, the gap makes the
 * hierarchy): what is taken (chips, the proposal marked on its chip), who
 * holds each right (the Réseau), then the request as an e-mail PDS OS
 * sends to them (`RequestSend`), or « Je l'ai envoyée autrement ». */
export function AskMoment({
  projectId,
  clearance,
  canEmail,
}: {
  projectId: string;
  clearance: Clearance;
  // PDS OS sends e-mails itself (SMTP set).
  canEmail: boolean;
}) {
  const t = fr.legalClearance.flow;
  const proposal = clearance.scope ? null : proposedScope(clearance.element);
  const [scope, setScope] = useState<Scope | null>(clearance.scope ?? proposal);
  const [picked, setPicked] = useState<Partial<Record<RightKind, Picked>>>({});
  const [tried, setTried] = useState(false);
  // « Envoyer à … » was tried: the addresses it needs are said missing.
  const [triedEmail, setTriedEmail] = useState(false);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const root = useRef<HTMLDivElement>(null);
  const load = usePickerLoad(() => listClearanceHolders(clearance.id));
  const { pending, run } = useLegalAction();

  const rights = rightsOf(scope);
  const known = (right: RightKind) =>
    clearance.holders.filter((h) => h.right === right);
  const lacking = rights.filter((r) => known(r).length === 0 && !picked[r]);
  const [message, setMessage] = useState(() =>
    t.requestTemplate(elementOf(clearance), clearance.work, clearance.title),
  );
  const subject = t.subject(takenOf(clearance));
  // Whom the request goes to: each right's holder, once per contact.
  const recipients = [
    ...new Map(
      rights
        .flatMap((right): RequestRecipient[] =>
          known(right).length > 0
            ? known(right).map((h) => ({
                key: h.contactId ?? `${right}-${h.id}`,
                name: h.name,
                contactId: h.contactId,
                email: h.email,
              }))
            : picked[right]
              ? [
                  {
                    key: picked[right].contactId ?? right,
                    name: picked[right].name,
                    contactId: picked[right].contactId,
                    email: picked[right].email,
                  },
                ]
              : [],
        )
        .map((r) => [r.key, r] as const),
    ).values(),
  ];
  const addressOf = (r: RequestRecipient) =>
    (typed[r.key] ?? r.email ?? "").trim();
  const noAddress = recipients.filter((r) => !isEmail(addressOf(r)));

  function send(byEmail: boolean) {
    if (!scope) return;
    if (lacking.length > 0 || (byEmail && noAddress.length > 0)) {
      setTried(true);
      setTriedEmail(byEmail);
      requestAnimationFrame(() =>
        root.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    run(() =>
      requestClearance({
        projectId,
        clearanceId: clearance.id,
        scope,
        usage: usageOf(clearance),
        holders: rights.flatMap((right) => {
          const h = picked[right];
          return h && known(right).length === 0
            ? [
                {
                  right,
                  name: h.name,
                  contactId: h.contactId,
                  role: h.role,
                },
              ]
            : [];
        }),
        email: byEmail
          ? {
              subject,
              message,
              recipients: recipients.map((r) => ({
                name: r.name,
                email: addressOf(r),
                contactId: r.contactId,
              })),
            }
          : undefined,
      }),
    );
  }

  const holderHint = (right: RightKind) =>
    right === "work" ? (
      <a
        href={SACEM_REPERTOIRE}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 self-start text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)] underline-offset-4 hover:underline"
      >
        {t.holderWhere.work}
        <IconExternalLink className="size-3.5" aria-hidden />
      </a>
    ) : (
      <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
        {t.holderWhere.master}
      </p>
    );

  return (
    <div ref={root} className="flex flex-col gap-4">
      <StepSection title={t.stepScope}>
        <SegmentedControl<Exclude<Scope, "none">>
          aria-label={t.taken(clearance.work)}
          className="self-start"
          value={scope === "none" ? null : scope}
          onChange={(option) => {
            if (!option) return;
            setScope(option);
            setTried(false);
          }}
          options={SCOPE_ORDER.map((option) => ({
            value: option,
            label:
              option === proposal ? (
                <>
                  {t.scopes[option]}
                  <span className="text-[color:var(--text-secondary)]">
                    {" "}
                    · {t.proposedTag}
                  </span>
                </>
              ) : (
                t.scopes[option]
              ),
          }))}
        />
      </StepSection>

      {scope &&
        rights.map((right) => (
          <StepSection
            key={right}
            title={
              <>
                {t.holderOf[right](clearance.work)}
                {known(right).length === 0 && <RequiredMark />}
              </>
            }
          >
            {known(right).length > 0 ? (
              known(right).map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <span className="min-w-0 break-words">
                    <span className="font-medium">{h.name}</span>
                    <span className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
                      {" "}
                      · {fr.legalClearance.roles[h.role as HolderRole]}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.removeHolder(h.name)}
                    disabled={pending}
                    onClick={() =>
                      run(() => removeRightsholder(projectId, h.id))
                    }
                  >
                    <IconXmark aria-hidden />
                  </Button>
                </div>
              ))
            ) : (
              <PersonPickerField<HolderOption>
                refName={`holder-ref-${clearance.id}-${right}`}
                nameName={`holder-${clearance.id}-${right}`}
                legend={t.holderOf[right](clearance.work)}
                hideLegend
                required
                load={load}
                defaultRef={null}
                defaultName={null}
                createRoles={[NETWORK_ROLE_OF[right]]}
                createKind="organization"
                refOfContact={(id) => id}
                onPick={(option, name) =>
                  setPicked((all) => ({
                    ...all,
                    [right]: name.trim()
                      ? {
                          name,
                          contactId: option?.id ?? null,
                          role: option?.role ?? DEFAULT_ROLE[right],
                          email: option?.email ?? null,
                        }
                      : undefined,
                  }))
                }
                error={
                  tried && lacking.includes(right) ? t.holderMissing : undefined
                }
              />
            )}
            {holderHint(right)}
          </StepSection>
        ))}

      {scope && (
        <StepSection title={t.stepSend}>
          <RequestSend
            canEmail={canEmail}
            recipients={recipients}
            typed={typed}
            onType={(key, value) =>
              setTyped((all) => ({ ...all, [key]: value }))
            }
            subject={subject}
            message={message}
            onMessage={setMessage}
            name={`request-${clearance.id}`}
            tried={tried && triedEmail}
            missingCount={
              tried ? lacking.length + (triedEmail ? noAddress.length : 0) : 0
            }
            pending={pending}
            onSend={send}
          />
        </StepSection>
      )}
    </div>
  );
}
