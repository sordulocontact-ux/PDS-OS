import type { BudgetFamily } from "@/lib/budget/types";
import { cn } from "@/lib/utils";
import { postShade } from "@/lib/ui/category-hues";

/** A poste with its small square of colour (as the proto): the same shade in
 * the spends' table, a spend's sheet and the split by poste. */
export function PostLabel({
  family,
  label,
}: {
  family: BudgetFamily | null;
  label: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className={cn("size-2.5 shrink-0 rounded-xs", postShade(family).fill)}
      />
      <span className="truncate">{label}</span>
    </span>
  );
}
