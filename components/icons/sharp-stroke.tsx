import type { ReactNode } from "react";

/** Stroke settings shared by every Nucleo Sharp icon (docs/DESIGN.md § 1). */
export function SharpStroke({ children }: { children: ReactNode }) {
  return (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeMiterlimit={10}
    >
      {children}
    </g>
  );
}
