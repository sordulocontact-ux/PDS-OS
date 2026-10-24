import { FieldError } from "@/components/auth/form-message";
import { fr } from "@/lib/i18n/fr";
import type { Creator, Publisher } from "@/lib/legal/formalities/definition";
import {
  FULL,
  formatShare,
  totalUnits,
  unitsOf,
} from "@/lib/legal/splits/shares";
import { cn } from "@/lib/utils";

/** The Phono shares of the bulletin by category (JUR-23), then their total,
 * which must be exactly 100 % — at the head of « 4. Répartition ». */
export function PhonoTotal({
  id,
  creators,
  publishers,
  error,
}: {
  id: string;
  creators: Creator[];
  publishers: Publisher[];
  error?: string;
}) {
  const t = fr.legalFormalities.creator;
  const sumOf = (list: Array<{ phono: string }>) =>
    totalUnits(list.map((p) => unitsOf(p.phono.replace(",", ".") || "0")));
  const total = sumOf([...creators, ...publishers]);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground tabular-nums">
        {t.totals(formatShare(sumOf(creators)), formatShare(sumOf(publishers)))}
      </span>
      <span
        className={cn(
          "font-medium tabular-nums",
          total !== FULL &&
            (error ? "text-error" : "text-[color:var(--tone-warning-fg)]"),
        )}
      >
        {t.phono} : {formatShare(total)}
      </span>
      <FieldError id={id}>{error}</FieldError>
    </div>
  );
}
