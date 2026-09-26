import { Icon, type IconProps } from "nucleo-sharp-essential";

import { SharpStroke } from "./sharp-stroke";

export function IconMenu(props: IconProps) {
  return (
    <Icon {...props}>
      <SharpStroke>
        <path d="M3 5H21" />
        <path d="M3 12H21" />
        <path d="M3 19H21" />
      </SharpStroke>
    </Icon>
  );
}
