import { Icon, type IconProps } from "nucleo-sharp-essential";

import { SharpStroke } from "./sharp-stroke";

/** A spreadsheet: Nucleo's file with a grid in place of its lines. */
export function IconFileSheet(props: IconProps) {
  return (
    <Icon {...props}>
      <SharpStroke>
        <path d="M20 22V2H10.5919L4 8.58984V22H20Z" />
        <path d="M12 2V10H4" />
        <path d="M8 13H16V19H8Z" />
        <path d="M12 13V19" />
        <path d="M8 16H16" />
      </SharpStroke>
    </Icon>
  );
}
