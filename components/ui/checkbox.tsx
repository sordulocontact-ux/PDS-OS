import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// The app's checkbox, after the Figma "Checkbox base" (PDS OS, 49:12665): a
// native input restyled, so forms, refs and `indeterminate` work unchanged.
// Grey outline at rest; selection blue outline + pale fill when hovered,
// focused, ticked or half-ticked; grey once disabled. Focus ring = the global
// :focus-visible outline (docs/DESIGN.md § 3 bis).
const boxVariants = cva(
  "peer col-start-1 row-start-1 m-0 cursor-pointer appearance-none border border-[color:var(--border-default)] bg-[var(--control-bg)] transition-colors duration-150 ease-out checked:border-selection checked:bg-selection-bg indeterminate:border-selection indeterminate:bg-selection-bg focus-visible:border-selection enabled:hover:border-selection enabled:hover:bg-selection-bg disabled:cursor-not-allowed disabled:border-[color:var(--border-default)] disabled:bg-[var(--surface-soft)]",
  {
    variants: {
      size: {
        sm: "size-4 rounded-sm",
        md: "size-5 rounded-md",
      },
    },
    defaultVariants: { size: "sm" },
  }
);

const markClass =
  "pointer-events-none col-start-1 row-start-1 text-selection peer-disabled:text-[color:var(--text-tertiary)]";

const markSize = { sm: "size-3", md: "size-3.5" } as const;

type CheckboxProps = Omit<React.ComponentProps<"input">, "type" | "size"> &
  VariantProps<typeof boxVariants>;

// `className` goes on the wrapper (margins, shrink), never on the box.
export function Checkbox({ className, size, ...props }: CheckboxProps) {
  const s = size ?? "sm";
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center",
        className
      )}
    >
      <input type="checkbox" className={boxVariants({ size: s })} {...props} />
      <CheckboxMark
        kind="check"
        className={cn(
          markClass,
          markSize[s],
          "hidden peer-checked:block peer-indeterminate:hidden"
        )}
      />
      <CheckboxMark
        kind="minus"
        className={cn(markClass, markSize[s], "hidden peer-indeterminate:block")}
      />
    </span>
  );
}

// The tick or the dash of a checkbox, also drawn by SelectItem's checkbox.
export function CheckboxMark({
  kind,
  className,
}: {
  kind: "check" | "minus";
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={kind === "check" ? "M10 3 4.5 8.5 2 6" : "M2.5 6h7"} />
    </svg>
  );
}
