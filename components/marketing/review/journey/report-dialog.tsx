"use client";

import Link from "next/link";

import { Button, buttonVariants, ButtonRoll } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { marketingReview } from "@/lib/i18n/fr/marketing-review";
import { reviewJourney } from "@/lib/i18n/fr/review-journey";

const fr = { dialogs, marketingReview, reviewJourney };

const t = fr.reviewJourney.bilan;
const r = fr.marketingReview.reports;

/**
 * « Voir le rapport » (proto `reportModal`): the frozen version in the wide
 * glass modal, as it was generated (server-rendered, passed as children),
 * then « Exporter en PDF » (the server's PDF, lib/pdf/render.ts) and
 * « Fermer »; the version's page compares it with the previous one.
 */
export default function ReportDialog({
  open,
  onOpenChange,
  title,
  pdf,
  compareHref,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  pdf: { href: string; fileName: string };
  compareHref: string | null;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={fr.dialogs.close}
        className="sm:max-w-[var(--dialog-width-wide)]"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {open && (
          <div className="flex flex-col gap-6">
            {children}
            <div className="flex flex-wrap items-center gap-2">
              <PdfExportButton
                href={pdf.href}
                fileName={pdf.fileName}
                label={t.exportPdf}
                pendingLabel={r.exporting}
                failedLabel={r.exportFailed}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                {t.close}
              </Button>
              {compareHref && (
                <Link
                  href={compareHref}
                  className={buttonVariants({ variant: "ghost" })}
                >
                  <ButtonRoll>{r.compare.choose}</ButtonRoll>
                </Link>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
