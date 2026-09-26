import { Icon, type IconProps } from "nucleo-sharp-essential";

import { SharpStroke } from "./sharp-stroke";

export function IconArrowDown(props: IconProps) {
  return (
    <Icon {...props}>
      <SharpStroke>
        <path d="M12 4V19" />
        <path d="M5 13L12 20L19 13" />
      </SharpStroke>
    </Icon>
  );
}
