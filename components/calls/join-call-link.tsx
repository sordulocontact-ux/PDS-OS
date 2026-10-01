import { IconUserLaptop } from "nucleo-sharp-essential";

import { buttonVariants } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/**
 * "Rejoindre": opens the call's video link (Meet, Zoom…) in a new tab. In a
 * table row (`inRow`), it sits above the row's stretched link.
 */
export function JoinCallLink({
  url,
  title,
  size = "default",
  inRow = false,
}: {
  url: string;
  title: string;
  size?: "sm" | "default";
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
        buttonVariants({ variant: "outline", size }),
        inRow && "relative z-10",
      )}
    >
      <IconUserLaptop aria-hidden data-icon="inline-start" />
      {t.action}
    </a>
  );
}
