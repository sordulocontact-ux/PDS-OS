"use client";

import { IconCheck } from "nucleo-sharp-essential";
import { useSyncExternalStore, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { ReasonForm } from "@/components/ui/reason-form";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { masterRound } from "@/lib/i18n/fr/master-round";
import { sendRound } from "@/lib/master-workflow/round-actions";
import {
  markTransmissionSent,
  revokeTransmission,
} from "@/lib/master-workflow/transmission-actions";
import { cn } from "@/lib/utils";
import { formatDay, formatShortDay, formatShortInstant } from "@/lib/utils/day";

const fr = { masterRound };

const t = fr.masterRound.link;

export type LinkPanelProps = {
  projectId: string;
  stage: "mix" | "mastering";
  id: string;
  engineer: string;
  email: string | null;
  title: string;
  // « /m/<token> », readable again by the owner; null otherwise.
  path: string | null;
  continued: boolean;
  createdAt: string;
  linkSentAt: string | null;
  openedAt: string | null;
  acknowledgedAt: string | null;
  deliveredAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  expiresAt: string;
  // Whole days before it expires (negative once expired), by the server.
  daysLeft: number;
  canEdit: boolean;
};

const useOrigin = () =>
  useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );

/**
 * « Lien privé de Karim » (proto, VISION-UX rule 19): each step of the link
 * dated (Créé, Envoyé, Ouvert, Pris en charge, Fichier reçu), the link
 * itself with « Copier le lien », « Relancer » (an e-mail to write: PDS OS
 * does not send one yet), « Renouveler le lien », « Révoquer le lien » with
 * its reason, and « Marquer comme envoyé ».
 */
export function LinkPanel(props: LinkPanelProps) {
  const base = useOrigin();
  const [revoking, setRevoking] = useState(false);
  const sent = useWriteSubmit(() => undefined, t.marked);
  const renew = useWriteSubmit(() => undefined, t.renewed);
  const revoked = Boolean(props.revokedAt && props.revokeReason);
  const left = props.daysLeft;
  const url = props.path && base ? `${base}${props.path}` : null;
  const steps = [
    [t.steps.created, props.createdAt],
    [t.steps.sent, props.linkSentAt],
    [t.steps.opened, props.openedAt],
    [t.steps.taken, props.acknowledgedAt],
    [t.steps.received, props.deliveredAt],
  ] as const;
  const renewButton = props.canEdit && (
    <Button
      variant="ghost"
      size="sm"
      disabled={renew.pending}
      onClick={() =>
        renew.run(() =>
          sendRound(props.projectId, props.stage, "", null, t.renewed),
        )
      }
    >
      {t.renew}
    </Button>
  );
  return (
    <section
      className="flex flex-col gap-3"
      aria-label={t.title(props.engineer)}
    >
      <h3 className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold">
        {t.title(props.engineer)}
      </h3>
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {steps.map(([label, at]) => (
          <li key={label} className="flex items-start gap-2">
            <span
              aria-hidden
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 border-dashed border-[color:var(--border-default)]",
                at &&
                  "border-transparent bg-[var(--tone-success-bg)] text-[color:var(--tone-success-fg)]",
              )}
            >
              {at && <IconCheck className="size-3" />}
            </span>
            <span className="flex flex-col text-[length:var(--type-caption)] leading-[var(--type-caption-lh)]">
              <span className="font-semibold">{label}</span>
              <span className="text-[color:var(--text-secondary)]">
                {at ? formatShortInstant(at) : "—"}
              </span>
            </span>
          </li>
        ))}
      </ol>
      {revoked ? (
        <ToneCallout tone="danger">
          {t.revokedLine(
            formatShortDay(props.revokedAt!),
            null,
            props.revokeReason!,
            props.engineer,
          )}
        </ToneCallout>
      ) : left < 0 ? (
        <ToneCallout tone="danger">
          {t.expired(formatShortDay(props.expiresAt))}
        </ToneCallout>
      ) : left <= 3 ? (
        <ToneCallout tone="warning">
          {t.expires(props.engineer, left, formatDay(props.expiresAt))}
        </ToneCallout>
      ) : null}
      {props.continued ? (
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.continued(props.engineer)}
        </p>
      ) : (
        props.canEdit &&
        !revoked && (
          <div className="flex flex-wrap items-center gap-2">
            {url ? (
              <>
                <code className="min-w-0 rounded-lg bg-[var(--surface-soft)] px-2.5 py-1.5 text-[length:var(--type-caption)] break-all">
                  {url}
                </code>
                <CopyButton
                  value={url}
                  label={t.copy}
                  copiedLabel={t.copied}
                  size="sm"
                />
                <a
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                  href={`mailto:${props.email ?? ""}?subject=${encodeURIComponent(
                    t.remindSubject(props.title),
                  )}&body=${encodeURIComponent(url)}`}
                >
                  {t.remind}
                </a>
              </>
            ) : (
              <p className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
                {t.shownOnce}
              </p>
            )}
            {!props.linkSentAt && (
              <Button
                variant="outline"
                size="sm"
                disabled={sent.pending}
                onClick={() =>
                  sent.run(() =>
                    markTransmissionSent(
                      props.projectId,
                      props.id,
                      props.stage,
                    ),
                  )
                }
              >
                {t.markSent}
              </Button>
            )}
            {renewButton}
            {!revoking && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRevoking(true)}
              >
                {t.revoke}
              </Button>
            )}
          </div>
        )
      )}
      {revoked && renewButton}
      {revoking && (
        <ReasonForm
          label={t.revokeReason}
          submitLabel={t.revoke}
          doneMessage={t.revoked}
          run={(reason) =>
            revokeTransmission(props.projectId, props.id, props.stage, reason)
          }
          onDone={() => setRevoking(false)}
        />
      )}
      <FormMessage kind="error">{sent.error ?? renew.error}</FormMessage>
      <p className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
        {t.footer(props.engineer, formatDay(props.expiresAt), props.email)}
      </p>
    </section>
  );
}
