import { IconCheck } from "nucleo-sharp-essential";

/**
 * How far something is, as a small ring (24 px) instead of a bar or a
 * coloured pill: the overview's workflows (retour d'Akili du 05/11/2026,
 * « pas de pastilles colorées »). Complete: a filled disc with a check. The
 * ring is only a mark: `label` says the figures (« 2 étapes faites sur 5 »).
 */
export function ProgressRing({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  if (max > 0 && value >= max)
    return (
      <span
        role="img"
        aria-label={label}
        className="grid size-6 place-items-center rounded-full bg-[var(--text-primary)] text-[color:var(--surface-page)]"
      >
        <IconCheck aria-hidden className="size-3" />
      </span>
    );
  const r = 10;
  const length = 2 * Math.PI * r;
  const part = max > 0 ? Math.max(0, value) / max : 0;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 24 24"
      className="size-6 shrink-0 text-[color:var(--text-primary)]"
    >
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        strokeWidth="2.5"
        className="stroke-[var(--border-hairline)]"
      />
      {part > 0 && (
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${length * part} ${length}`}
          transform="rotate(-90 12 12)"
        />
      )}
    </svg>
  );
}
