import { Icon, type IconProps } from "nucleo-sharp-essential";

import { SharpStroke } from "./sharp-stroke";

export function IconArrowUpRight(props: IconProps) {
  return (
    <Icon {...props}>
      <SharpStroke>
        <path d="M6 18L17 7" />
        <path d="M8 6H18V16" />
      </SharpStroke>
    </Icon>
  );
}
