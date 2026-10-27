"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { preprod } from "@/lib/i18n/fr/preprod";
import { switchPreprodAccount } from "@/lib/preprod/actions";

const fr = { preprod };

const t = fr.preprod;

export type PreprodBarAccount = { key: string; name: string; role: string };
export type PreprodBarMoment = { label: string; href: string };

const TRIGGER =
  "flex h-9 min-w-0 items-center gap-1.5 rounded-full px-3 text-body-sm font-medium outline-none hover:bg-[var(--control-bg-hover)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] data-[popup-open]:bg-[var(--control-bg-pressed)]";

/**
 * The proto's control bar on the real app (docs/protos/projet.html):
 * « Voir comme » signs in as another test account and stays on the page,
 * « Aller à » opens a prepared moment of the seeded projects. Rendered only
 * in pre-production (lib/preprod/config.ts).
 */
export function PreprodBar({
  accounts,
  currentKey,
  moments,
}: {
  accounts: PreprodBarAccount[];
  currentKey: string | null;
  moments: PreprodBarMoment[];
}) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const current = accounts.find((account) => account.key === currentKey);

  return (
    <div
      role="region"
      aria-label={t.region}
      className="surface-glass fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-40 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-1 rounded-full border border-[color:var(--border-hairline)] bg-[var(--surface-glass)] p-1 shadow-elevation-2 backdrop-blur-[var(--glass-panel-blur)] print:hidden"
    >
      <span className="px-2.5 text-caption font-semibold text-[color:var(--text-tertiary)]">
        {t.badge}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger className={TRIGGER} disabled={pending}>
          <span className="text-[color:var(--text-tertiary)]">{t.viewAs}</span>
          <span className="truncate">
            {pending ? t.switching : (current?.name ?? "—")}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="center" sideOffset={8}>
          <DropdownMenuRadioGroup
            value={currentKey ?? ""}
            onValueChange={(key: string) => {
              if (key === currentKey) return;
              startTransition(() => switchPreprodAccount(key, pathname));
            }}
          >
            {accounts.map((account) => (
              <DropdownMenuRadioItem key={account.key} value={account.key}>
                <span className="flex flex-col py-1.5">
                  <span>{account.name}</span>
                  <span className="text-caption text-[color:var(--text-tertiary)]">
                    {account.role}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger className={TRIGGER}>{t.goTo}</DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="center"
          sideOffset={8}
          className="max-w-80"
        >
          {moments.length === 0 ? (
            <DropdownMenuItem disabled>{t.noMoment}</DropdownMenuItem>
          ) : (
            moments.map((moment) => (
              <DropdownMenuItem
                key={moment.href}
                render={<Link href={moment.href} />}
              >
                {moment.label}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
