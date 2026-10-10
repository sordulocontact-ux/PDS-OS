import { fr } from "@/lib/i18n/fr";
import {
  correctionGroups,
  correctionsText,
} from "@/lib/production/post/corrections";
import { timecodeLabel } from "@/lib/production/post/labels";
import type { PostVersion } from "@/lib/production/post/types";

import { CopyTextButton } from "./copy-text-button";

const t = fr.productionPost;

/**
 * « Corrections à transmettre »: the feedback still open or acknowledged,
 * grouped by category by the code (the reviewers' own words, never
 * rewritten), with the text to copy for the provider. Nothing when none.
 */
export function CorrectionsBlock({ version }: { version: PostVersion }) {
  const groups = correctionGroups(version.comments);
  if (groups.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-sm font-semibold">{t.corrections.title}</h4>
          <p className="text-sm text-muted-foreground">
            {t.corrections.description}
          </p>
        </div>
        <CopyTextButton
          text={correctionsText(version, groups)}
          label={t.corrections.copy}
          copied={t.corrections.copied}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.category} className="flex flex-col gap-1">
            <h5 className="text-sm text-muted-foreground">
              {t.comments.categories[g.category]}
            </h5>
            <ul className="flex flex-col gap-1 text-sm">
              {g.comments.map((c) => (
                <li key={c.id} className="break-words">
                  <span className="font-semibold tabular-nums">
                    {timecodeLabel(c.timecodeMs)}
                  </span>
                  {" — "}
                  {c.body}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
