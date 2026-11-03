"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { useShowLinks } from "@/components/ui/one-time-links";
import { ToneCallout } from "@/components/ui/tone-callout";
import { productionPreprod } from "@/lib/i18n/fr/production-preprod";
import {
  createCallSheetLink,
  publishCallSheet,
} from "@/lib/production/preprod/actions-call-sheet-publish";
import type { CallSheetGap } from "@/lib/production/preprod/call-sheet-snapshot";

const fr = { productionPreprod };

const t = fr.productionPreprod.callSheet.publish;

/**
 * The call sheet's diffusion (PROD-016): what is still missing, the
 * versions published, « Diffuser la Vn » and the team's stable link (with
 * a ready e-mail to the team's known addresses).
 */
export function CallSheetPublish({
  projectId,
  deliverableId,
  sheetId,
  deliverableTitle,
  gaps,
  versions,
  changedSince,
  emails,
  canOrganize,
}: {
  projectId: string;
  deliverableId: string;
  sheetId: string;
  deliverableTitle: string;
  gaps: CallSheetGap[];
  // Newest first, already formatted.
  versions: { number: number; line: string }[];
  // The sheet changed after the last version.
  changedSince: boolean;
  emails: string[];
  canOrganize: boolean;
}) {
  const showLinks = useShowLinks();
  const [pending, setPending] = useState(false);
  const next = (versions[0]?.number ?? 0) + 1;

  async function link() {
    setPending(true);
    const result = await createCallSheetLink({ projectId, sheetId });
    setPending(false);
    if (!result.ok) return void toast.error(result.error);
    const url = `${window.location.origin}/fs/${result.token}`;
    showLinks({
      title: t.linkTitle,
      description: t.linkDescription,
      links: [
        {
          key: "call-sheet",
          label: t.linkLabel,
          url,
          ...(emails.length > 0
            ? {
                email: {
                  href: `mailto:${emails.join(",")}?subject=${encodeURIComponent(
                    t.emailSubject(deliverableTitle),
                  )}&body=${encodeURIComponent(url)}`,
                  label: t.email,
                },
              }
            : {}),
        },
      ],
      copyLabel: t.copy,
      copiedLabel: t.copied,
      closeLabel: t.close,
    });
  }

  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="call-sheet-publish"
    >
      <div className="flex flex-col gap-0.5">
        <h3 id="call-sheet-publish" className="text-base font-semibold">
          {t.title}
        </h3>
        <p className="text-sm text-muted-foreground">{t.hint}</p>
      </div>
      {gaps.length > 0 ? (
        <ToneCallout tone="warning">
          {t.gapsTitle} {gaps.map((g) => t.gaps[g]).join(", ")}.
        </ToneCallout>
      ) : (
        <p className="text-sm">{t.ready}</p>
      )}
      {changedSince && <ToneCallout tone="info">{t.changedSince}</ToneCallout>}
      {canOrganize && (
        <div className="flex flex-wrap gap-2">
          <ConfirmButton
            label={t.button(next)}
            variant="default"
            title={t.confirmTitle(next)}
            body={t.confirmBody}
            confirmLabel={t.button(next)}
            pendingLabel={t.pending}
            done={t.done}
            run={() => publishCallSheet({ projectId, deliverableId })}
          />
          {versions.length > 0 && (
            <Button
              variant="outline"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={link}
            >
              {t.link}
            </Button>
          )}
        </div>
      )}
      {versions.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t.versions}
          </span>
          <ul className="flex flex-col gap-0.5 text-sm">
            {versions.map((v) => (
              <li key={v.number}>{v.line}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
