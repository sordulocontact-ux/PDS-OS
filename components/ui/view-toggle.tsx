import { FilterChipLink } from "@/components/ui/filter-chip";

// Views of one list as pills whose choice lives in the URL (?view=…):
// shareable, and the back button works.
export function ViewToggle({
  label,
  options,
}: {
  label: string;
  options: Array<{ href: string; label: string; current: boolean }>;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <FilterChipLink
          key={option.href}
          href={option.href}
          current={option.current}
        >
          {option.label}
        </FilterChipLink>
      ))}
    </nav>
  );
}
