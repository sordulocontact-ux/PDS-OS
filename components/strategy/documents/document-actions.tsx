"use client";

import { IconLink } from "nucleo-sharp-essential";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { fr } from "@/lib/i18n/fr";
import { shareStrategyDocument } from "@/lib/strategy/actions/workflow";

/**
 * Voir · Partager · PDF · Versions of a document version (ticket § 13). The
 * Brief is internal: « Partager » copies its link in the app; the Plan de
 * sortie and the Dossier de presse get a link readable without an account.
 */
export function DocumentActions({
  projectId,
  documentId,
  external,
  canShare,
  viewHref,
  versionsHref,
  pdfHref,
  fileName,
}: {
  projectId: string;
  documentId: string;
  external: boolean;
  canShare: boolean;
  viewHref?: string;
  versionsHref?: string;
  pdfHref: string;
  fileName: string;
}) {
  const t = fr.strategyDocs.actions;
  const [sharing, startSharing] = useTransition();

  const copy = async (url: string, message: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(message);
    } catch {
      toast.error(fr.framing.errors.generic);
    }
  };

  const share = () =>
    startSharing(async () => {
      if (!external) {
        const url = viewHref
          ? new URL(viewHref, window.location.origin).toString()
          : window.location.href;
        return copy(url, t.copied);
      }
      const result = await shareStrategyDocument(projectId, documentId);
      if (!result.ok) return void toast.error(fr.framing.errors[result.error]);
      await copy(
        new URL(result.path, window.location.origin).toString(),
        t.shared,
      );
    });

  return (
    <div className="flex flex-wrap gap-2">
      {viewHref && (
        <Link
          href={viewHref}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {t.view}
        </Link>
      )}
      {(canShare || !external) && (
        <Button size="sm" variant="outline" disabled={sharing} onClick={share}>
          <IconLink aria-hidden />
          {t.share}
        </Button>
      )}
      <PdfExportButton
        href={pdfHref}
        fileName={fileName}
        label={t.pdf}
        pendingLabel={t.exporting}
        failedLabel={t.pdfFailed}
        variant="outline"
        size="sm"
      />
      {versionsHref && (
        <Link
          href={versionsHref}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          {t.versions}
        </Link>
      )}
    </div>
  );
}
