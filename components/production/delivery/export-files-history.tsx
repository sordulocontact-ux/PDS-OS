import { Fold } from "@/components/ui/fold";
import { productionClosure } from "@/lib/i18n/fr/production-closure";
import type { ExportFile } from "@/lib/production/delivery/rules";
import { formatDate } from "@/lib/release/format";

const fr = { productionClosure };

const t = fr.productionClosure.files;

/** Every file deposited on an expected file, newest first: who (a member,
 * or the provider through their link) and when; replacing one keeps the
 * others (PROD-036). Folded (`Fold`). */
export function ExportFilesHistory({ files }: { files: ExportFile[] }) {
  if (files.length === 0) return null;
  return (
    <Fold summary={t.summary(files.length)} className="text-sm">
      <ul className="flex flex-col gap-1 pl-1 text-muted-foreground">
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
    </Fold>
  );
}
