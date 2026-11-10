import type { Ref } from "react";

import { AudioMeter } from "@/components/ui/audio-meter";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatClock } from "@/lib/calls/format";
import { voice } from "@/lib/i18n/fr/voice";
import { MAX_DICTATION_SECONDS } from "@/lib/voice/constants";

const fr = { voice };

/** While dictating: state, clock against the limit, input level, finish or cancel. */
export function DictationLive({
  elapsed,
  meterRef,
  onFinish,
  onCancel,
}: {
  elapsed: number;
  meterRef: Ref<HTMLSpanElement>;
  onFinish: () => void;
  onCancel: () => void;
}) {
  const t = fr.voice;
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge tone="info" dot>
          {t.recording}
        </StatusBadge>
        <span className="text-sm text-muted-foreground tabular-nums">
          <span className="text-foreground">{formatClock(elapsed)}</span>{" "}
          {t.limit(formatClock(MAX_DICTATION_SECONDS))}
        </span>
      </div>
      {/* Live input level: bars moved by useAudioMeter, no re-render. */}
      <AudioMeter ref={meterRef} label={t.level} />
      <p className="text-sm text-muted-foreground">{t.hint}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onFinish}>{t.finish}</Button>
        <Button variant="ghost" onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
    </div>
  );
}
