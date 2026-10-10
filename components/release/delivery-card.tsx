import Link from "next/link";

import { ConfirmOnlineButton } from "@/components/release/confirm-online-button";
import { DeliverButton } from "@/components/release/deliver-button";
import { ReopenDeliveryButton } from "@/components/release/reopen-delivery-button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { DeliveryCheck } from "@/lib/release/delivery";
import type { DeliveryView } from "@/lib/release/delivery-queries";
import { formatDate } from "@/lib/release/format";
import { releaseDeliveryTone } from "@/lib/ui/state-tones";

const t = fr.releaseDelivery;

/**
 * The delivery to the distributor (ticket Juridique 08, MVP): whether it can
 * leave, what blocks it and what remains to follow, then the owner's
 * « Valider la livraison »; once delivered, its trace and going online
 * (detected, or confirmed by hand).
 */
export function DeliveryCard({
  projectId,
  view,
  canEdit,
}: {
  projectId: string;
  view: DeliveryView;
  canEdit: boolean;
}) {
  const { readiness, delivered, online } = view;
  const state = delivered
    ? "delivered"
    : readiness.ready
      ? "ready"
      : "not_ready";
  const open = readiness.blocking.filter((check) => !check.done);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
        <CardAction>
          <StatusBadge tone={releaseDeliveryTone[state]}>
            {state === "delivered"
              ? t.deliveredBadge
              : state === "ready"
                ? t.ready
                : t.notReady}
          </StatusBadge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-5">
        {delivered ? (
          <div className="grid gap-1 text-sm">
            <p className="font-medium">
              {t.delivered(delivered.to, formatDate(delivered.on))}
            </p>
            {delivered.by && (
              <p className="text-muted-foreground">
                {t.recordedBy(delivered.by)}
              </p>
            )}
            {delivered.note && (
              <p className="break-words text-muted-foreground">
                « {delivered.note} »
              </p>
            )}
            {online ? (
              <p className="pt-2">
                <span className="font-medium">
                  {t.online(formatDate(online.since))}
                </span>{" "}
                <span className="text-muted-foreground">
                  ·{" "}
                  {online.manual
                    ? t.onlineConfirmed(online.by ?? "—")
                    : t.onlineDetected}
                </span>
                {online.url && (
                  <>
                    {" "}
                    ·{" "}
                    <a
                      href={online.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4"
                    >
                      {t.onlineUrl}
                    </a>
                  </>
                )}
              </p>
            ) : (
              <p className="pt-2 text-muted-foreground">{t.waitingOnline}</p>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm">
              {readiness.ready ? t.readyBody : t.notReadyBody}
            </p>
            {open.length > 0 && <CheckList checks={open} />}
            <div className="grid gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                {t.remainingTitle}
              </h3>
              <CheckList checks={readiness.remaining} />
            </div>
          </>
        )}

        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {!delivered && readiness.ready && (
              <DeliverButton projectId={projectId} />
            )}
            {delivered && !online && (
              <>
                <ConfirmOnlineButton
                  projectId={projectId}
                  releaseId={view.releaseId}
                  deliveredOn={delivered.on}
                />
                <ReopenDeliveryButton
                  projectId={projectId}
                  releaseId={view.releaseId}
                />
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// One line per check: what, where it stands, where it is done.
function CheckList({ checks }: { checks: DeliveryCheck[] }) {
  return (
    <ul className="divide-y rounded-lg border text-sm">
      {checks.map((check) => (
        <li
          key={check.key}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2.5"
        >
          <span className="grid gap-0.5">
            <span className="font-medium">{check.label}</span>
            <span className="break-words text-muted-foreground">
              {check.detail}
            </span>
          </span>
          <Link
            href={check.href}
            className="text-sm underline underline-offset-4"
          >
            {t.open}
          </Link>
        </li>
      ))}
    </ul>
  );
}
