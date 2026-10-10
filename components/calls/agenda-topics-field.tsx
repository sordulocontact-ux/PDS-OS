"use client";

import { IconTrash } from "nucleo-sharp-essential";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  EXTRA_TOPIC_MINUTES,
  agendaMinutes,
  type AgendaTopic,
} from "@/lib/calls/prepare";
import { fr } from "@/lib/i18n/fr";

/**
 * The topics of a prepared exchange: PO's, each kept or removed and detailed
 * on demand with its questions, then the person's own topics.
 */
export function AgendaTopicsField({
  id,
  title,
  topics,
  kept,
  onToggle,
  extra,
  onExtraChange,
  detailed,
  onDetailedChange,
  empty,
}: {
  // Heading id, for aria-labelledby.
  id: string;
  title: string;
  topics: AgendaTopic[];
  kept: Set<string>;
  onToggle: (id: string) => void;
  extra: string[];
  onExtraChange: (extra: string[]) => void;
  // « Préparer en détail »: the questions go with each topic.
  detailed: boolean;
  onDetailedChange: (detailed: boolean) => void;
  // Shown when PO prepared no topic.
  empty?: string;
}) {
  const t = fr.calls.prepare;
  const [draft, setDraft] = useState("");
  const add = () => {
    const topic = draft.trim();
    if (topic && !extra.includes(topic)) onExtraChange([...extra, topic]);
    setDraft("");
  };
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={id} className="text-sm font-medium">
          {title}
        </h3>
        <span className="text-caption text-muted-foreground tabular-nums">
          {t.total(agendaMinutes(topics, kept, extra))}
        </span>
      </div>
      {topics.length === 0 && extra.length === 0 && empty && (
        <p className="text-caption text-muted-foreground">{empty}</p>
      )}
      <ul className="flex flex-col gap-2">
        {topics.map((topic) => (
          <li key={topic.id}>
            <label className="flex items-start gap-3 text-body-md">
              <Checkbox
                className="mt-1"
                checked={kept.has(topic.id)}
                onChange={() => onToggle(topic.id)}
              />
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold">
                  {topic.topic}{" "}
                  <span className="font-medium text-muted-foreground tabular-nums">
                    · {t.minutes(topic.minutes)}
                  </span>
                </span>
                {detailed && kept.has(topic.id) && (
                  <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-5 text-caption text-muted-foreground">
                    {topic.questions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                )}
              </span>
            </label>
          </li>
        ))}
        {extra.map((topic) => (
          <li
            key={topic}
            className="flex items-center justify-between gap-3 text-body-md"
          >
            <span className="font-semibold">
              {topic}{" "}
              <span className="font-medium text-muted-foreground">
                · {t.minutes(EXTRA_TOPIC_MINUTES)}
              </span>
            </span>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t.removeTopic(topic)}
              onClick={() => onExtraChange(extra.filter((x) => x !== topic))}
            >
              <IconTrash aria-hidden className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Input
          aria-label={t.addTopic}
          value={draft}
          maxLength={200}
          placeholder={t.topicPlaceholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="h-9 min-w-0 flex-1"
        />
        <Button type="button" size="sm" variant="outline" onClick={add}>
          {t.addTopic}
        </Button>
      </div>
      {topics.length > 0 && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="self-start"
          onClick={() => onDetailedChange(!detailed)}
        >
          {detailed ? t.hideDetail : t.detail}
        </Button>
      )}
    </section>
  );
}
