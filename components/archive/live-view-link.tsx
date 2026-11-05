import Link from "next/link";

import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { records } from "@/lib/i18n/fr/records";

const fr = { records };

/** Back from an empty archive to the live rows: the filter button that
 * leads there is not shown without a row. */
export function LiveViewLink({ href }: { href: string }) {
  return (
    <Link href={href} className={buttonVariants({ variant: "outline" })}>
      <ButtonRoll>{fr.records.view.showLive}</ButtonRoll>
    </Link>
  );
}
