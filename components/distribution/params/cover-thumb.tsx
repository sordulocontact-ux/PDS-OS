/** A cover's thumbnail as the proto draws it: its title on a dark square
 * (the file itself lives in the Production; no image is copied here). */
export function CoverThumb({ title }: { title: string }) {
  const word = title
    .replace(/^pochette\s*/i, "")
    .replace(/[«»"]/g, "")
    .trim();
  return (
    <span
      aria-hidden
      className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-md bg-[var(--surface-inverse)] px-1 text-center text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] font-semibold tracking-wide text-[color:var(--control-primary-fg)] uppercase"
    >
      {word.slice(0, 10)}
    </span>
  );
}
