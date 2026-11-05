"use client";

import { CloseCallButton } from "@/components/calls/closure/close-call-button";
import { ShareReportForm } from "@/components/calls/closure/share-report-form";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { routes } from "@/lib/auth/redirects";
import type { Unreviewed } from "@/lib/calls/closure";
import type { CallClosure } from "@/lib/calls/closure-queries";
import type { Member } from "@/lib/framing/related";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

/**
 * What follows a closed call (PROJ-AMEL-01), in its « Maintenant »: share
 * the frozen report (members told; outside addresses e-mailed by PDS OS when
 * its e-mail is on, else written from one's own mailbox), its PDF, and
 * « Corriger le compte rendu » (next version).
 */
export function ClosureActions({
  call,
  latest,
  unreviewed,
  canEdit,
  members,
  guestEmails,
  emailEnabled,
}: {
  call: { id: string; title: string; occurredAt: string };
  latest: CallClosure;
  unreviewed: Unreviewed;
  canEdit: boolean;
  members: Member[];
  guestEmails: string[];
  emailEnabled: boolean;
}) {
  const t = fr.calls.closure;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && (
        <DialogButton
          label={t.share}
          variant="default"
          size="default"
          title={t.shareTitle}
          description={emailEnabled ? t.shareBody : t.shareBodyManual}
          wide
        >
          {(close) => (
            <ShareReportForm
              call={call}
              closure={latest}
              members={members}
              guestEmails={guestEmails}
              onDone={close}
            />
          )}
        </DialogButton>
      )}
      <a
        href={routes.callReportPdf(call.id, latest.version, "full")}
        className={buttonVariants({ variant: "outline" })}
      >
        <ButtonRoll>{t.pdf}</ButtonRoll>
      </a>
      {canEdit && (
        <CloseCallButton callId={call.id} unreviewed={unreviewed} closed />
      )}
    </div>
  );
}
