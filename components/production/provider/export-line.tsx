"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { productionClosure } from "@/lib/i18n/fr/production-closure";
import { productionProvider } from "@/lib/i18n/fr/production-provider";
import { depositProviderExport } from "@/lib/production/provider/public-actions";
import type { OpenProviderSpace } from "@/lib/production/provider/public";
import type { Tone } from "@/lib/ui/state-tones";

const fr = { productionClosure, productionProvider };

const t = fr.productionProvider.exports;
const points = fr.productionClosure.points;
const HTTPS = /^https:\/\/\S+$/;
type Line = OpenProviderSpace["exports"][number];

const stateOf = (line: Line) =>
  !line.url
    ? "todo"
    : line.result === "ok"
      ? "ok"
      : line.result === "not_ok"
        ? "not_ok"
        : "to_check";
const TONES: Record<ReturnType<typeof stateOf>, Tone> = {
  todo: "neutral",
  to_check: "info",
  ok: "success",
  not_ok: "danger",
};

/** One expected export (PROD-036): its state, the reviewer's note when it
 * is not conforming, and the provider's link to deposit or replace. */
export function ExportLine({
  token,
  line,
  writable,
}: {
  token: string;
  line: Line;
  writable: boolean;
}) {
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const state = stateOf(line);

  async function deposit(form: HTMLFormElement) {
    const url = String(new FormData(form).get("url") ?? "").trim();
    setMissing(!HTTPS.test(url));
    setError(null);
    if (!HTTPS.test(url)) return;
    setPending(true);
    const result = await depositProviderExport({
      token,
      lineId: line.id,
      url,
    });
    setPending(false);
    if (!result.ok) return setError(result.error);
    toast.success(t.done);
  }

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{line.label}</span>
        <StatusBadge tone={TONES[state]} size="sm">
          {t.states[state]}
        </StatusBadge>
      </div>
      {line.spec && <p className="text-sm break-words">{line.spec}</p>}
      {state === "not_ok" &&
        (line.failed.length > 0 ? (
          <ul className="flex flex-col gap-0.5 text-sm break-words text-[color:var(--tone-danger-fg)]">
            {line.failed.map((point) => (
              <li key={point.key}>
                {points.failed(
                  points.labels[point.key] ?? point.key,
                  point.note,
                )}
              </li>
            ))}
          </ul>
        ) : (
          line.note && (
            <p className="text-sm break-words text-[color:var(--tone-danger-fg)]">
              {line.note}
            </p>
          )
        ))}
      {line.url && (
        <a
          href={line.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit text-sm break-all underline underline-offset-4"
        >
          {line.url}
        </a>
      )}
      {writable && state !== "ok" && (
        <form
          noValidate
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void deposit(event.currentTarget);
          }}
        >
          <div className="min-w-0 flex-1">
            <Field
              id={`export-${line.id}`}
              name="url"
              type="url"
              inputMode="url"
              label={t.url(line.label)}
              required
              maxLength={2000}
              error={missing ? t.missing : undefined}
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {line.url ? t.replace : t.submit}
          </Button>
        </form>
      )}
      <FormMessage kind="error">{error}</FormMessage>
    </li>
  );
}
