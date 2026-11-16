"use client";

import { IconBell, IconCheck } from "nucleo-sharp-essential";

import { usePushSubscription } from "@/components/notifications/use-push-subscription";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { notifications } from "@/lib/i18n/fr/notifications";
import { onboarding } from "@/lib/i18n/fr/onboarding";

import type { OnboardingProfile } from "./onboarding-provider";

const fr = { notifications, onboarding };

const note =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]";

function Lede({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-pretty text-[color:var(--text-secondary)] md:text-[length:var(--type-body-lg)] md:leading-[27px]">
      {children}
    </p>
  );
}

// What to read on one screen of the presentation.
export function OnboardingText({
  step,
  profile,
}: {
  step: number;
  profile: OnboardingProfile;
}) {
  const t = fr.onboarding;
  const copy = t.variants[profile.variant];
  const title = [
    t.greeting(profile.firstName),
    t.journeyTitle,
    t.nowTitle,
    t.poTitle,
  ][step];

  return (
    <div className="flex flex-col gap-3.5 modern:gap-4">
      <DialogTitle className="text-[length:var(--type-display-md)] leading-[var(--type-display-md-lh)] font-medium tracking-[var(--type-display-tracking)] text-balance md:text-[length:var(--type-display-lg)] md:leading-[var(--type-display-lg-lh)]">
        {title}
      </DialogTitle>
      {step === 0 && (
        <>
          <Lede>
            {t.welcome}{" "}
            {profile.roleLabel && (
              <>
                {t.yourRole}{" "}
                <b className="font-semibold text-[color:var(--text-primary)]">
                  {profile.roleLabel}
                </b>
                .{" "}
              </>
            )}
            {copy.lead}
          </Lede>
          <p className={note}>{t.intro}</p>
        </>
      )}
      {step === 1 && (
        <>
          <Lede>{t.journeyLede}</Lede>
          {profile.variant !== "member" && (
            <p className={note}>{t.journeyMine}</p>
          )}
        </>
      )}
      {step === 2 && (
        <>
          <Lede>{copy.now}</Lede>
          <OnboardingPush publicKey={profile.pushKey} />
        </>
      )}
      {step === 3 && (
        <>
          <Lede>{copy.po.lede}</Lede>
          <p className={note}>
            {t.poQuestion}{" "}
            <span className="mx-0.5 inline-flex gap-1 align-middle">
              <Kbd raised>{t.poSpace}</Kbd>
              <Kbd raised>{t.poSpace}</Kbd>
            </span>{" "}
            {t.poOpens}
          </p>
        </>
      )}
    </div>
  );
}

// Offers this browser's notifications where they make sense. Nothing when push
// is not set up or not supported: the presentation does not explain a missing
// feature.
function OnboardingPush({ publicKey }: { publicKey: string | null }) {
  const t = fr.onboarding.push;
  const push = fr.notifications.push;
  const { state, busy, enable } = usePushSubscription(publicKey);
  if (state === "loading" || state === "unsupported") return null;

  const text =
    "min-w-44 flex-1 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]";
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--surface-soft)] px-3.5 py-3 modern:px-4">
      {state === "denied" && <p className={text}>{push.denied}</p>}
      {state === "on" && (
        <>
          <p className={text}>{t.on}</p>
          <span className="inline-flex items-center gap-1.5 text-[length:var(--type-caption)] font-semibold text-[color:var(--tone-success-fg)]">
            <IconCheck aria-hidden className="size-4" />
            {push.enabled}
          </span>
        </>
      )}
      {(state === "off" || state === "failed") && (
        <>
          <p className={text}>{state === "failed" ? push.failed : t.ask}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={enable}
            disabled={busy}
            aria-busy={busy || undefined}
          >
            <IconBell aria-hidden data-icon="inline-start" />
            {busy ? push.enabling : push.enable}
          </Button>
        </>
      )}
    </div>
  );
}
