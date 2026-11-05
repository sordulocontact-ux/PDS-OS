import { IconUserLaptop } from "nucleo-sharp-essential";

import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { calls } from "@/lib/i18n/fr/calls";
import { cn } from "@/lib/utils";

const fr = { calls };

/**
 * "Rejoindre": opens the call's video link (Meet, Zoom…) in a new tab. In a
 * table row (`inRow`), it sits above the row's stretched link.
 */
export function JoinCallLink({
  url,
  title,
  size = "default",
  variant = "outline",
  inRow = false,
}: {
  url: string;
  title: string;
  size?: "sm" | "default";
  // `default`: the page's main action (a call's details).
  variant?: "outline" | "default";
  inRow?: boolean;
}) {
  const t = fr.calls.join;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.label(title)}
      className={cn(
        buttonVariants({ variant, size }),
        inRow && "relative z-10",
      )}
    >
      <ButtonRoll>
        <IconUserLaptop aria-hidden data-icon="inline-start" />
        {t.action}
      </ButtonRoll>
    </a>
  );
}
