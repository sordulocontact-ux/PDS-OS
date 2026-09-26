import { Icon, type IconProps } from "nucleo-sharp-essential";

import { SharpStroke } from "./sharp-stroke";

export function IconCopy(props: IconProps) {
  return (
    <Icon {...props}>
      <SharpStroke>
        <path d="M8 8H21V21H8V8Z" />
        <path d="M16 4V3H3V16H4" />
      </SharpStroke>
    </Icon>
  );
}
