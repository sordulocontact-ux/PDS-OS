import { notFound } from "next/navigation";

import { LaboBench } from "@/components/labo/labo-bench";
import { ReleasePanel } from "@/components/labo/release-panel";
import { fr } from "@/lib/i18n/fr";
import { isLaboEnabled } from "@/lib/labo/guard";

export const metadata = { title: `${fr.labo.title} · ${fr.app.name}` };

export default function LaboPage() {
  if (!isLaboEnabled) notFound();

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 p-4 sm:p-8">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold">{fr.labo.title}</h1>
        <p className="text-sm text-muted-foreground">{fr.labo.description}</p>
        <p role="note" className="text-sm font-medium">
          {fr.labo.warning}
        </p>
      </header>
      <section className="grid gap-4">
        <h2 className="text-lg font-semibold">{fr.labo.sections.audio}</h2>
        <LaboBench />
      </section>
      <section className="grid gap-4">
        <h2 className="text-lg font-semibold">{fr.labo.sections.release}</h2>
        <ReleasePanel />
      </section>
    </main>
  );
}
