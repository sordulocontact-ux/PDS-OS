"use client";

import { useThemeChoice } from "@/components/shell/use-theme-choice";
import { FilterChip } from "@/components/ui/filter-chip";

// Theme choice of the mobile drawer, where a menu inside the menu would be
// one step too many: the three options side by side.
export function ThemeChips() {
  const theme = useThemeChoice();
  return (
    <div
      role="group"
      aria-label={theme.label}
      className="flex flex-col gap-2 px-4 py-1"
    >
      <p aria-hidden className="text-caption text-[color:var(--nav-fg-muted)]">
        {theme.label}
      </p>
      <div className="flex flex-wrap gap-2">
        {theme.options.map((option) => (
          <FilterChip
            key={option.value}
            pressed={theme.value === option.value}
            variant="soft"
            onClick={() => theme.setValue(option.value)}
          >
            {option.label}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}
