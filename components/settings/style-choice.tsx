"use client";

import { useSyncExternalStore } from "react";

import {
  setDesignStyle,
  useDesignStyle,
} from "@/components/shell/use-design-style";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { shell } from "@/lib/i18n/fr/shell";
import type { DesignStyle } from "@/lib/ui/design-style";

const fr = { shell };

/**
 * The style of this browser (lib/ui/design-style.ts): the new one or the
 * classic one, while Ibé decides. Switched at once, kept for the next
 * visits. Nothing chosen until hydrated: the server cannot read it.
 */
export function StyleChoice() {
  const t = fr.shell.designStyle;
  const style = useDesignStyle();
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  return (
    <SegmentedControl<DesignStyle>
      aria-label={t.label}
      options={[
        { value: "modern", label: t.modern },
        { value: "classic", label: t.classic },
      ]}
      value={hydrated ? style : null}
      onChange={(value) => {
        if (value) setDesignStyle(value);
      }}
    />
  );
}

function noop() {
  return () => {};
}
