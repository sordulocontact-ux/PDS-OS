import { sectionCardClass } from "@/components/ui/section-card";
import { cn } from "@/lib/utils";

// The frame of a PageSection, shared by its collapsible variant.
export const sectionClass = (card: boolean) =>
  cn("flex min-w-0 scroll-mt-6 flex-col gap-5", card && sectionCardClass);
export const sectionHeaderClass =
  "flex min-h-8 flex-wrap items-center justify-between gap-2";
