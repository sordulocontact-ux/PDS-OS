"use client";

import {
  type ThemeChoice as Theme,
  useThemeChoice,
} from "@/components/shell/use-theme-choice";
import { SegmentedControl } from "@/components/ui/segmented-control";

/** Paramètres › Apparence: Système, Clair or Sombre, as in the account
 * menu (the same choice, kept by the browser). */
export function ThemeChoice() {
  const theme = useThemeChoice();
  return (
    <SegmentedControl<Theme>
      aria-label={theme.label}
      options={theme.options}
      value={theme.value}
      onChange={(value) => {
        if (value) theme.setValue(value);
      }}
    />
  );
}
