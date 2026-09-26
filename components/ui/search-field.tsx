import { IconMagnifier } from "nucleo-sharp-essential";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Pill search field on a soft surface (page Master design). The accessible
// name comes from the caller (aria-label or a <label htmlFor>).
export function SearchField({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  return (
    <div className={cn("relative", className)}>
      <IconMagnifier
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[color:var(--text-primary)]"
      />
      <Input
        type="search"
        autoComplete="off"
        className="h-11 rounded-pill border-transparent bg-[var(--surface-soft)] pr-4 pl-12 text-[length:var(--type-body-lg)] font-medium placeholder:text-[color:var(--text-tertiary)] md:text-[length:var(--type-body-lg)]"
        {...props}
      />
    </div>
  );
}
