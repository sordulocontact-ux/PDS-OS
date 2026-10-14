import type { HandoffRecord } from "@/lib/production/delivery/queries";

/** The files of a transmission to Activations, each with its link and what
 * is expected of it (PROD-039): in the proposal and in each transmission. */
export function HandoffExports({
  exports,
}: {
  exports: HandoffRecord["exports"];
}) {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {exports.map((file, i) => (
        <li key={`${file.label}-${i}`} className="break-words">
          {file.url ? (
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {file.label}
            </a>
          ) : (
            file.label
          )}
          {file.spec && (
            <span className="text-muted-foreground">
              {" · "}
              {file.spec}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
