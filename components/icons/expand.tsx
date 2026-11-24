import { Icon, type IconProps } from "nucleo-sharp-essential";

import { SharpStroke } from "./sharp-stroke";

/** Two arrows apart: a panel opened as its full page. */
export function IconExpand(props: IconProps) {
  return (
    <Icon {...props}>
      <SharpStroke>
        <path d="M14 4H20V10" />
        <path d="M20 4L13 11" />
        <path d="M10 20H4V14" />
        <path d="M4 20L11 13" />
      </SharpStroke>
    </Icon>
  );
}
