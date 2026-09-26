import { Icon, type IconProps } from "nucleo-sharp-essential";

import { SharpStroke } from "./sharp-stroke";

export function IconExternalLink(props: IconProps) {
  return (
    <Icon {...props}>
      <SharpStroke>
        <path d="M11 4H4V20H20V13" />
        <path d="M13 11L19.5 4.5" />
        <path d="M14 4H20V10" />
      </SharpStroke>
    </Icon>
  );
}
