import { Icon, type IconProps } from "nucleo-sharp-essential";

import { SharpStroke } from "./sharp-stroke";

export function IconDisc(props: IconProps) {
  return (
    <Icon {...props}>
      <SharpStroke>
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
        <circle cx="12" cy="12" r="2" />
      </SharpStroke>
    </Icon>
  );
}
