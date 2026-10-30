import { Avatar } from "@/components/ui/avatar";
import { ViewLink } from "@/components/ui/view-link";
import { cn } from "@/lib/utils";

/** The pill of a name (a call's participants, a project's titles). */
export const chipClass =
  "inline-flex h-[1.875rem] max-w-full items-center gap-1.5 rounded-full bg-[var(--surface-sunken)] text-caption font-medium";

/**
 * A name as a pill, in a `FactBlock` (Figma PDS OS 304:20801, the planned
 * call's participants): a person with their avatar, or a record (a title)
 * that opens its page with `href`. Its list: `NameChips`.
 */
export function NameChip({
  name,
  person = false,
  href,
}: {
  name: string;
  person?: boolean;
  href?: string;
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
    </>
  );
  const shape = cn(chipClass, person ? "pr-3 pl-[3px]" : "px-3");
  return href ? (
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
