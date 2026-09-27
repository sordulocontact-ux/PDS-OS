import { cn } from "@/lib/utils";

// One tab of a TabBar (docs/DESIGN.md § 4, « Onglets »): full ink when
// active, grey otherwise. The underline is the bar's sliding indicator.
export const tabLinkClass = (active: boolean) =>
  cn(
    "flex h-11 items-center gap-1.5 px-3 text-sm font-medium whitespace-nowrap no-underline transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
  );
