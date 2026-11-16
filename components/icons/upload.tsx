import { Icon, type IconProps } from "nucleo-sharp-essential";

import { SharpStroke } from "./sharp-stroke";

/** Import, upload: the download's arrow turned up (drawn here, not a Nucleo
 * icon, so outside the licence's count). */
export function IconUpload(props: IconProps) {
  return (
    <Icon {...props}>
      <SharpStroke>
        <path d="M12 15V3" />
        <path d="M7 8L12 3L17 8" />
        <path d="M4 15V20H20V15" />
      </SharpStroke>
    </Icon>
  );
}
