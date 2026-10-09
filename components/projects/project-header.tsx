import { ReleaseCover } from "@/components/catalog/artist-profile/release-cover";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { Tone } from "@/lib/ui/state-tones";

/**
 * The project's identity at the top of each of its pages (maquettes of the
 * ticket « Architecture globale »): its cover, its kind, its title, the
 * artist and the planned release, its status. Only what the project's data
 * says: no cover filed shows a disc, no planned release shows nothing.
 */
export function ProjectHeader({
  title,
  kind,
  artistName,
  releaseDate,
  coverUrl,
  status,
}: {
  title: string;
  kind: string;
  artistName: string;
  // Already written out (« 27 nov. 2026 »).
  releaseDate: string | null;
  coverUrl: string | null;
  status: { label: string; tone: Tone };
}) {
  const meta = [
    artistName,
    releaseDate && fr.shell.project.header.releaseOn(releaseDate),
  ].filter(Boolean);
  return (
    <header className="flex items-start gap-4 sm:gap-5">
      <ReleaseCover
        coverUrl={coverUrl}
        className="size-20 rounded-xl sm:size-28"
      />
      <div className="flex min-w-0 flex-col gap-1">
        {kind && (
          <p className="text-caption font-medium text-muted-foreground uppercase">
            {kind}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">
          {title}
        </h1>
        {meta.length > 0 && (
          <p className="text-body-md text-muted-foreground">
            {meta.join(" · ")}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <StatusBadge tone={status.tone} size="sm">
            {status.label}
          </StatusBadge>
        </div>
      </div>
    </header>
  );
}
