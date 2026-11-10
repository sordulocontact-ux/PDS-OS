import { IconExternalLink } from "@/components/icons";

import { buttonVariants } from "@/components/ui/button";
import { VersionCard } from "@/components/ui/version-card";
import { laboCaptures } from "@/lib/i18n/fr/labo-captures";

const fr = { laboCaptures };

/**
 * The iCloud link of the iPhone Raccourci « Repérer dans PDS OS »
 * (docs/RACCOURCI-REPERAGE.md), made once in the Raccourcis app. Frozen: a
 * new version of the shortcut is a new link, to put here.
 */
export const SHARE_SHORTCUT_URL: string | null =
  "https://www.icloud.com/shortcuts/e163c98866e6437f876a6b37726ca9cf";

/**
 * « Partager depuis TikTok ou Instagram » of the Repérage: where the team
 * finds the Raccourci and the few gestures that use it. A folding card
 * (VersionCard, Sacha 10/11/2026: a real card, not a text fold), closed:
 * once installed, nobody needs it again. Beside the page's sections: h2.
 */
export function ShareShortcut() {
  const t = fr.laboCaptures.shortcut;
  return (
    <VersionCard title={t.summary} headingLevel={2}>
      <p className="text-sm text-muted-foreground">{t.body}</p>
      {SHARE_SHORTCUT_URL ? (
        <a
          href={SHARE_SHORTCUT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({
            variant: "outline",
            className: "self-start",
          })}
        >
          {t.install}
          <IconExternalLink aria-hidden className="size-4" />
        </a>
      ) : (
        <p className="text-sm text-muted-foreground">{t.unavailable}</p>
      )}
      <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
        {t.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">{t.reelHint}</p>
    </VersionCard>
  );
}
