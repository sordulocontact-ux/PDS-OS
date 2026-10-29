import { NowFrame } from "@/components/shell/journey/now-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { contracts } from "@/lib/i18n/fr/contracts";
import type { Tone } from "@/lib/ui/state-tones";
import { myValidationTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

const fr = { contracts };

const secondary =
  "text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]";

/**
 * The frame of a contract's « Maintenant » (the same `NowFrame` as the home,
 * Travail and a title): who it is for, the contract as eyebrow, what to do
 * or who is awaited, why, its facts, then the gestures.
 */
export function ContractNowFrame({
  badge,
  validate = false,
  eyebrow,
  title,
  why,
  facts = [],
  children,
}: {
  badge: { tone: Tone; label: string };
  // « À valider » beside « À vous ».
  validate?: boolean;
  eyebrow: string;
  title: string;
  why: string;
  facts?: Array<[string, string] | null | false>;
  children?: React.ReactNode;
}) {
  const t = fr.contracts.now;
  const shown = facts.filter((f): f is [string, string] => Boolean(f));
  return (
    <NowFrame label={t.label}>
      <div className="flex flex-wrap items-center gap-2 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
        <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
        {validate && (
          <StatusBadge tone={myValidationTone} size="sm">
            {t.toValidate}
          </StatusBadge>
        )}
        <span className="min-w-0 truncate">{eyebrow}</span>
      </div>
      <h2 className="text-[length:var(--type-display-sm)] leading-[var(--type-display-sm-lh)] font-medium tracking-[var(--type-display-tracking)] text-balance">
        {title}
      </h2>
      <p className={cn(secondary, "text-pretty")}>{why}</p>
      {shown.length > 0 && (
        <dl className={cn(secondary, "flex flex-col gap-1")}>
          {shown.map(([label, value]) => (
            <div key={label} className="flex flex-wrap gap-1.5">
              <dt>{label} :</dt>
              <dd className="font-semibold text-[color:var(--text-primary)]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </NowFrame>
  );
}
