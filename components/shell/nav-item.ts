// NavItem, Figma "Desktop - 11": 40 px, 20 px icon, grey fill when active.
// Shared by the main navigation and the links of the user panel. New style
// (docs/STYLE-FINANCE-PARTOUT.md § 4.2): 40 px, 14 px, 16 px icon, as a
// section's column.
export const navItemClass =
  "flex items-center gap-2 rounded-lg px-4 py-2 text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-medium text-[color:var(--nav-fg)] modern:min-h-10 modern:px-3 modern:py-2 modern:text-[length:var(--type-body-sm)] modern:leading-[var(--type-body-sm-lh)] no-underline transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--nav-item-hover-bg)]";

export const navItemActiveClass =
  "bg-[var(--nav-item-active-bg)] hover:bg-[var(--nav-item-active-bg)]";
