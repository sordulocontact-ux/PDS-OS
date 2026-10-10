import { accentSchema } from "@/lib/strategy/documents/model";

/**
 * Colour samples of a document's direction, with their code. The colours
 * are data (read from the images or chosen), passed as a CSS variable.
 */
export function Swatches({ colors }: { colors: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {colors
        .filter((c) => accentSchema.safeParse(c).success)
        .map((color) => (
          <li key={color} className="flex flex-col items-center gap-1">
            <span
              aria-hidden
              style={{ "--swatch": color } as React.CSSProperties}
              className="size-10 rounded-xl border border-border bg-[var(--swatch)]"
            />
            <span className="text-caption text-muted-foreground tabular-nums">
              {color}
            </span>
          </li>
        ))}
    </ul>
  );
}
