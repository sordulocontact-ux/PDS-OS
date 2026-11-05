"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DialogButton } from "@/components/ui/dialog-button";
import { useShowLinks } from "@/components/ui/one-time-links";
import {
  acceptTerms,
  prepareAgreement,
  revokeAgreement,
} from "@/lib/activations/influence/negotiation-actions";
import { activationInfluence } from "@/lib/i18n/fr/activation-influence";
import { activationWork } from "@/lib/i18n/fr/activation-work";
import { activations } from "@/lib/i18n/fr/activations";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { mailtoHref } from "@/lib/utils/mailto";

import { ProposalForm } from "./proposal-form";

const fr = { dialogs, activations, activationWork, activationInfluence };

const t = fr.activationInfluence;

export function AddProposalButton(props: {
  projectId: string;
  activationId: string;
  targetId: string;
}) {
  return (
    <DialogButton
      label={t.negotiation.add}
      icon={IconPlus}
      title={t.negotiation.addTitle}
      description={t.negotiation.addDescription}
      wide
    >
      {(close) => <ProposalForm {...props} onDone={close} />}
    </DialogButton>
  );
}

export function AcceptTermsButton({
  projectId,
  proposalId,
}: {
  projectId: string;
  proposalId: string;
}) {
  return (
    <ConfirmButton
      label={t.negotiation.accept}
      variant="default"
      title={t.negotiation.acceptTitle}
      body={t.negotiation.acceptBody}
      confirmLabel={t.negotiation.accept}
      pendingLabel={fr.activations.saving}
      done={t.negotiation.accepted}
      run={() => acceptTerms({ projectId, id: proposalId })}
    />
  );
}

/** « Préparer le lien d'accord » : the link is shown once, to copy or open in
 * the mail app ; PDS OS sends nothing. */
export function PrepareAgreementButton({
  projectId,
  proposalId,
  campaign,
  email,
}: {
  projectId: string;
  proposalId: string;
  campaign: string;
  email: string | null;
}) {
  const showLinks = useShowLinks();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const a = t.agreement;
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        {a.prepare}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          setError(null);
          setOpen(next);
        }}
        title={a.prepareTitle}
        description={a.prepareBody}
        cancelLabel={fr.dialogs.cancel}
        closeLabel={fr.dialogs.close}
        confirmLabel={a.prepare}
        pendingLabel={fr.activations.saving}
        pending={pending}
        error={error}
        onConfirm={() =>
          startTransition(async () => {
            const result = await prepareAgreement({
              projectId,
              id: proposalId,
            });
            if (!result.ok) return setError(result.error);
            setOpen(false);
            // PDS OS e-mailed the creator and declared it sent.
            if (result.emailed === "sent")
              return void toast.success(a.email.sent);
            if (result.emailed === "failed") toast.warning(a.email.failed);
            showLinks({
              title: a.linkTitle,
              description: a.linkDescription,
              copyLabel: fr.activationWork.messages.copy,
              copiedLabel: fr.activationWork.messages.copied,
              closeLabel: fr.dialogs.close,
              links: [
                {
                  key: "agreement",
                  label: a.linkTitle,
                  url: result.url,
                  email: email
                    ? {
                        href: mailtoHref(
                          email,
                          a.mailSubject(campaign),
                          a.mailBody(result.url),
                        ),
                        label: fr.activationWork.messages.mailto,
                      }
                    : undefined,
                },
              ],
            });
          })
        }
      />
    </>
  );
}

export function RevokeAgreementButton({
  projectId,
  agreementId,
}: {
  projectId: string;
  agreementId: string;
}) {
  return (
    <ConfirmButton
      label={t.agreement.revoke}
      size="xs"
      variant="ghost"
      title={t.agreement.revoke}
      body={t.agreement.prepareBody}
      confirmLabel={t.agreement.revoke}
      pendingLabel={fr.activations.saving}
      done={t.agreement.revoked}
      run={() => revokeAgreement({ projectId, id: agreementId })}
    />
  );
}
