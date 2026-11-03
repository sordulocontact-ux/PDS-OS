"use client";

import { useState, type FormEvent } from "react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { labo } from "@/lib/i18n/fr/labo";
import { requestRelease } from "@/lib/labo/client";
import { formatMs } from "@/lib/labo/format";
import type { ReleaseDetection } from "@/lib/release/detect";

const fr = { labo };

const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-base uppercase md:text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:max-w-xs";

/** Release detection by ISRC: Deezer → iTunes → MusicBrainz → Odesli. */
export function ReleasePanel() {
  const t = fr.labo.release;
  const [result, setResult] = useState<ReleaseDetection | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const isrc = String(new FormData(event.currentTarget).get("isrc") ?? "");
    setPending(true);
    const response = await requestRelease(isrc);
    setPending(false);
    if (response.ok) setResult(response.data);
    else toast.error(fr.labo.errors[response.error]);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.hint}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <form onSubmit={onSubmit} className="grid gap-3">
          <label htmlFor="isrc" className="text-sm font-medium">
            {t.label}
          </label>
          <div className="flex flex-wrap gap-3">
            <input
              id="isrc"
              name="isrc"
              required
              autoComplete="off"
              spellCheck={false}
              placeholder={t.placeholder}
              className={fieldClass}
            />
            <Button type="submit" disabled={pending}>
              {pending ? t.pending : t.submit}
            </Button>
          </div>
        </form>

        {result && (
          <div className="grid gap-6">
            <div className="grid gap-1">
              <p
                className={
                  result.online ? "font-medium" : "font-medium text-error"
                }
              >
                {result.online ? t.online(result.links.length) : t.offline}
              </p>
              {result.track && (
                <p className="text-sm text-muted-foreground">
                  {result.track.artist} — {result.track.title} ·{" "}
                  {result.track.album}
                  {result.track.releaseDate &&
                    ` · ${t.releaseDate} ${result.track.releaseDate}`}
                </p>
              )}
            </div>

            {result.links.length > 0 && (
              <section className="grid gap-2">
                <h3 className="text-sm font-medium">{t.links}</h3>
                <ul className="grid gap-1.5 text-sm">
                  {result.links.map((link) => (
                    <li
                      key={link.platform}
                      className="flex flex-wrap items-baseline gap-x-2"
                    >
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium underline underline-offset-4"
                      >
                        {t.platforms[link.platform]}
                      </a>
                      <span className="text-xs text-muted-foreground">
                        {t.via} {t.sources[link.source]}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="grid gap-1">
              <h3 className="text-sm font-medium">{t.smartlink}</h3>
              {result.smartlinkUrl ? (
                <a
                  href={result.smartlinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline underline-offset-4"
                >
                  {result.smartlinkUrl}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t.smartlinkNone}
                </p>
              )}
            </section>

            <section className="grid gap-2">
              <h3 className="text-sm font-medium">{t.steps}</h3>
              <ul className="grid gap-1 text-xs">
                {result.steps.map((step) => (
                  <li
                    key={step.source}
                    className="grid grid-cols-[10rem_4rem_1fr] gap-2"
                  >
                    <span>{t.sources[step.source]}</span>
                    <span
                      className={
                        step.status === "error"
                          ? "font-medium text-error"
                          : "font-mono"
                      }
                    >
                      {t.status[step.status]}
                    </span>
                    <span className="text-muted-foreground">
                      {step.detail
                        ? (t.details[step.detail] ?? step.detail)
                        : formatMs(step.durationMs)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
