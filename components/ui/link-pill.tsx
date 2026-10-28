import { CopyButton } from "@/components/ui/copy-button";

/**
 * A link written out in a pill, with « Copier » as an icon button (Figma
 * PDS OS: private link node 229:2257, video link node 282:6170). `open`:
 * the address also opens, in a new tab (the video of a call).
 */
export function LinkPill({
  url,
  copyLabel,
  copiedLabel,
  open = false,
}: {
  url: string;
  copyLabel: string;
  copiedLabel: string;
  open?: boolean;
}) {
  const text = (
    <code className="min-w-0 truncate text-[length:var(--type-caption)]">
      {url}
    </code>
  );
  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full bg-[var(--surface-soft)] py-1 pr-1 pl-4">
      {open ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 underline-offset-2 hover:underline"
        >
          {text}
        </a>
      ) : (
        text
      )}
      <CopyButton
        value={url}
        label=""
        copiedLabel={copiedLabel}
        variant="ghost"
        size="icon-sm"
        ariaLabel={copyLabel}
      />
    </span>
  );
}
