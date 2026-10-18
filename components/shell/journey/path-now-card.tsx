"use client";

import { usePathname } from "next/navigation";

import { NowCard, type NowCardProps } from "./now-card";

/**
 * NowCard for a layout, which does not know the page open below it: the
 * step shown is the one whose URL is the current path (the Production's
 * deliverable layout), so « Maintenant » never repeats it.
 */
export function PathNowCard(props: Omit<NowCardProps, "shownKey">) {
  const pathname = usePathname();
  const shown = props.steps.find((s) => s.href === pathname)?.key;
  return <NowCard {...props} shownKey={shown} />;
}
