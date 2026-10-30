"use client";

import { IconCheck } from "nucleo-sharp-essential";
import { useEffect, useState } from "react";

import { NowFrame } from "@/components/shell/journey/now-card";
import { PdsLogo } from "@/components/shell/pds-logo";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { WelcomeVariant } from "@/lib/home/welcome";
import { onboarding } from "@/lib/i18n/fr/onboarding";
import { myValidationTone, overdueTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";

import { OnboardingJourney } from "./onboarding-journey";
import type { OnboardingProfile } from "./onboarding-provider";

const fr = { onboarding };

const card =
  "rounded-[14px] border border-[color:var(--border-default)] bg-[var(--surface-raised)] p-[18px]";
const micro =
  "text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]";

// The button « presses itself », then gives way to its result.
const PO_RESULT_MS = 1950;

const dayIn = (days: number) => formatDay(new Date(Date.now() + days * 864e5));

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// The right-hand side of a screen: a piece of the real app, in small.
export function OnboardingVisual({
  step,
  profile,
}: {
  step: number;
  profile: OnboardingProfile;
}) {
  return (
    <div className="flex w-full max-w-[380px] flex-col gap-3">
      {step === 0 && <MemberVisual profile={profile} />}
      {step === 1 && (
        <OnboardingJourney variant={profile.variant} name={profile.name} />
      )}
      {step === 2 && <NowVisual variant={profile.variant} />}
      {step === 3 && <PoVisual profile={profile} />}
    </div>
  );
}

function MemberVisual({ profile }: { profile: OnboardingProfile }) {
  const t = fr.onboarding;
  return (
    <div className={`${card} onboarding-rise flex flex-col gap-4`}>
      <div className="flex items-center gap-3.5">
        <Avatar
          name={profile.name}
          pictureUrl={null}
          className="size-14 bg-primary text-[length:var(--type-body-lg)] text-primary-foreground"
        />
        <div className="flex min-w-0 flex-col items-start gap-1">
          <p className="truncate text-[length:var(--type-display-sm)] leading-[26px] tracking-[-0.03em]">
            {profile.name}
          </p>
          {profile.roleLabel && (
            <StatusBadge tone="info" size="sm">
              {profile.roleLabel}
            </StatusBadge>
          )}
        </div>
      </div>
      <p className={micro}>{t.doesLabel}</p>
      <ul className="onboarding-stagger flex flex-col gap-2.5 [--stagger-start:260ms] [--stagger-step:90ms]">
        {t.variants[profile.variant].does.map((item) => (
          <li
            key={item}
            className="onboarding-rise flex items-center gap-2.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]"
          >
            <span className="grid size-[22px] shrink-0 place-items-center rounded-[var(--radius-circle)] bg-[var(--selection-bg)] text-[color:var(--selection)]">
              <IconCheck aria-hidden className="size-3.5" />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NowVisual({ variant }: { variant: WelcomeVariant }) {
  const t = fr.onboarding.nowCard;
  const { notification, nowExample: example } = fr.onboarding.variants[variant];
  const due = example.dueInDays;
  const late = due !== null && due < 0;
  const secondary =
    "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]";

  return (
    <>
      <div className="onboarding-notification flex items-start gap-2.5 rounded-xl border border-[color:var(--border-default)] bg-[var(--surface-glass)] px-3 py-2.5 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] backdrop-blur-[var(--glass-panel-blur)]">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--nav-brand-bg)] text-[color:var(--nav-brand-fg)]">
          <PdsLogo className="w-4" />
        </span>
        <span className="min-w-0">
          <b className="block font-semibold">{notification.title}</b>
          <span className="text-[color:var(--text-secondary)]">
            {notification.body}
          </span>
        </span>
      </div>
      <div className="onboarding-rise [--stagger-start:120ms]">
        <NowFrame label={t.label}>
          <div className={`flex flex-wrap items-center gap-2 ${secondary}`}>
            <StatusBadge tone="info">{t.mine}</StatusBadge>
            {late && (
              <StatusBadge tone={overdueTone} size="sm">
                {t.late}
              </StatusBadge>
            )}
            {example.kind === "validate" && (
              <StatusBadge tone={myValidationTone} size="sm">
                {t.toValidate}
              </StatusBadge>
            )}
            <span>
              {example.where}
              {due !== null &&
                ` · ${late ? t.expected(dayIn(due)) : t.before(dayIn(due))}`}
            </span>
          </div>
          <h3 className="text-[length:var(--type-body-lg)] leading-6 font-medium tracking-[var(--type-display-tracking)] text-balance">
            {example.title}
          </h3>
          <p className={`${secondary} text-pretty`}>{example.why}</p>
          <p className={secondary}>
            {t.then} :{" "}
            <b className="font-semibold text-[color:var(--text-primary)]">
              {example.then}
            </b>
          </p>
          <div>
            <Button>{t.open}</Button>
          </div>
        </NowFrame>
      </div>
    </>
  );
}

function PoVisual({ profile }: { profile: OnboardingProfile }) {
  const po = fr.onboarding.variants[profile.variant].po;
  const [resolved, setResolved] = useState(prefersReducedMotion);

  useEffect(() => {
    if (resolved) return;
    const timer = window.setTimeout(() => setResolved(true), PO_RESULT_MS);
    return () => window.clearTimeout(timer);
  }, [resolved]);

  return (
    <div className={`${card} onboarding-rise flex flex-col gap-1.5`}>
      <p className="flex flex-wrap gap-1.5 text-[length:var(--type-micro)] text-[color:var(--text-secondary)]">
        {po.place.map((part, index) => (
          <span key={part} className="flex gap-1.5">
            {index > 0 && <span aria-hidden>›</span>}
            <span
              className={
                index === po.place.length - 1
                  ? "text-[color:var(--text-primary)]"
                  : undefined
              }
            >
              {part}
            </span>
          </span>
        ))}
      </p>
      <span className="inline-flex h-6 w-fit items-center rounded-pill bg-[var(--selection-bg)] px-2.5 text-[length:var(--type-micro)] font-semibold text-[color:var(--selection)]">
        {po.chip}
      </span>
      <div className="onboarding-stagger flex flex-col [--stagger-start:180ms] [--stagger-step:160ms]">
        {po.facts.map((fact) => (
          <div
            key={fact.label}
            className="onboarding-rise flex flex-col gap-0.5 py-2"
          >
            <span className={micro}>{fact.label}</span>
            <span className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] font-semibold">
              {"day" in fact ? dayIn(fact.day) : fact.value}
            </span>
            <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-secondary)]">
              {fact.source}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex min-h-10 items-center">
        {resolved ? (
          <p className="onboarding-rise flex items-start gap-2 rounded-xl bg-[var(--tone-success-bg)] px-3 py-2 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--tone-success-fg)]">
            <IconCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
            {po.done(profile.name)}
          </p>
        ) : (
          <Button size="sm" className="onboarding-press">
            {po.action}
          </Button>
        )}
      </div>
    </div>
  );
}
