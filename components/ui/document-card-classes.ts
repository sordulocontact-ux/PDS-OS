import { cn } from "@/lib/utils";

// The frame and the head of a DocumentCard, shared by its folding variant.
export const documentCardClass =
  "flex min-w-0 flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)] bg-card";
export const documentHeadClass = (body: boolean) =>
  cn(
    "flex flex-wrap items-center gap-3 bg-[var(--surface-soft)] p-3.5",
    body && "border-b border-[color:var(--border-hairline)]",
  );
