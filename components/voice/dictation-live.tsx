import type { Ref } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatClock } from "@/lib/calls/format";
import { fr } from "@/lib/i18n/fr";
import { MAX_DICTATION_SECONDS } from "@/lib/voice/constants";

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
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge tone="info" dot>
          {t.recording}
        </StatusBadge>
        <span className="text-sm text-muted-foreground tabular-nums">
          <span className="text-foreground">{formatClock(elapsed)}</span>{" "}
          {t.limit(formatClock(MAX_DICTATION_SECONDS))}
        </span>
      </div>
      {/* Live input level, written by the recorder hook without re-rendering. */}
      <span
        className="relative block h-[3px] overflow-hidden rounded-pill bg-[var(--meter-track)]"
        aria-hidden
        title={t.level}
      >
        <span
          ref={meterRef}
          className="absolute inset-0 origin-left scale-x-0 bg-[var(--po-ink-900)]"
        />
      </span>
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
