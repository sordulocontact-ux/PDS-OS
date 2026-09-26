"use client";

import { MicIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

import { isRecordingSupported } from "@/components/calls/recorder-media";
import { DictationLive } from "@/components/voice/dictation-live";
import {
  DictationReview,
  type ReviewItem,
} from "@/components/voice/dictation-review";
import type { useDictation } from "@/components/voice/use-dictation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";

/**
 * Dictation UI shared by every stage: the button that starts it, and the
 * panel that follows it (listening, analysis, error, review). The stage
 * words its proposals as ReviewItems and applies the accepted ones.
 */

type Dictation<P> = ReturnType<typeof useDictation<P>>;

const noSubscribe = () => () => {};

export function DictationButton<P>({ dictation }: { dictation: Dictation<P> }) {
  // Browser capability, read without a server/client mismatch.
  const supported = useSyncExternalStore(
    noSubscribe,
    () => isRecordingSupported("mic"),
    () => true,
  );
  const busy =
    dictation.phase.name !== "idle" && dictation.phase.name !== "error";
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={!supported || busy}
      title={supported ? undefined : fr.voice.unsupported}
      onClick={dictation.start}
    >
      <MicIcon aria-hidden />
      {fr.voice.start}
    </Button>
  );
}

export function DictationPanel<P>({
  dictation,
  toItems,
  pending,
  onApply,
}: {
  dictation: Dictation<P>;
  toItems: (proposals: P[]) => Array<ReviewItem & { proposal: P }>;
  pending: boolean;
  onApply: (proposals: P[]) => void;
}) {
  const t = fr.voice;
  const { phase } = dictation;

  switch (phase.name) {
    case "idle":
      return null;
    case "requesting":
      return (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t.requesting}
        </p>
      );
    case "recording":
      return (
        <DictationLive
          elapsed={dictation.elapsed}
          meterRef={dictation.meter}
          onFinish={dictation.finish}
          onCancel={dictation.cancel}
        />
      );
    case "sending":
      return (
        <div aria-live="polite">
          <StatusBadge treatment="pending" dot>
            {t.sending}
          </StatusBadge>
        </div>
      );
    case "error":
      return (
        <div
          role="alert"
          className="grid gap-2 rounded-lg border border-[color:var(--border-strong)] p-3"
        >
          <p className="text-sm">{t.errors[phase.error]}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={dictation.start}>
              {t.retry}
            </Button>
            <Button size="sm" variant="ghost" onClick={dictation.reset}>
              {t.cancel}
            </Button>
          </div>
        </div>
      );
    case "review": {
      const items = toItems(phase.proposals);
      return (
        <DictationReview
          heard={phase.heard}
          items={items}
          pending={pending}
          onApply={(ids) =>
            onApply(
              items.filter((i) => ids.includes(i.id)).map((i) => i.proposal),
            )
          }
          onDiscard={dictation.reset}
        />
      );
    }
  }
}
