import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { formatTimecode } from "@/lib/production/post/timecode";
import { postStepKeyOf } from "@/lib/production/post/rules";
import type {
  OpenProviderSpace,
  ProviderLocations,
} from "@/lib/production/provider/public";
import { formatDate } from "@/lib/release/format";
import { productionVersionTone } from "@/lib/ui/state-tones";

import { DepositVersion } from "./deposit-version";
import { FinishStepButton } from "./finish-step-button";
import { ExportLine } from "./export-line";
import { ProviderLocationsList } from "./provider-locations";
import { ProviderSection } from "./provider-section";

const t = fr.productionProvider;
const keys = fr.productionPost.steps.keys;
const categories = fr.productionPost.comments.categories;

const stepName = (s: OpenProviderSpace["steps"][number]) => {
  const key = postStepKeyOf(s.key);
  return key === "other" && s.label
    ? s.label
    : key
      ? keys[key]
      : (s.label ?? "");
};

function period(from: string | null, to: string | null) {
  if (from && to) return t.mission.period(formatDate(from), formatDate(to));
  if (to) return t.mission.until(formatDate(to));
  return from ? t.mission.from(formatDate(from)) : null;
}

/**
 * The provider's page (PROD-026): their mission first, then the
 * corrections addressed to them, where to deposit a version, the versions,
 * the expected exports and the references. Nothing of another provider,
 * no budget, no contact.
 */
export function ProviderSpaceView({
  token,
  space,
  locations,
  quiet = false,
}: {
  token: string;
  space: OpenProviderSpace;
  // A provider with a role before the postproduction (the company, the
  // director, the director of photography): its empty post sections wait.
  quiet?: boolean;
  // The places this provider is consulted on (PROD-012), if any.
  locations: ProviderLocations | null;
}) {
  const open = space.requests.filter((r) => r.status !== "treated");
  const show = (filled: boolean) => !quiet || filled;
  const label = (s: string) =>
    t.versions.statuses[s as keyof typeof t.versions.statuses] ?? s;
  return (
    <div className="flex flex-col gap-6">
      {!space.writable && (
        <p className="text-sm font-medium text-muted-foreground">{t.locked}</p>
      )}

      {show(space.steps.length > 0) && (
        <ProviderSection title={t.mission.title}>
          {space.steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.mission.none}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {space.steps.map((s) => (
                <li key={s.id} className="flex flex-col gap-1 py-3 first:pt-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{stepName(s)}</span>
                    {s.status === "done" ? (
                      <StatusBadge tone="success" size="sm">
                        {t.mission.done}
                      </StatusBadge>
                    ) : (
                      space.writable && (
                        <FinishStepButton token={token} stepId={s.id} />
                      )
                    )}
                  </span>
                  {period(s.startsOn, s.endsOn) && (
                    <span className="text-sm tabular-nums">
                      {period(s.startsOn, s.endsOn)}
                    </span>
                  )}
                  {s.responsibilities && (
                    <p className="text-sm break-words whitespace-pre-line">
                      <span className="text-muted-foreground">
                        {t.mission.expected} :{" "}
                      </span>
                      {s.responsibilities}
                    </p>
                  )}
                  {s.accessNote && (
                    <p className="text-sm break-words whitespace-pre-line">
                      <span className="text-muted-foreground">
                        {t.mission.access} :{" "}
                      </span>
                      {s.accessNote}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ProviderSection>
      )}

      {locations?.role && locations.options.length > 0 && (
        <ProviderSection
          title={t.locations.title}
          hint={t.locations.hint(
            fr.productionLocations.roles[locations.role].toLowerCase(),
          )}
        >
          <ProviderLocationsList
            token={token}
            data={locations}
            writable={space.writable}
          />
        </ProviderSection>
      )}

      {show(space.requests.length > 0) && (
        <ProviderSection title={t.corrections.title}>
          {open.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t.corrections.none}
            </p>
          ) : (
            open.map((r) => (
              <div key={r.id} className="flex flex-col gap-2">
                <p className="font-medium tabular-nums">
                  {t.corrections.on(r.versionNumber, formatDate(r.dueOn))}
                </p>
                {r.message && (
                  <p className="text-sm break-words whitespace-pre-line">
                    {r.message}
                  </p>
                )}
                <ul className="flex flex-col gap-1.5 text-sm">
                  {r.comments.map((c, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="w-16 shrink-0 font-semibold tabular-nums">
                        {c.timecodeMs === null
                          ? t.corrections.general
                          : formatTimecode(c.timecodeMs)}
                      </span>
                      <span className="min-w-0 break-words">
                        <span className="text-muted-foreground">
                          {categories[c.category as keyof typeof categories] ??
                            c.category}{" "}
                          —{" "}
                        </span>
                        {c.body}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </ProviderSection>
      )}
      {space.writable && !space.approved && show(space.steps.length > 0) && (
        <ProviderSection title={t.deposit.title} hint={t.deposit.hint}>
          <DepositVersion token={token} />
        </ProviderSection>
      )}

      {show(space.versions.length > 0) && (
        <ProviderSection title={t.versions.title}>
          {space.versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.versions.none}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {space.versions.map((v) => (
                <li
                  key={v.number}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span className="font-medium">
                    {t.versions.name(v.number)}
                  </span>
                  <StatusBadge
                    tone={productionVersionTone[v.status] ?? "neutral"}
                    size="sm"
                  >
                    {label(v.status)}
                  </StatusBadge>
                  {v.mine && (
                    <span className="text-sm text-muted-foreground">
                      {t.versions.mine}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ProviderSection>
      )}
      {space.exports.length > 0 && (
        <ProviderSection title={t.exports.title} hint={t.exports.hint}>
          <ul className="flex flex-col divide-y divide-border">
            {space.exports.map((line) => (
              <ExportLine
                key={line.id}
                token={token}
                line={line}
                writable={space.writable}
              />
            ))}
          </ul>
        </ProviderSection>
      )}

      {show(space.references.length > 0) && (
        <ProviderSection title={t.references.title}>
          {space.references.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.references.none}</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {space.references.map((r, i) => (
                <li key={i} className="flex flex-col gap-0.5">
                  {r.title && <span className="font-medium">{r.title}</span>}
                  {r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-fit break-all underline underline-offset-4"
                    >
                      {r.url}
                    </a>
                  )}
                  {r.fileName && (
                    <span className="text-muted-foreground">
                      {t.references.file(r.fileName)}
                    </span>
                  )}
                  {r.note && (
                    <span className="break-words whitespace-pre-line">
                      {r.note}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ProviderSection>
      )}
    </div>
  );
}
