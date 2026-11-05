"use client";

import { IconLink } from "nucleo-sharp-essential";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { toast } from "@/components/ui/toast";
import { shareFramingBrief } from "@/lib/framing/actions/brief-share";
import { framingGuide } from "@/lib/i18n/fr/framing-guide";

const fr = { framingGuide };

/**
 * The head of the Brief's document card: « Voir le PDF » (made on the
 * server, lib/pdf/render.ts, downloaded as a file) and « Copier le lien »:
 * a link that opens the PDF of the latest version sent, without an account
 * (retour d'Ibé du 02/11/2026, /b/[token]), for the owner and the direction.
 */
export function BriefActions({
  projectId,
  pdfHref,
  fileName,
  canShare,
}: {
  projectId: string;
  pdfHref: string;
  fileName: string;
  canShare: boolean;
}) {
  const t = fr.framingGuide.brief;
  const [pending, start] = useTransition();
  return (
    <>
      {canShare && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() =>
            start(async () => {
              const result = await shareFramingBrief(projectId);
              if (!result.ok) return void toast.error(t.shareFailed);
              try {
                await navigator.clipboard.writeText(result.url);
                toast.success(t.copied);
              } catch {
                toast.message(t.shareManual(result.url));
              }
            })
          }
        >
          <IconLink aria-hidden />
          {pending ? t.sharing : t.share}
        </Button>
      )}
      <PdfExportButton
        href={pdfHref}
        fileName={fileName}
        label={t.print}
        pendingLabel={t.exporting}
        failedLabel={t.pdfFailed}
        variant="outline"
        size="sm"
      />
    </>
  );
}
