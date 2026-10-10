"use client";

import Link from "next/link";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";

/**
 * Voir · Partager · PDF · Versions of a document version. « Partager »
 * copies a link inside the app for the Brief de sortie (internal: never a
 * public link), or is the external document's public-link button
 * (`share`); the PDF is drawn from the stored version, downloaded.
 */
export function DocumentActions({
  viewHref,
  shareHref,
  pdfHref,
  versionsHref,
  share,
}: {
  viewHref?: string;
  // An app path, copied as a full URL.
  shareHref?: string;
  // An external document shares its public link instead (its own button).
  share?: React.ReactNode;
  pdfHref?: string;
  versionsHref?: string;
}) {
  const t = fr.strategyDocuments.actions;
  const link = buttonVariants({ size: "sm", variant: "outline" });
  return (
    <div className="flex flex-wrap gap-2">
      {viewHref && (
        <Link href={viewHref} className={link}>
          {t.view}
        </Link>
      )}
      {share}
      {!share && shareHref && (
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                new URL(shareHref, window.location.origin).toString(),
              );
              toast.success(t.shared);
            } catch {
              toast.error(fr.framing.errors.generic);
            }
          }}
        >
          {t.share}
        </Button>
      )}
      {pdfHref && (
        <a href={pdfHref} download className={link}>
          {t.pdf}
        </a>
      )}
      {versionsHref && (
        <Link href={versionsHref} className={link}>
          {t.versions}
        </Link>
      )}
    </div>
  );
}
