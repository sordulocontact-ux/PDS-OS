import { Icon, type IconProps } from "nucleo-sharp-essential";

import { SharpStroke } from "./sharp-stroke";

// A window with a narrow left panel: the standard pictogram for toggling a
// sidebar (VS Code, Figma…), used both to collapse and to expand — same
// picture either way, only the position changes (components/shell/sidebar.tsx).
export function IconSidebar(props: IconProps) {
  return (
    <Icon {...props}>
      <SharpStroke>
        <path d="M3 5H21V19H3V5Z" />
        <path d="M9 5V19" />
      </SharpStroke>
    </Icon>
  );
}
