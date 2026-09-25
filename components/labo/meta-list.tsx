/** Compact key/value line for technical metadata (model, timings, tokens). */
export function MetaList({
  items,
}: {
  items: Array<[label: string, value: string]>;
}) {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
      {items.map(([label, value]) => (
        <div key={label} className="flex gap-1.5">
          <dt>{label}</dt>
          <dd className="font-mono text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
