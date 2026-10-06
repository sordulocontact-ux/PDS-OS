import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicSplit } from "@/components/legal/splits/public-split";
import { fr } from "@/lib/i18n/fr";
import { getPublicSplit } from "@/lib/legal/splits/public";

const t = fr.legalSplits.public;

// A split confirmation opened from its link, without an account (ticket
// Juridique 04). Never indexed, no referrer: the token is the key.
export const metadata: Metadata = {
  title: `${t.title} · ${fr.app.name}`,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SplitConfirmationPage({
  params,
}: PageProps<"/s/[token]">) {
  const { token } = await params;
  const split = await getPublicSplit(token);
  if (!split) notFound();

  return (
    <main className="flex flex-1 justify-center bg-muted/40 px-4 py-12 sm:py-16">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {t.title}
          </h1>
          {split.state === "open" && (
            <p className="text-muted-foreground">
              {t.intro(split.person, split.content.title, split.project)}
            </p>
          )}
        </header>
        {split.state === "open" ? (
          <PublicSplit token={token} split={split} />
        ) : (
          <p className="rounded-2xl border bg-background p-6 font-medium">
            {t.states[split.state]}
          </p>
        )}
      </div>
    </main>
  );
}
