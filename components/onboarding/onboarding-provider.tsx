"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "@/components/ui/toast";

import type { WelcomeVariant } from "@/lib/home/welcome";
import { dismissWelcome } from "@/lib/home/welcome-actions";
import { onboarding } from "@/lib/i18n/fr/onboarding";

const fr = { onboarding };

const OnboardingDialog = dynamic(() =>
  import("@/components/onboarding/onboarding-dialog").then(
    (module) => module.OnboardingDialog,
  ),
);

// How long « Maintenant » stays lit after the presentation, showing where to start.
const SPOT_MS = 1800;

export type OnboardingProfile = {
  variant: WelcomeVariant;
  firstName: string | null;
  name: string;
  roleLabel: string | null;
  pushKey: string | null;
};

type Onboarding = {
  // The first connection: once, kept closed by the database when it ends.
  startFirst: () => void;
  replay: () => void;
};

const OnboardingContext = createContext<Onboarding | null>(null);

// Null when nobody is signed in: there is then nothing to present.
export function useOnboarding() {
  return useContext(OnboardingContext);
}

function lightNowCard() {
  const card = document.querySelector("[data-now-card]");
  if (!card) return;
  card.classList.add("now-spot");
  window.setTimeout(() => card.classList.remove("now-spot"), SPOT_MS);
}

export function OnboardingProvider({
  profile,
  children,
}: {
  profile: OnboardingProfile | null;
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<{
    key: number;
    first: boolean;
    open: boolean;
  } | null>(null);
  // The home in the router's cache still says « first connection » after it ended.
  const firstShown = useRef(false);

  const startFirst = useCallback(() => {
    if (firstShown.current) return;
    firstShown.current = true;
    setSession({ key: 0, first: true, open: true });
  }, []);
  const replay = useCallback(() => {
    setSession((current) => ({
      key: (current?.key ?? 0) + 1,
      first: false,
      open: true,
    }));
  }, []);
  const value = useMemo(() => ({ startFirst, replay }), [startFirst, replay]);

  function close(skipped: boolean) {
    setSession((current) => current && { ...current, open: false });
    lightNowCard();
    if (!session?.first) return;
    // Not kept (network): it simply comes back at the next visit.
    dismissWelcome().catch(() => undefined);
    if (skipped) toast(fr.onboarding.skippedToast);
  }

  return (
    <OnboardingContext.Provider value={profile ? value : null}>
      {children}
      {profile && session && (
        <OnboardingDialog
          key={session.key}
          open={session.open}
          profile={profile}
          onClose={close}
        />
      )}
    </OnboardingContext.Provider>
  );
}

// On the home of a new member: opens the presentation, after the entry splash
// if it is playing (components/shell/entry-splash.tsx).
export function OnboardingAutoOpen() {
  const onboardingContext = useOnboarding();
  const startFirst = onboardingContext?.startFirst;

  useEffect(() => {
    if (!startFirst) return;
    const root = document.documentElement;
    if (!root.dataset.entry) return startFirst();
    const observer = new MutationObserver(() => {
      if (root.dataset.entry) return;
      observer.disconnect();
      startFirst();
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-entry"],
    });
    return () => observer.disconnect();
  }, [startFirst]);

  return null;
}
