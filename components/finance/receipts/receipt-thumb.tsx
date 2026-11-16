import { isPhoto, type FinanceProof } from "@/lib/finance/proofs";
import { financeReceipts } from "@/lib/i18n/fr/finance-receipts";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/utils/money";

const t = financeReceipts;

/**
 * The look of a proof on its card (proto, page Justificatifs): a photo
 * shows itself; a PDF, a sheet of paper with its supplier and total, as
 * read. Its kind (PDF, Photo) in the corner. Decorative: the card says the
 * same in words.
 */
export function ReceiptThumb({ proof }: { proof: FinanceProof }) {
  const photo = isPhoto(proof);
  return (
    <div
      aria-hidden
      className="relative grid h-36 place-items-center overflow-hidden border-b border-[color:var(--border-hairline)] bg-[var(--surface-sunken)]"
    >
      {photo && proof.url ? (
        // A signed link to a private file: next/image would not proxy it.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proof.url}
          alt=""
          loading="lazy"
          className="size-full object-cover"
        />
      ) : (
        <div
          className={cn(
            "flex w-28 translate-y-3 flex-col gap-1.5 bg-[var(--surface-raised)] px-2.5 pt-2.5 pb-3 shadow-elevation-card",
            photo && "-rotate-3",
          )}
        >
          <span className="truncate text-micro font-medium">
            {proof.values.vendor ?? proof.fileName}
          </span>
          <Line className="w-[70%]" />
          <Line className="w-[55%]" />
          <Line className="w-[62%]" />
          <span className="border-t border-dashed border-[color:var(--border-default)]" />
          <span className="flex justify-between text-micro tabular-nums">
            <span>TOTAL</span>
            <span>
              {proof.values.amountCents !== null
                ? formatAmount(proof.values.amountCents, { ht: false })
                : ""}
            </span>
          </span>
        </div>
      )}
      <span className="absolute top-2 left-2 rounded-sm border border-[color:var(--border-default)] bg-[var(--surface-raised)] px-1 text-micro text-[color:var(--text-tertiary)]">
        {photo ? t.fileKind.photo : t.fileKind.pdf}
      </span>
    </div>
  );
}

function Line({ className }: { className: string }) {
  return (
    <span
      className={cn("block h-[3px] bg-[var(--border-hairline)]", className)}
    />
  );
}
