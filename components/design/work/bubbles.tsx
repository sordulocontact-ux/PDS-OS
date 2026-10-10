import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/**
 * A turn of PO in the direct work: what it knows, the question it asks.
 * Written by code (the facts, the questions), never by a model.
 */
export function PoBubble({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex max-w-[95%] items-start gap-3", className)}>
      <span
        aria-hidden
        className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-caption font-semibold text-background"
      >
        {fr.conceptionWork.composer.po}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 text-body-md">
        <span className="sr-only">{fr.conceptionWork.composer.po} : </span>
        {children}
      </div>
    </div>
  );
}

/** What the person answered, on the right like any conversation. */
export function UserBubble({
  children,
  action,
}: {
  children: React.ReactNode;
  // « Modifier », under the answer.
  action?: React.ReactNode;
}) {
  return (
    <div className="ml-auto flex max-w-[85%] flex-col items-end gap-1">
      <p className="rounded-2xl bg-muted px-4 py-3 text-body-md break-words whitespace-pre-wrap">
        <span className="sr-only">{fr.conceptionWork.composer.you} : </span>
        {children}
      </p>
      {action}
    </div>
  );
}
