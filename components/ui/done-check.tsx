import { IconCheck } from "nucleo-sharp-essential";

import { moduleFrame } from "@/lib/i18n/fr/module-frame";

const fr = { moduleFrame };

/**
 * « Fait » as a green round check, 16 px, before a label: a Marketing
 * sub-module done, in its pill and in the trail's switcher. Its accessible
 * name says « fait ».
 */
export function DoneCheck() {
  return (
    <span
      className="grid size-4 shrink-0 place-items-center rounded-full bg-[var(--tone-success-bg)] text-[color:var(--tone-success-fg)]"
      aria-label={fr.moduleFrame.done}
      role="img"
    >
      <IconCheck aria-hidden className="size-3" />
    </span>
  );
}
