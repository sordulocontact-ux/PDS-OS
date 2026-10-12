import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicPackageView } from "@/components/master-workflow/public-package";
import { fr } from "@/lib/i18n/fr";
import {
  getPublicPackage,
  noteOpened,
} from "@/lib/master-workflow/transmission-public";

const t = fr.masterWorkflow.publicPackage;

// The package sent to the mix engineer, opened from its link without an
// account (Master, lot 4). Never indexed, no referrer: the token is the key.
export const metadata: Metadata = {
  title: `${t.pageTitle} · ${fr.app.name}`,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function MasterPackagePage({
  params,
}: PageProps<"/m/[token]">) {
  const { token } = await params;
  const data = await getPublicPackage(token);
  if (!data) notFound();
  if (data.state === "open" || data.state === "received")
    await noteOpened(token);

  return (
    <main className="flex flex-1 justify-center bg-muted/40 px-4 py-12 sm:py-16">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {data.state === "open" || data.state === "received"
              ? t.title[data.package.role]
              : t.pageTitle}
          </h1>
          {(data.state === "open" || data.state === "received") && (
            <p className="text-muted-foreground">
              {t.intro[data.package.role](
                data.package.project,
                data.package.engineer,
              )}
            </p>
          )}
        </header>
        {data.state === "open" || data.state === "received" ? (
          <PublicPackageView token={token} data={data} />
        ) : (
          <p className="text-muted-foreground">{t[data.state]}</p>
        )}
      </div>
    </main>
  );
}
