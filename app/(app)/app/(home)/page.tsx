import { Suspense } from "react";

import { HomeFeed } from "@/components/home/home-feed";
import { HomeFeedSkeleton } from "@/components/home/home-feed-skeleton";
import { HomeFrame } from "@/components/home/home-frame";
import { HomeSummary } from "@/components/home/home-summary";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";

export default async function AppHomePage() {
  const access = await requireApproved();
  const t = fr.shell.home;

  return (
    <HomeFrame
      title={
        access.firstName ? t.welcome(access.firstName) : t.welcomeAnonymous
      }
      subtitle={
        <Suspense fallback={t.body}>
          <HomeSummary access={access} />
        </Suspense>
      }
    >
      <Suspense fallback={<HomeFeedSkeleton />}>
        <HomeFeed access={access} />
      </Suspense>
    </HomeFrame>
  );
}
