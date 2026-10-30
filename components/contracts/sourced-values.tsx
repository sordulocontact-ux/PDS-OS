import { contracts } from "@/lib/i18n/fr/contracts";

const fr = { contracts };

/**
 * The values of a generated contract (proto « Contrats », Sacha 30/10/2026):
 * one line each, the label on the left, the value and its source on the
 * right, a hairline between lines, in a table's frame (Sacha, 30/10/2026).
 */
export function SourcedValues({
  values,
}: {
  values: Array<{
    id: string;
    label: string;
    value: string;
    source: string | null;
  }>;
}) {
  return (
    <dl className="flex flex-col rounded-xl border border-[color:var(--border-hairline)] px-4 [&>div+div]:border-t [&>div+div]:border-[color:var(--border-hairline)]">
      {values.map((v) => (
        <div
          key={v.id}
          className="grid gap-1 py-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-6"
        >
          <dt className="text-[color:var(--text-secondary)]">{v.label}</dt>
          <dd className="flex min-w-0 flex-col gap-0.5">
            <span
              className={
                v.value ? "break-words" : "text-[color:var(--text-secondary)]"
              }
            >
              {v.value || fr.contracts.document.toDecide}
            </span>
            {v.source && (
              <span className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
                {v.source}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
