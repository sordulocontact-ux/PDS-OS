import { cn } from "@/lib/utils";

/**
 * The name of a group in a search's results (the app's ⌘K, Finance's):
 * from the second group on, a hairline above it closes the one before
 * (Sacha 27/11/2026, between « Créer » and « Pages »).
 */
export function SearchGroupLabel({
  first,
  children,
}: {
  first: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      role="presentation"
      className={cn(
        "px-2 pb-1 text-caption text-[color:var(--text-tertiary)]",
        first
          ? "pt-1"
          : "mt-2 border-t border-[color:var(--border-hairline)] pt-3",
      )}
    >
      {children}
    </span>
  );
}
