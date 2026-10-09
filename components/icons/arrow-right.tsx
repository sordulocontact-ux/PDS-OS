import { Icon, type IconProps } from "nucleo-sharp-essential";

import { SharpStroke } from "./sharp-stroke";

export function IconArrowRight(props: IconProps) {
  return (
    <Icon {...props}>
      <SharpStroke>
        <path d="M4 12H19" />
        <path d="M13 5L20 12L13 19" />
      </SharpStroke>
    </Icon>
  );
}
