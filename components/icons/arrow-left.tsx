import { Icon, type IconProps } from "nucleo-sharp-essential";

import { SharpStroke } from "./sharp-stroke";

export function IconArrowLeft(props: IconProps) {
  return (
    <Icon {...props}>
      <SharpStroke>
        <path d="M20 12H5" />
        <path d="M11 5L4 12L11 19" />
      </SharpStroke>
    </Icon>
  );
}
