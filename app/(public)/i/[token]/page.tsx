import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicAgreement } from "@/components/activations/influence/public-agreement";
import { getPublicAgreement } from "@/lib/activations/influence/public";
import { fr } from "@/lib/i18n/fr";

const t = fr.activationInfluence.public;

// The creator's express agreement, opened from its link without an account
// (ticket Influence § 8). Never indexed, no referrer : the token is the key.
export const metadata: Metadata = {
  title: `${t.title} · ${fr.app.name}`,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function InfluenceAgreementPage({
  params,
}: PageProps<"/i/[token]">) {
  const { token } = await params;
  const agreement = await getPublicAgreement(token);
  if (!agreement) notFound();
  return (
    <main className="flex flex-1 justify-center bg-muted/40 px-4 py-8 sm:py-16">
      <div className="flex w-full max-w-lg flex-col gap-5">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {t.title}
          </h1>
          {agreement.state === "open" && (
            <p className="text-muted-foreground">
              {t.intro(
                agreement.content.creator,
                agreement.content.campaign,
                agreement.content.project,
              )}
            </p>
          )}
        </header>
        {agreement.state === "open" ? (
          <PublicAgreement token={token} agreement={agreement} />
        ) : (
          <p className="rounded-2xl border bg-background p-6 font-medium">
            {t.states[agreement.state]}
          </p>
        )}
      </div>
    </main>
  );
}
