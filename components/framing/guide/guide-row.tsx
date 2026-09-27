import { cn } from "@/lib/utils";

/**
 * An outlined option of the guided review; blue once chosen (docs/DESIGN.md
 * § 4, « Sélection »). Shared by the choices, the constraint lines and the
 * role cards so they all read as the same kind of thing.
 */
export const optionClass = (selected: boolean) =>
  cn(
    "flex w-full min-w-0 flex-col items-start gap-1 rounded-2xl border px-4 py-3.5 text-left transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:pointer-events-none",
    selected
      ? "border-[var(--select-border)] bg-[var(--select-bg)]"
      : "border-border bg-background enabled:hover:border-grey-300",
  );

/** Main line of an option, then its source or detail, in one caption line. */
export function OptionContent({
  children,
  detail,
}: {
  children: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <>
      <span className="text-body-md font-semibold break-words text-foreground">
        {children}
      </span>
      {detail && (
        <span className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
          {detail}
        </span>
      )}
    </>
  );
}

/** One choice of a question: a radio, `selected` when picked. */
export function GuideRow({
  children,
  detail,
  selected,
  onSelect,
  disabled,
}: {
  children: React.ReactNode;
  detail?: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={optionClass(selected)}
    >
      <OptionContent detail={detail}>{children}</OptionContent>
    </button>
  );
}
