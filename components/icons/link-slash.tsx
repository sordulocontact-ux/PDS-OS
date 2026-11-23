import { Icon, type IconProps } from "nucleo-sharp-essential";

import { SharpStroke } from "./sharp-stroke";

/** A broken link: « Retirer le lien » (Sacha 23/11/2026: a ✕ said remove). */
export function IconLinkSlash(props: IconProps) {
  return (
    <Icon {...props}>
      <SharpStroke>
        <path d="M9 7.5 11.5 5a4.24 4.24 0 0 1 6 6L15 13.5" />
        <path d="M15 16.5 12.5 19a4.24 4.24 0 0 1-6-6L9 10.5" />
        <path d="M4 4 20 20" />
      </SharpStroke>
    </Icon>
  );
}
