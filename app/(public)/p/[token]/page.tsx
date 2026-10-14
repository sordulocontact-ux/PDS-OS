import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProviderSpaceView } from "@/components/production/provider/provider-space";
import { fr } from "@/lib/i18n/fr";
import {
  getProviderSpace,
  noteProviderOpened,
} from "@/lib/production/provider/public";
import { formatDate } from "@/lib/release/format";

const t = fr.productionProvider;

// The provider's own space, opened from its link without an account
// (PROD-026). Never indexed, no referrer: the token is the key.
export const metadata: Metadata = {
  title: `${t.pageTitle} · ${fr.app.name}`,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ProviderSpacePage({
  params,
}: PageProps<"/p/[token]">) {
  const { token } = await params;
  const space = await getProviderSpace(token);
  if (!space) notFound();
  if (space.state === "open") await noteProviderOpened(token);

  return (
    <main className="flex flex-1 justify-center bg-muted/40 px-4 py-12 sm:py-16">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {space.state === "open" ? space.deliverable : t.pageTitle}
          </h1>
          {space.state === "open" && (
            <>
              <p className="text-muted-foreground">
                {t.intro(space.provider, space.deliverable, space.project)}
                {space.manager && ` ${t.managed(space.manager)}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {t.until(formatDate(space.expiresAt))}
              </p>
            </>
          )}
        </header>
        {space.state === "open" ? (
          <ProviderSpaceView token={token} space={space} />
        ) : (
          <p className="text-muted-foreground">
            {space.state === "replaced" ? t.replaced : t.expiredPage}
          </p>
        )}
      </div>
    </main>
  );
}
