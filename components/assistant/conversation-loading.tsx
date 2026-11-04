import { Skeleton } from "@/components/ui/skeleton";

/**
 * PO's page while it loads: its frame, the history column beside a
 * conversation, so nothing moves when the page arrives (docs/ARCHITECTURE.md
 * § 3 bis). The question box in the middle for a new conversation, at the
 * foot for one `reopened` from the history.
 */
export function ConversationLoading({
  reopened = false,
}: {
  reopened?: boolean;
}) {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-2*var(--shell-inset))]">
      <div className="hidden w-64 shrink-0 flex-col gap-6 border-r px-3 pt-6 md:flex">
        <Skeleton className="h-[var(--density-control-h)] w-full" />
        <div className="grid gap-3 px-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-5 w-11/12" />
        </div>
      </div>
      {reopened ? (
        <div className="flex min-w-0 flex-1 items-end px-4 pb-4 md:px-[var(--page-gutter)] md:pb-6">
          <Skeleton className="mx-auto h-32 w-full max-w-3xl rounded-2xl" />
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 px-4 md:px-[var(--page-gutter)]">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-51 w-full max-w-3xl rounded-2xl" />
        </div>
      )}
    </div>
  );
}
