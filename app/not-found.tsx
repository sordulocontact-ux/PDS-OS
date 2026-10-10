import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

const t = fr.errors.notFound;

// Outside the app's shell (a public link, an unknown address).
export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-content-center gap-4 p-6 text-center">
      <h1 className="text-display-sm font-medium">{t.title}</h1>
      <p className="text-muted-foreground">{t.body}</p>
      <Link
        href={routes.app}
        className={buttonVariants({ className: "justify-self-center" })}
      >
        {t.home}
      </Link>
    </main>
  );
}
