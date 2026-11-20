import { EntrySplashPlayer } from "@/components/shell/entry-splash-player";
import { BeforePaintScript } from "@/components/ui/before-paint-script";
import { routes } from "@/lib/auth/redirects";

// Where someone enters the app. Shared pages (/d, /s…) and the other screens of
// the access flow never play it.
const ENTRY_PATHS = [routes.home, routes.login, routes.signup, routes.app];

// Decides before the first paint, as the theme does: a splash decided after
// hydration would let the page flash first. Once per tab session; this is a
// display convenience, not business data. Storage refused: no splash.
const decide = `(function(){try{var p=location.pathname;var a=${JSON.stringify(ENTRY_PATHS)};if((a.indexOf(p)>=0||p.indexOf(${JSON.stringify(routes.app + "/")})===0)&&!sessionStorage.getItem("pds-entry-seen")){sessionStorage.setItem("pds-entry-seen","1");var r=document.documentElement;r.dataset.entryAt=String(performance.now());r.dataset.entry="hold"}}catch(e){}})()`;

// Entry animation of the app (docs/DESIGN.md § 4, « Écran d'entrée »), first thing in <body> so
// it covers the page from the first bytes.
export function EntrySplash() {
  return (
    <>
      <BeforePaintScript code={decide} />
      <EntrySplashPlayer />
    </>
  );
}
