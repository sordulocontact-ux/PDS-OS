import { Icon, type IconProps } from "nucleo-sharp-essential";

import { SharpStroke } from "./sharp-stroke";

export function IconUserPlus(props: IconProps) {
  return (
    <Icon {...props}>
      <SharpStroke>
        <path d="M12 6C12 8.20914 10.2091 10 8 10C5.79086 10 4 8.20914 4 6C4 3.79086 5.79086 2 8 2C10.2091 2 12 3.79086 12 6Z" />
        <path d="M15 21V16.3096C10.647 13.8908 5.353 13.8908 1 16.3096V21H15Z" />
        <path d="M19 6V12" />
        <path d="M16 9H22" />
      </SharpStroke>
    </Icon>
  );
}
