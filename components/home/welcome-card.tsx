"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { sectionCardClass } from "@/components/ui/section-card";
import { routes } from "@/lib/auth/redirects";
import type { WelcomeVariant } from "@/lib/home/welcome";
import { dismissWelcome } from "@/lib/home/welcome-actions";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

// Where each point leads, in the order of its texts.
const HREFS: Record<WelcomeVariant, (string | null)[]> = {
  direction: [routes.projects, routes.work, routes.feedback],
  pilot: [routes.projects, routes.projects, routes.work],
  creative: [routes.work, routes.projects, null],
  member: [routes.projects, routes.work, null],
};

/**
 * « Bienvenue » on the home of a new member (UX test of 09/10/2026: no
 * hand-holding): three points for what they may do. Closed at once on
 * « J'ai compris », kept closed by the database.
 */
export function WelcomeCard({ variant }: { variant: WelcomeVariant }) {
  const t = fr.shell.home.welcomeCard;
  const [hidden, setHidden] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  if (hidden) return null;

  return (
    <section
      aria-labelledby="welcome-title"
      className={cn(sectionCardClass, "flex flex-col gap-4")}
    >
      <div className="flex flex-col gap-1">
        <h2
          id="welcome-title"
          className="text-body-lg font-semibold text-ink-800"
        >
          {t.title}
        </h2>
        <p className="text-body-md text-[color:var(--text-secondary)]">
          {t.intro}
        </p>
      </div>
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-body-md text-ink-800">
        {t[variant].map((point, index) => {
          const href = HREFS[variant][index];
          return (
            <li key={point.text}>
              {point.text}
              {href && point.link && (
                <>
                  {" "}
                  <Link
                    href={href}
                    className="font-semibold underline underline-offset-2"
                  >
                    {point.link}
                  </Link>
                </>
              )}
            </li>
          );
        })}
      </ol>
      {failed && <FormMessage kind="error">{t.failed}</FormMessage>}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setHidden(true);
            const { ok } = await dismissWelcome();
            if (!ok) {
              setHidden(false);
              setFailed(true);
            }
          })
        }
      >
        {t.dismiss}
      </Button>
    </section>
  );
}
