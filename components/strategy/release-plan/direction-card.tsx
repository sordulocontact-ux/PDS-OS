import { StatusBadge } from "@/components/ui/status-badge";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";
import {
  FONT_PAIRINGS,
  type Direction,
} from "@/lib/strategy/documents/direction";
import { doneTone } from "@/lib/ui/state-tones";

const fr = { strategyReleasePlan };

/**
 * A visual direction as the owner judges it: a sample in its own colours
 * (they are the document's data, hence the inline styles), its theme, its
 * typographic pairing and the references' palette.
 */
export function DirectionCard({
  direction,
  label,
}: {
  direction: Direction;
  label: string;
}) {
  const t = fr.strategyReleasePlan.direction;
  const fonts = FONT_PAIRINGS[direction.fonts];
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-body-md font-semibold">
          {label} · {t.themes[direction.theme]}
        </span>
        {direction.accepted && (
          <StatusBadge tone={doneTone} size="sm">
            {t.accepted}
          </StatusBadge>
        )}
      </div>
      <div
        className="flex aspect-[21/9] flex-col justify-end gap-1 rounded-xl p-5"
        style={{ background: direction.background, color: direction.ink }}
      >
        <span
          className="text-caption font-semibold uppercase"
          style={{ color: direction.accent }}
        >
          {fr.strategyReleasePlan.content.kind}
        </span>
        <span className="text-display-sm font-semibold">{fonts.heading}</span>
        <span className="text-body-md">{fonts.body}</span>
      </div>
      <dl className="grid gap-3 text-caption sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground">{t.fonts}</dt>
          <dd className="font-medium">
            {t.pairings[direction.fonts]} · {fonts.heading} / {fonts.body}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground">{t.palette}</dt>
          <dd className="flex flex-wrap gap-1.5">
            {[
              direction.background,
              direction.ink,
              direction.accent,
              ...direction.palette,
            ].map((color, i) => (
              <span
                key={`${color}-${i}`}
                title={color}
                className="size-6 rounded-md border border-border"
                style={{ background: color }}
              />
            ))}
          </dd>
        </div>
      </dl>
    </div>
  );
}
