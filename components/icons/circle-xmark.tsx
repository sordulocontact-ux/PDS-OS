import { Icon, type IconProps } from "nucleo-sharp-essential";

import { SharpStroke } from "./sharp-stroke";

export function IconCircleXmark(props: IconProps) {
  return (
    <Icon {...props}>
      <SharpStroke>
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
        <path d="M15 9L9 15" />
        <path d="M9 9L15 15" />
      </SharpStroke>
    </Icon>
  );
}
