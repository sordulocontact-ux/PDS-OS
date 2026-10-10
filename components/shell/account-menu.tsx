"use client";

import { IconCircleLogout, IconMsgSmile } from "nucleo-sharp-essential";
import { useTransition } from "react";

import { useOpenFeedback } from "@/components/feedback/feedback-provider";
import { navItemClass } from "@/components/shell/nav-item";
import { useThemeChoice } from "@/components/shell/use-theme-choice";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/actions";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

// Bottom of the desktop sidebar (Figma "PDS OS", node 47:12055): the signed-in
// person's avatar and name, opening a menu with who they are, "Envoyer un
// retour", the theme and "Se déconnecter". Collapsed, the avatar alone. The mobile drawer
// keeps UserPanel, which has room to list the same things.
export function AccountMenu({
  name,
  email,
  collapsed,
}: {
  name: string;
  email: string | null;
  collapsed: boolean;
}) {
  const openFeedback = useOpenFeedback();
  const [signingOut, startSignOut] = useTransition();
  const theme = useThemeChoice();
  const t = fr.shell.account;
  const shownName = name || t.fallbackName;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.open(shownName)}
        className={cn(
          navItemClass,
          "min-w-0 cursor-pointer aria-expanded:bg-[var(--nav-item-active-bg)]",
          collapsed ? "justify-center px-0" : "flex-1",
        )}
      >
        <Avatar name={shownName} pictureUrl={null} />
        {!collapsed && <span className="truncate">{shownName}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="max-w-72">
        <div className="min-w-0 px-3 py-2">
          <p className="truncate text-body-md font-medium">{shownName}</p>
          {email && (
            <p className="truncate text-caption text-[color:var(--nav-fg-muted)]">
              {email}
            </p>
          )}
        </div>
        <DropdownMenuItem onClick={() => openFeedback()}>
          <IconMsgSmile aria-hidden />
          {fr.feedback.navLink}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={theme.value}
          onValueChange={theme.setValue}
        >
          <DropdownMenuGroupLabel>{theme.label}</DropdownMenuGroupLabel>
          {theme.options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={signingOut}
          onClick={() => startSignOut(() => signOut())}
        >
          <IconCircleLogout aria-hidden />
          {signingOut ? fr.auth.common.loading : fr.auth.common.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
