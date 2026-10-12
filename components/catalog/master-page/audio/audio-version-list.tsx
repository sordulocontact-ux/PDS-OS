import { AudioReviewButtons } from "@/components/catalog/master-page/audio/audio-review-buttons";
import { AudioVersionListening } from "@/components/catalog/master-page/audio/audio-version-listening";
import { AudioVersionMenu } from "@/components/catalog/master-page/audio/audio-version-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timestamp } from "@/components/ui/timestamp";
import type { NumberedVersion } from "@/lib/catalog/audio-versions";
import { formatFileSize } from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";
import { formatInstant } from "@/lib/utils/instant";
import { audioValidationTone } from "@/lib/ui/state-tones";

/** « Mix V2 ». */
export function versionLabel(version: NumberedVersion): string {
  return fr.masterPage.audio.versions.label(
    fr.catalog.audioStates[version.audioState],
    version.number,
  );
}

/**
 * Every audio version of a title, the most advanced step first: its number
 * in its step, its validation (a decision on this exact file, never
 * implied by the deposit), the decision's note, the player and the
 * comments. Retours Catalogue 10, 13, 18, 19, 22, 25, 26.
 */
export function AudioVersionList({
  masterId,
  versions,
  canEdit,
}: {
  masterId: string;
  versions: NumberedVersion[];
  canEdit: boolean;
}) {
  const t = fr.masterPage.audio.versions;
  const byId = new Map(versions.map((v) => [v.id, v]));
  return (
    <ul className="flex flex-col divide-y divide-[color:var(--border-hairline)]">
      {versions.map((version) => {
        const label = versionLabel(version);
        const previous = version.previousId
          ? byId.get(version.previousId)
          : undefined;
        return (
          <li
            key={version.id}
            className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold">{label}</h3>
                  <StatusBadge
                    tone={audioValidationTone[version.validation]}
                    size="sm"
                  >
                    {t.validation[version.validation]}
                  </StatusBadge>
                </div>
                <p className="text-sm break-words text-[color:var(--text-secondary)]">
                  {version.fileName} · {formatFileSize(version.bytes)}
                </p>
                <p className="text-sm text-[color:var(--text-tertiary)]">
                  {t.deposited(
                    version.authorName,
                    formatInstant(version.createdAt),
                  )}
                  {previous && ` · ${t.follows(versionLabel(previous))}`}
                </p>
                {version.review && version.reviewedAt && (
                  <p className="text-sm">
                    <span className="font-medium">
                      {t.validation[version.review]}
                    </span>{" "}
                    <span className="text-[color:var(--text-secondary)]">
                      {t.decided(version.reviewerName, "")}
                      <Timestamp iso={version.reviewedAt} />
                    </span>
                    {version.reviewNote && (
                      <span className="mt-0.5 block whitespace-pre-line">
                        {version.reviewNote}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <AudioVersionMenu
                masterId={masterId}
                version={version}
                label={label}
                canEdit={canEdit}
              />
            </div>
            {/* Listen, read the notes, then one row of buttons: add a note
                (modal), and the decision when one is expected. */}
            <AudioVersionListening
              masterId={masterId}
              fileId={version.id}
              label={label}
              listenUrl={version.openUrl}
              downloadUrl={version.downloadUrl}
              comments={version.comments}
              decision={
                canEdit &&
                version.validation === "pending" && (
                  <AudioReviewButtons
                    masterId={masterId}
                    fileId={version.id}
                    label={label}
                    final={version.audioState === "final_master"}
                    comments={version.comments}
                  />
                )
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
