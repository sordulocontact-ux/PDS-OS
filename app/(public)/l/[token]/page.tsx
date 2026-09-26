import { IconArrowUpRight } from "@/components/icons";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { fr } from "@/lib/i18n/fr";
import { getSmartlink } from "@/lib/release/smartlink";

const t = fr.release;

// Never indexed, never cached by a shared cache: the smartlink can be turned off.
export async function generateMetadata({
  params,
}: PageProps<"/l/[token]">): Promise<Metadata> {
  const { token } = await params;
  const smartlink = await getSmartlink(token);
  return {
    title: smartlink ? `${smartlink.title} · ${smartlink.artist}` : fr.app.name,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function SmartlinkPage({
  params,
}: PageProps<"/l/[token]">) {
  const { token } = await params;
  const smartlink = await getSmartlink(token);
  if (!smartlink) notFound();

  return (
    <main className="flex flex-1 justify-center bg-muted/40 px-4 py-12 sm:items-center sm:py-16">
      <div className="w-full max-w-sm">
        <header className="mb-8 grid gap-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {smartlink.title}
          </h1>
          <p className="text-muted-foreground">{smartlink.artist}</p>
        </header>

        {smartlink.links.length > 0 ? (
          <ul className="grid gap-2.5">
            {smartlink.links.map((link) => (
              <li key={link.platform}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-13 items-center justify-between rounded-xl border bg-background px-4 font-medium transition-colors duration-150 ease-out outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span>
                    <span className="sr-only">{t.public.listen} </span>
                    {t.platforms[link.platform]}
                  </span>
                  <IconArrowUpRight
                    className="size-4 text-muted-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
                    aria-hidden
                  />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
            {t.public.empty}
          </p>
        )}
      </div>
    </main>
  );
}
