import { IconFile, IconLink } from "nucleo-sharp-essential";

import { StatusBadge } from "@/components/ui/status-badge";
import { sectionCardClass } from "@/components/ui/section-card";
import { formatEuros } from "@/lib/budget/types";
import { productionLocations } from "@/lib/i18n/fr/production-locations";
import {
  missingOf,
  type LocationOption,
  type LocationsData,
} from "@/lib/production/locations/types";
import { formatDate } from "@/lib/release/format";
import type { Tone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

import { LocationActions } from "./location-actions";
import { LocationReviewButton } from "./location-review";

const fr = { productionLocations };

const t = fr.productionLocations;
const STATUS_TONES: Record<LocationOption["status"], Tone> = {
  candidate: "neutral",
  chosen: "success",
  discarded: "danger",
  replaced: "neutral",
};
const VERDICT_TONES = {
  favorable: "success",
  reserved: "warning",
  unfavorable: "danger",
} as const satisfies Record<string, Tone>;

/**
 * One candidate place on the board (PROD-011, PROD-012): its first photo,
 * status and verification, what is known and what is missing, its media,
 * the opinions by role, and the decision with who and why.
 */
export function LocationCard({
  option,
  data,
  scope,
  canOrganize,
  hasChoice,
  budgetNote,
}: {
  option: LocationOption;
  data: Pick<LocationsData, "viewerRole" | "viewerKey">;
  scope: { projectId: string; sheetId: string; organizationId: string };
  canOrganize: boolean;
  hasChoice: boolean;
  // Its price for the shoot days against the quote's places (proto).
  budgetNote?: { ok: boolean; text: string } | null;
}) {
  const cover = option.media.find(
    (m) => m.file?.href && m.file.mime.startsWith("image/"),
  );
  const missing = missingOf(option);
  const mine =
    option.reviews.find((r) => r.holderKey === data.viewerKey) ?? null;
  const price =
    option.priceCents !== null ? formatEuros(option.priceCents) : null;
  return (
    <article
      aria-labelledby={`place-${option.id}`}
      className={cn(
        sectionCardClass,
        "flex flex-col gap-4",
        option.status === "discarded" && "opacity-80",
      )}
    >
      {cover?.file?.href && (
        // eslint-disable-next-line @next/next/no-img-element -- a signed URL of a private bucket
        <img
          src={cover.file.href}
          alt={cover.file.fileName}
          className="aspect-video w-full rounded-lg object-cover"
        />
      )}
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id={`place-${option.id}`} className="font-semibold">
            {option.name}
          </h3>
          <StatusBadge tone={STATUS_TONES[option.status]} size="sm">
            {t.statuses[option.status]}
          </StatusBadge>
          <StatusBadge
            tone={option.verification === "verified" ? "success" : "warning"}
            size="sm"
          >
            {t.verification[option.verification]}
          </StatusBadge>
        </div>
        {option.address && (
          <p className="text-sm text-muted-foreground">{option.address}</p>
        )}
        {/* PROD-013: kept only once verified (also refused by the database). */}
        {option.status === "candidate" &&
          option.verification !== "verified" && (
            <p className="text-sm font-medium text-[color:var(--tone-warning-fg)]">
              {t.decide.verifyFirst}
            </p>
          )}
      </div>

      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        {(
          [
            [
              t.fields.price,
              [price, option.priceNote].filter(Boolean).join(" · "),
            ],
            [t.fields.availability, option.availability],
            [t.fields.constraints, option.constraints],
            [t.fields.contactNote, option.contactNote],
          ] as const
        ).map(([label, value]) =>
          value ? (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="break-words whitespace-pre-line">{value}</dd>
            </div>
          ) : null,
        )}
      </dl>
      {budgetNote && (
        <p
          className={cn(
            "text-sm font-medium",
            budgetNote.ok
              ? "text-[color:var(--tone-success-fg)]"
              : "text-[color:var(--tone-warning-fg)]",
          )}
        >
          {budgetNote.text}
        </p>
      )}
      {missing.length > 0 && option.status !== "discarded" && (
        <p className="text-xs font-medium text-[color:var(--tone-warning-fg)]">
          {t.missingLine(missing.map((m) => t.missing[m]).join(", "))}
        </p>
      )}

      {(option.media.length > 0 || option.url) && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {option.url && (
            <li>
              <a
                href={option.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-4"
              >
                <IconLink aria-hidden className="size-4" />
                {t.media.open}
              </a>
            </li>
          )}
          {option.media.map((m) => {
            const href = m.url ?? m.file?.href ?? null;
            if (!href) return null;
            return (
              <li key={m.id}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 break-all underline underline-offset-4"
                >
                  {m.file ? (
                    <IconFile aria-hidden className="size-4 shrink-0" />
                  ) : (
                    <IconLink aria-hidden className="size-4 shrink-0" />
                  )}
                  {m.file?.fileName ?? t.media.open}
                </a>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        {option.reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.reviewsNone}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {option.reviews.map((r) => (
              <li key={r.id} className="flex flex-col gap-0.5 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.who}</span>
                  <span className="text-muted-foreground">
                    {t.roles[r.role]}
                  </span>
                  <StatusBadge tone={VERDICT_TONES[r.verdict]} size="sm">
                    {t.verdicts[r.verdict]}
                  </StatusBadge>
                </span>
                {r.comment && (
                  <span className="break-words whitespace-pre-line">
                    {r.comment}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {data.viewerRole && option.status !== "discarded" && (
          <div>
            <LocationReviewButton
              projectId={scope.projectId}
              optionId={option.id}
              name={option.name}
              mine={mine}
            />
          </div>
        )}
      </div>

      {option.decidedAt && option.decidedBy && (
        <p className="text-xs text-muted-foreground">
          {t.decide.decidedBy(option.decidedBy, formatDate(option.decidedAt))}
          {option.decisionReason ? ` · ${option.decisionReason}` : ""}
        </p>
      )}
      {canOrganize && (
        <LocationActions scope={scope} option={option} hasChoice={hasChoice} />
      )}
    </article>
  );
}
