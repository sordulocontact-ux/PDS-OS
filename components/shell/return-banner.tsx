"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { shell } from "@/lib/i18n/fr/shell";
import { RETURN_PARAM, safeReturn } from "@/lib/ui/return-to";

const fr = { shell };

// The way back is a navigation convenience, kept for the tab only (never
// business data): the record's tabs do not carry the URL's parameter.
const key = (scope: string) => `retour:${scope}`;

function readStored(scope: string): string | null {
  try {
    return safeReturn(sessionStorage.getItem(key(scope)));
  } catch {
    return null;
  }
}

/**
 * On a record opened from a project step to correct it (an ISRC missing for
 * the Distribution): where the person came from, and the way back to the
 * same project and step (PROJ-BUG-10).
 */
const noSubscription = () => () => {};

export function ReturnBanner({ scope }: { scope: string }) {
  const params = useSearchParams();
  const fromUrl = safeReturn(params.get(RETURN_PARAM));
  // Read in the browser only: the server renders no banner.
  const stored = useSyncExternalStore(
    noSubscription,
    () => readStored(scope),
    () => null,
  );
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (fromUrl)
      try {
        sessionStorage.setItem(key(scope), fromUrl);
      } catch {
        // Private browsing: the banner still works on this page.
      }
  }, [fromUrl, scope]);
  const back = dismissed ? null : (fromUrl ?? stored);
  if (!back) return null;
  const t = fr.shell.returnTo;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--tone-info-bg)] px-4 py-3 text-body-md font-medium text-[color:var(--tone-info-fg)]"
    >
      <span>{t.body}</span>
      <span className="flex gap-2">
        <Link href={back} className={buttonVariants({ size: "sm" })}>
          <ButtonRoll>{t.back}</ButtonRoll>
        </Link>
        <button
          type="button"
          className={buttonVariants({ size: "sm", variant: "ghost" })}
          onClick={() => {
            try {
              sessionStorage.removeItem(key(scope));
            } catch {
              // Nothing kept.
            }
            setDismissed(true);
          }}
        >
          <ButtonRoll>{t.dismiss}</ButtonRoll>
        </button>
      </span>
    </div>
  );
}

/** After a correction is saved on the record: back to where it was asked. */
export function useReturnAfterSave(scope: string) {
  const router = useRouter();
  return () => {
    const back = readStored(scope);
    if (back) router.push(back);
  };
}
