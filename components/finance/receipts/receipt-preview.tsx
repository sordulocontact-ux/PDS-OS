import { IconExternalLink } from "@/components/icons";
import { isPhoto, type FinanceProof } from "@/lib/finance/proofs";
import { financeReceipts } from "@/lib/i18n/fr/finance-receipts";

const t = financeReceipts.sheet;

/**
 * The document itself in the sheet: a photo as an image, a PDF in the
 * browser's own reader, with a link to open the file whole. Its signed link
 * lasts the visit (lib/finance/proof-queries.ts).
 */
export function ReceiptPreview({ proof }: { proof: FinanceProof }) {
  if (!proof.url) return null;
  return (
    <figure className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[var(--surface-sunken)]">
        {isPhoto(proof) ? (
          // A signed link to a private file: next/image would not proxy it.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proof.url}
            alt={t.preview}
            className="mx-auto max-h-96 w-auto object-contain"
          />
        ) : (
          <iframe
            src={proof.url}
            title={t.preview}
            className="block h-96 w-full"
          />
        )}
      </div>
      <figcaption>
        <a
          href={proof.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-caption text-[color:var(--text-secondary)] underline underline-offset-4"
        >
          <IconExternalLink aria-hidden className="size-3.5" />
          {t.openFile}
        </a>
      </figcaption>
    </figure>
  );
}
