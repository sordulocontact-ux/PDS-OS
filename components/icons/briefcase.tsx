import { Icon, type IconProps } from "nucleo-sharp-essential";

import { SharpStroke } from "./sharp-stroke";

export function IconBriefcase(props: IconProps) {
  return (
    <Icon {...props}>
      <SharpStroke>
        <path d="M9 7V5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7" />
        <path d="M3 8C3 6.89543 3.89543 6 5 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V8Z" />
        <path d="M3 13H21" />
        <path d="M10 13V14H14V13" />
      </SharpStroke>
    </Icon>
  );
}
