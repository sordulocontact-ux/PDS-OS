import { sectionCardClass } from "@/components/ui/section-card";
import { cn } from "@/lib/utils";

// The frame of a PageSection, shared by its collapsible variant. New
// style: its title closer to its content (Sacha 21/11/2026: « les gaps entre
// les titres et section sont trop élevés »).
export const sectionClass = (card: boolean) =>
  cn(
    "flex min-w-0 scroll-mt-6 flex-col gap-5 modern:gap-2",
    card && sectionCardClass,
  );
export const sectionHeaderClass =
  "flex min-h-8 flex-wrap items-center justify-between gap-2";
