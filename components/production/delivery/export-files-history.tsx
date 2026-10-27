import { productionClosure } from "@/lib/i18n/fr/production-closure";
import type { ExportFile } from "@/lib/production/delivery/rules";
import { formatDate } from "@/lib/release/format";

const fr = { productionClosure };

const t = fr.productionClosure.files;

/** Every file deposited on an expected file, newest first: who (a member,
 * or the provider through their link) and when; replacing one keeps the
 * others (PROD-036). Native <details>, folded. */
export function ExportFilesHistory({ files }: { files: ExportFile[] }) {
  if (files.length === 0) return null;
  return (
    <details className="text-sm text-muted-foreground">
      <summary className="w-fit cursor-pointer rounded-md py-1 underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
        {t.summary(files.length)}
      </summary>
      <ul className="mt-1 flex flex-col gap-1 pl-1">
        {files.map((file, i) => (
          <li
            key={`${file.url}-${file.depositedAt}`}
            className="flex flex-wrap gap-x-2"
          >
            <span>
              {t.by(
                file.depositedBy ?? t.provider,
                formatDate(file.depositedAt),
              )}
              {i === 0 && ` · ${t.current}`}
            </span>
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-4"
            >
              {t.open}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
