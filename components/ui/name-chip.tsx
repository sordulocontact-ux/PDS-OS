import { IconXmark } from "nucleo-sharp-essential";

import { Avatar } from "@/components/ui/avatar";
import { ViewLink } from "@/components/ui/view-link";
import { cn } from "@/lib/utils";

/** The pill of a name (a call's participants, a project's titles). */
export const chipClass =
  "inline-flex h-[1.875rem] max-w-full items-center gap-1.5 rounded-full bg-[var(--surface-sunken)] text-caption font-medium";

/**
 * A name as a pill, in a `FactBlock` (Figma PDS OS 304:20801, the planned
 * call's participants): a person with their avatar, or a record (a title)
 * that opens its page with `href`. Its list: `NameChips`. `onRemove` (with
 * `removeLabel`, « Retirer X »): a ✕ in the pill, for a list being edited
 * (the guests of a collective); it makes a pill of text, without `href`.
 */
export function NameChip({
  name,
  person = false,
  href,
  onRemove,
  removeLabel,
}: {
  name: string;
  person?: boolean;
  href?: string;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  const body = (
    <>
      {person && (
        <Avatar
          name={name}
          pictureUrl={null}
          className="size-6 bg-[var(--surface-raised)]"
        />
      )}
      <span className="truncate">{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? name}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[color:var(--text-secondary)] hover:bg-[var(--surface-pressed)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:outline-none"
        >
          <IconXmark aria-hidden className="size-3.5" />
        </button>
      )}
    </>
  );
  const shape = cn(
    chipClass,
    person ? "pr-3 pl-[3px]" : "px-3",
    onRemove && "pr-1",
  );
  return href && !onRemove ? (
    <ViewLink
      href={href}
      className={cn(shape, "hover:bg-[var(--surface-pressed)]")}
    >
      {body}
    </ViewLink>
  ) : (
    <span className={shape}>{body}</span>
  );
}

/** Pills in a row that wraps. */
export function NameChips({ children }: { children: React.ReactNode }) {
  return <span className="flex flex-wrap gap-1.5">{children}</span>;
}
