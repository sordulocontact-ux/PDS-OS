"use client";

import { IconLink } from "nucleo-sharp-essential";
import { useState, useSyncExternalStore } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { IconBan, IconCircleXmark } from "@/components/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { DocumentCard } from "@/components/ui/document-card";
import { ReasonForm } from "@/components/ui/reason-form";
import { RowActions } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { masterRound } from "@/lib/i18n/fr/master-round";
import { markRoundSent, sendRound } from "@/lib/master-workflow/round-actions";
import type { RoundStepView } from "@/lib/master-workflow/round-step";
import { revokeTransmission } from "@/lib/master-workflow/transmission-actions";
import {
  issueContactLink,
  revokeContactLink,
} from "@/lib/portal/contact-link-actions";
import { formatDay, formatShortDay } from "@/lib/utils/day";

const fr = { masterRound };

const t = fr.masterRound.link;

export type LinkPanelProps = {
  projectId: string;
  stage: "mix" | "mastering";
  engineer: string;
  contactId: string | null;
  email: string | null;
  title: string;
  transmission: {
    id: string;
    // A mastering added to the mix link: sent with it.
    continued: boolean;
    linkSentAt: string | null;
    openedAt: string | null;
    revokedAt: string | null;
    revokeReason: string | null;
    expiresAt: string;
    // Whole days before the package closes (negative once closed).
    daysLeft: number;
  };
  page: RoundStepView["page"];
  canEdit: boolean;
};

const useOrigin = () =>
  useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );

/**
 * « Lien de Karim Haddou » (Figma 378-6581, Sacha 04/11): the engineer's
 * page by project, opened on the package — one link for all PDS expects
 * from them. Its state (sent, opened), the link to copy, « Relancer »,
 * « Nouveau lien », and in « ⋯ » « Retirer le dossier de mixage » (the page
 * stays) or « Révoquer le lien » (the whole page stops), each with why.
 * Under it, until when the package and the link open. A package withdrawn
 * or closed: why, and « Renvoyer le dossier ».
 */
export function LinkPanel(props: LinkPanelProps) {
  const { stage, engineer, transmission: tr, page } = props;
  const origin = useOrigin();
  const [asking, setAsking] = useState<"withdraw" | "revoke" | null>(null);
  const resend = useWriteSubmit(() => undefined, t.resent);
  const write = useWriteSubmit(() => undefined, t.marked);
  const link = page?.link ?? null;
  const url = link?.path && origin ? `${origin}${link.path}` : null;
  const resendButton = props.canEdit && (
    <Button
      variant="outline"
      size="sm"
      className="self-start"
      disabled={resend.pending}
      onClick={() =>
        resend.run(() => sendRound(props.projectId, stage, "", null, t.resent))
      }
    >
      {t.resend}
    </Button>
  );

  const withdrawn = Boolean(tr.revokedAt && tr.revokeReason);
  if (withdrawn || tr.daysLeft < 0)
    return (
      <section className="flex flex-col gap-3" aria-label={t.title(engineer)}>
        <ToneCallout tone="danger">
          {withdrawn
            ? t.withdrawnLine(
                formatShortDay(tr.revokedAt!),
                null,
                tr.revokeReason ?? "",
                engineer,
              )
            : t.expired(formatShortDay(tr.expiresAt))}
        </ToneCallout>
        {resendButton}
        <FormMessage kind="error">{resend.error}</FormMessage>
      </section>
    );

  const sent = link?.sentAt ?? tr.linkSentAt;
  const opened = tr.openedAt ?? link?.openedAt ?? null;
  const [tone, label] = !link
    ? (["neutral", t.states.none] as const)
    : opened
      ? (["success", t.states.opened] as const)
      : sent
        ? (["info", t.states.sent] as const)
        : (["warning", t.states.notSent] as const);

  return (
    <section className="flex flex-col gap-2" aria-label={t.title(engineer)}>
      {tr.daysLeft <= 3 && (
        <ToneCallout tone="warning">
          {t.expires(engineer, tr.daysLeft, formatDay(tr.expiresAt))}
        </ToneCallout>
      )}
      <DocumentCard
        name={t.title(engineer)}
        line={t.line(stage)}
        icon={IconLink}
        action={<StatusBadge tone={tone}>{label}</StatusBadge>}
      >
        {props.canEdit && (
          <div className="flex flex-col gap-3 p-3.5">
            {link ? (
              <div className="flex flex-wrap items-center gap-2">
                {url && (
                  <code className="min-w-0 rounded-full bg-[var(--surface-soft)] px-4 py-1.5 text-[length:var(--type-caption)] break-all">
                    {url}
                  </code>
                )}
                {url && (
                  <CopyButton
                    value={url}
                    label={t.copy}
                    copiedLabel={t.copied}
                    variant="ghost"
                    size="sm"
                  />
                )}
                <span className="ml-auto flex flex-wrap items-center gap-1">
                  {!sent && !tr.continued && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={write.pending}
                      onClick={() =>
                        write.run(() =>
                          markRoundSent(props.projectId, stage, tr.id, link.id),
                        )
                      }
                    >
                      {t.markSent}
                    </Button>
                  )}
                  {url && (
                    <a
                      className={buttonVariants({
                        variant: "ghost",
                        size: "sm",
                      })}
                      href={`mailto:${props.email ?? ""}?subject=${encodeURIComponent(
                        t.remindSubject(props.title),
                      )}&body=${encodeURIComponent(url)}`}
                    >
                      {t.remind}
                    </a>
                  )}
                  {props.contactId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      title={t.renewHint}
                      disabled={write.pending}
                      onClick={() =>
                        write.run(
                          () =>
                            issueContactLink(props.projectId, props.contactId!),
                          t.renewed,
                        )
                      }
                    >
                      {t.renew}
                    </Button>
                  )}
                  <RowActions
                    label={t.more(engineer)}
                    actions={[
                      {
                        key: "withdraw",
                        label: t.withdraw(stage),
                        icon: IconCircleXmark,
                        onSelect: () => setAsking("withdraw"),
                      },
                      {
                        key: "revoke",
                        label: t.revoke,
                        icon: IconBan,
                        onSelect: () => setAsking("revoke"),
                      },
                    ]}
                  />
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[color:var(--text-secondary)]">
                  {t.noLink(engineer)}
                </span>
                {props.contactId && (
                  <Button
                    size="sm"
                    disabled={write.pending}
                    onClick={() =>
                      write.run(
                        () =>
                          issueContactLink(props.projectId, props.contactId!),
                        t.created,
                      )
                    }
                  >
                    {t.create}
                  </Button>
                )}
              </div>
            )}
            {asking === "withdraw" && (
              <ReasonForm
                label={t.withdrawReason}
                submitLabel={t.withdraw(stage)}
                doneMessage={t.withdrawn}
                run={(reason) =>
                  revokeTransmission(props.projectId, tr.id, stage, reason)
                }
                onDone={() => setAsking(null)}
              />
            )}
            {asking === "revoke" && link && (
              <ReasonForm
                label={t.revokeReason}
                hint={t.revokeHint}
                submitLabel={t.revoke}
                doneMessage={t.revoked}
                run={(reason) =>
                  revokeContactLink(props.projectId, link.id, reason)
                }
                onDone={() => setAsking(null)}
              />
            )}
            <FormMessage kind="error">{write.error}</FormMessage>
          </div>
        )}
      </DocumentCard>
      <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
        {t.dates(
          stage,
          formatDay(tr.expiresAt),
          link ? formatDay(link.expiresAt) : null,
        )}
      </p>
    </section>
  );
}
