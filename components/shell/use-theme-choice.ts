"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { shell } from "@/lib/i18n/fr/shell";

const fr = { shell };

export type ThemeChoice = "system" | "light" | "dark";

const choices: readonly ThemeChoice[] = ["system", "light", "dark"];

const isChoice = (value: string | undefined): value is ThemeChoice =>
  choices.includes(value as ThemeChoice);

// The theme choice shared by the account menu and the mobile drawer. Null
// until hydrated: the server cannot know the stored choice, so nothing is
// shown as selected rather than the wrong option.
export function useThemeChoice() {
  const { theme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const t = fr.shell.theme;
  return {
    label: t.label,
    options: choices.map((value) => ({ value, label: t[value] })),
    value: hydrated && isChoice(theme) ? theme : null,
    setValue: (value: string) => {
      if (isChoice(value)) setTheme(value);
    },
  };
}

function noop() {
  return () => {};
}
