import { Icon, type IconProps } from "nucleo-sharp-essential";

import { SharpStroke } from "./sharp-stroke";

export function IconArrowUp(props: IconProps) {
  return (
    <Icon {...props}>
      <SharpStroke>
        <path d="M12 20V5" />
        <path d="M5 11L12 4L19 11" />
      </SharpStroke>
    </Icon>
  );
}
