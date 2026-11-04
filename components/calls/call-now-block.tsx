import { NowFrame } from "@/components/shell/journey/now-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { TitleBlock } from "@/components/ui/title-block";
import type { Tone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

const secondary =
  "text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]";

/**
 * One « Maintenant » of a call's page, in the frame of the home and the
 * Travail (NowFrame): who it is for and where, the gesture, why, what comes
 * after, then the gesture itself (a button, the recorder, the processing).
 */
export function CallNowBlock({
  label,
  badge,
  eyebrow,
  title,
  why,
  then,
  children,
}: {
  label: string;
  badge: { tone: Tone; text: string };
  eyebrow: string;
  title: string;
  why: string;
  // « Ensuite : … », what the call asks after this.
  then?: { label: string; value: string } | null;
  children?: React.ReactNode;
}) {
  return (
    <NowFrame label={label}>
      <div className="flex flex-wrap items-center gap-2 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
        <StatusBadge tone={badge.tone}>{badge.text}</StatusBadge>
        <span>{eyebrow}</span>
      </div>
      <TitleBlock>
        <h2 className="text-[length:var(--type-display-sm)] leading-[var(--type-display-sm-lh)] font-medium tracking-[var(--type-display-tracking)] text-balance">
          {title}
        </h2>
        <p className={cn(secondary, "text-pretty")}>{why}</p>
      </TitleBlock>
      {then && (
        <dl className={cn(secondary, "flex flex-wrap gap-1.5")}>
          <dt>{then.label} :</dt>
          <dd className="font-semibold text-[color:var(--text-primary)]">
            {then.value}
          </dd>
        </dl>
      )}
      {children}
    </NowFrame>
  );
}
