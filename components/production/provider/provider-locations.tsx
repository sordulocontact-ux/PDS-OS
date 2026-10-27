"use client";

import { useState } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import {
  ReviewFields,
  reviewMissing,
} from "@/components/production/locations/location-review";
import { Button } from "@/components/ui/button";
import { productionLocations } from "@/lib/i18n/fr/production-locations";
import type { Verdict } from "@/lib/production/locations/types";
import type { ProviderLocations } from "@/lib/production/provider/public";
import { reviewLocationByLink } from "@/lib/production/provider/public-actions";

const fr = { productionLocations };

const t = fr.productionLocations;

/** The places a consulted provider compares (PROD-012): what is known of
 * each, and their own opinion, given without touching the place. */
export function ProviderLocationsList({
  token,
  data,
  writable,
}: {
  token: string;
  data: ProviderLocations;
  writable: boolean;
}) {
  return (
    <ul className="flex flex-col gap-6">
      {data.options.map((o) => (
        <li key={o.id} className="flex flex-col gap-2">
          <span className="font-medium">{o.name}</span>
          {o.address && (
            <span className="text-sm text-muted-foreground">{o.address}</span>
          )}
          {o.availability && (
            <span className="text-sm">
              {t.fields.availability} : {o.availability}
            </span>
          )}
          {o.constraints && (
            <span className="text-sm break-words whitespace-pre-line">
              {t.fields.constraints} : {o.constraints}
            </span>
          )}
          <span className="flex flex-wrap gap-x-4 text-sm">
            {[o.url, ...o.media].flatMap((href, i) =>
              href ? (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  {t.media.open}
                </a>
              ) : (
                []
              ),
            )}
          </span>
          {writable && <ReviewForm token={token} option={o} />}
        </li>
      ))}
    </ul>
  );
}

function ReviewForm({
  token,
  option,
}: {
  token: string;
  option: ProviderLocations["options"][number];
}) {
  const [verdict, setVerdict] = useState<Verdict | null>(
    option.review?.verdict ?? null,
  );
  const [missing, setMissing] = useState<"verdict" | "comment" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const comment = String(
          new FormData(event.currentTarget).get("comment") ?? "",
        );
        const lack = reviewMissing(verdict, comment);
        setMissing(lack);
        if (lack || !verdict) return;
        setPending(true);
        const result = await reviewLocationByLink({
          token,
          optionId: option.id,
          verdict,
          comment,
        });
        setPending(false);
        if (!result.ok) return setError(result.error);
        setError(null);
        toast.success(t.review.saved);
      }}
    >
      <ReviewFields
        idPrefix={`provider-review-${option.id}`}
        verdict={verdict}
        onVerdict={(next) => {
          setVerdict(next);
          setMissing(null);
        }}
        comment={option.review?.comment ?? null}
        missing={missing}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div>
        <Button
          type="submit"
          variant="outline"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {option.review ? t.review.change : t.review.give}
        </Button>
      </div>
    </form>
  );
}
