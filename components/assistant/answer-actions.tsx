"use client";

import { IconChevronDown } from "nucleo-sharp-essential";
import Link from "next/link";
import { useId, useState } from "react";

import { plainText } from "@/components/assistant/tool-output";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { groupSources, type Source } from "@/lib/assistant/sources";
import { assistant } from "@/lib/i18n/fr/assistant";
import { cn } from "@/lib/utils";
import { withoutMarkdownMarks } from "@/lib/utils/markdown-marks";

const fr = { assistant };

/**
 * The row under a finished answer (as in ChatGPT and Claude): copy it, and
 * « Sources (n) », which unfolds the code-built links grouped by project,
 * the project written once (docs/ASSISTANT.md § 2).
 */
export function AnswerActions({
  text,
  sources,
}: {
  text: string;
  sources: Source[];
}) {
  const t = fr.assistant;
  const [open, setOpen] = useState(false);
  const listId = useId();
  const hasSources = sources.length > 0;
  if (!text && !hasSources) return null;

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1">
        {hasSources && (
          <Button
            variant="outline"
            size="sm"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((previous) => !previous)}
          >
            {t.sourcesCount(sources.length)}
            <IconChevronDown
              aria-hidden
              className={cn(
                "transition-transform duration-[var(--duration-fast)] motion-reduce:transition-none",
                open && "rotate-180",
              )}
            />
          </Button>
        )}
        {text && (
          // Text only beside the outlined « Sources » (docs/DESIGN.md,
          // « Bouton secondaire »); outlined when alone.
          <CopyButton
            value={withoutMarkdownMarks(plainText(text)).trim()}
            label=""
            ariaLabel={t.copy}
            copiedLabel={t.copied}
            variant={hasSources ? "ghost" : "outline"}
            size="icon-sm"
          />
        )}
      </div>
      {open && (
        <nav
          id={listId}
          aria-label={t.sources}
          className="grid gap-3 rounded-lg border border-border p-3 text-caption"
        >
          {groupSources(sources).map((group) => (
            <div key={group.title} className="grid gap-1">
              {group.href ? (
                <Link
                  href={group.href}
                  className="w-fit rounded-sm font-medium hover:underline"
                >
                  {group.title}
                </Link>
              ) : (
                <p className="font-medium">{group.title}</p>
              )}
              {group.items.length > 0 && (
                <ul className="grid gap-1">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="rounded-sm text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}
