import { Icon, type IconProps } from "nucleo-sharp-essential";

// Optically centred: the triangle sits 1 px right of the box's centre.
export function IconPlay(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 5V19L19 12L8 5Z" fill="currentColor" />
    </Icon>
  );
}
