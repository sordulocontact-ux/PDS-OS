import { Icon, type IconProps } from "nucleo-sharp-essential";

import { SharpStroke } from "./sharp-stroke";

export function IconDownload(props: IconProps) {
  return (
    <Icon {...props}>
      <SharpStroke>
        <path d="M12 3V15" />
        <path d="M7 10L12 15L17 10" />
        <path d="M4 15V20H20V15" />
      </SharpStroke>
    </Icon>
  );
}
