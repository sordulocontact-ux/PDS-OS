// NavItem, Figma "Desktop - 11": 40 px, 20 px icon, grey fill when active.
// Shared by the main navigation and the links of the user panel. New style
// (docs/STYLE-FINANCE-PARTOUT.md § 4.2): 36 px, 15 px, 18 px icon (Sacha,
// 16/11/2026: 40 px looked stretched, 32 px with 14 px far too small).
export const navItemClass =
  "flex items-center gap-2 rounded-lg px-4 py-2 text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-medium text-[color:var(--nav-fg)] modern:min-h-9 modern:gap-2.5 modern:px-3 modern:py-1.5 no-underline transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--nav-item-hover-bg)]";

export const navItemActiveClass =
  "bg-[var(--nav-item-active-bg)] hover:bg-[var(--nav-item-active-bg)]";
