"use client";

import type { ReactNode } from "react";

import type { RecorderSource } from "@/components/calls/recorder-media";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { ToneCallout } from "@/components/ui/tone-callout";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

/**
 * Before recording: what to record (only when the call is not in visio or
 * the browser cannot share a tab), the problem found, and the button. On
 * the call's page, the full how-to; `compact` (a step's card): one button
 * that starts at once, a gesture of the module beside it, and the how-to in
 * one line under them.
 */
export function RecorderStart({
  source,
  onSourceChange,
  tabSupported,
  videoCall,
  starting,
  problem,
  onStart,
  compact,
}: {
  source: RecorderSource;
  onSourceChange: (source: RecorderSource) => void;
  tabSupported: boolean;
  videoCall: boolean;
  starting: boolean;
  problem: { text: string; tone: "danger" | "warning" } | null;
  onStart: () => void;
  compact?: { label: string; beside?: ReactNode };
}) {
  const t = fr.calls.recorder;
  const choice = !(videoCall && tabSupported) && (
    <ChoiceCards
      name="recorder-source"
      legend={t.sourceLabel}
      value={source}
      onChange={onSourceChange}
      disabled={starting}
      choices={[
        {
          value: "tab",
          label: t.sources.tab.label,
          hint: tabSupported ? t.sources.tab.hint : t.tabUnavailable,
          disabled: !tabSupported,
        },
        {
          value: "mic",
          label: t.sources.mic.label,
          hint: t.sources.mic.hint,
        },
      ]}
    />
  );
  const callout = problem && (
    <ToneCallout tone={problem.tone} role="alert">
      {problem.text}
    </ToneCallout>
  );

  if (compact)
    return (
      <>
        {choice}
        {callout}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="lg" onClick={onStart} disabled={starting}>
            {starting ? t.starting : compact.label}
          </Button>
          {compact.beside}
        </div>
        <p className="text-caption text-[color:var(--text-tertiary)]">
          {source === "tab" ? `${t.sources.tab.hint} ` : ""}
          {t.reminder}
        </p>
      </>
    );

  return (
    <>
      {choice || (
        <p className="text-sm text-muted-foreground">{t.sources.tab.hint}</p>
      )}
      <p className="text-sm text-muted-foreground">{t.reminder}</p>
      {callout}
      <Button
        onClick={onStart}
        disabled={starting}
        className="justify-self-start"
      >
        {starting ? t.starting : t.start}
      </Button>
    </>
  );
}
