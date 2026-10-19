import { Icon, type IconProps } from "nucleo-sharp-essential";

// Six square dots in two columns: the handle of a row to drag.
export function IconGrip(props: IconProps) {
  return (
    <Icon {...props}>
      <g fill="currentColor">
        <rect x="7" y="4" width="3" height="3" />
        <rect x="14" y="4" width="3" height="3" />
        <rect x="7" y="10.5" width="3" height="3" />
        <rect x="14" y="10.5" width="3" height="3" />
        <rect x="7" y="17" width="3" height="3" />
        <rect x="14" y="17" width="3" height="3" />
      </g>
    </Icon>
  );
}
