/** The title above a block of facts (« Échange de cadrage »). */
export const factBlockTitleClass = "text-body-lg font-semibold";

/**
 * Facts in one block (Figma PDS OS 304:20801, the planned call, screens 4
 * and 5): a frame darker than the card it sits in, rows split by a hairline
 * across its width, each fact its label then its value under it. A row of
 * two (`FactBlockRow`) sits side by side from `sm` up. Server-safe.
 *
 *   <FactBlock>
 *     <FactBlockRow><BlockFact label="Quand">…</BlockFact>…</FactBlockRow>
 *     <BlockFact label="Participants">…</BlockFact>
 *   </FactBlock>
 */
export function FactBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col divide-y divide-[color:var(--border-hairline)] rounded-xl border border-[color:var(--border-hairline)] bg-[var(--surface-page)] px-6 [&>*]:py-4">
      {children}
    </div>
  );
}

/** Two facts of a block side by side. */
export function FactBlockRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

/** One fact of a block: its label, then its value under it. */
export function BlockFact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <dl className="flex min-w-0 flex-col gap-2">
      <dt className="text-caption text-[color:var(--text-secondary)]">
        {label}
      </dt>
      <dd className="min-w-0 text-body-md font-medium break-words">
        {children}
      </dd>
    </dl>
  );
}
