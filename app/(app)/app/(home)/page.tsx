import { Suspense } from "react";

import { HomeFeed } from "@/components/home/home-feed";
import { HomeFrame } from "@/components/home/home-frame";
import { CardGridSkeleton } from "@/components/ui/card-grid";
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
    >
      <Suspense fallback={<CardGridSkeleton label={fr.auth.common.loading} />}>
        <HomeFeed access={access} />
      </Suspense>
    </HomeFrame>
  );
}
