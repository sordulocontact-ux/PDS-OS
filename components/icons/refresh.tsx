import { Icon, type IconProps } from "nucleo-sharp-essential";

import { SharpStroke } from "./sharp-stroke";

export function IconRefresh(props: IconProps) {
  return (
    <Icon {...props}>
      <SharpStroke>
        <path d="M4 12A8 8 0 0 1 18.93 8" />
        <path d="M20 3V8H15" />
        <path d="M20 12A8 8 0 0 1 5.07 16" />
        <path d="M4 21V16H9" />
      </SharpStroke>
    </Icon>
  );
}
