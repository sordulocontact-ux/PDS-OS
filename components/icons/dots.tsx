import { Icon, type IconProps } from "nucleo-sharp-essential";

// Three square dots: the "⋯" of a row's actions menu.
export function IconDots(props: IconProps) {
  return (
    <Icon {...props}>
      <g fill="currentColor">
        <rect x="3" y="10" width="4" height="4" />
        <rect x="10" y="10" width="4" height="4" />
        <rect x="17" y="10" width="4" height="4" />
      </g>
    </Icon>
  );
}
