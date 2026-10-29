import { IconMagnifier } from "nucleo-sharp-essential";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// The box of the list toolbar's controls (search, filter selects), the same
// as a form field: shared so they stay one height, one outline, one type.
export const FIELD_CONTROL =
  "h-[var(--density-control-h)] rounded-lg border border-input bg-[var(--control-bg)] text-[length:var(--type-body-md)] font-medium placeholder:text-[color:var(--text-tertiary)] md:text-[length:var(--type-body-md)]";

// Search field drawn like every field of the app (Sacha 29/10): outlined, on
// the control surface, rounded-lg, 40 px high, 16 px text. The accessible
// name comes from the caller (aria-label or a <label htmlFor>).
export function SearchField({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  return (
    <div className={cn("relative", className)}>
      <IconMagnifier
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[color:var(--text-secondary)]"
      />
      <Input
        type="search"
        autoComplete="off"
        className={FIELD_CONTROL + " pr-3 pl-9"}
        {...props}
      />
    </div>
  );
}
