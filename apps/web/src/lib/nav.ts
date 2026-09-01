/** Where the skip link goes, and the anchor "back to top" returns to. Lives
 * here rather than in site-chrome so a client component can read it without
 * pulling the header and footer into the client bundle. */
export const MAIN_CONTENT_ID = "main-content";

/** Primary navigation — shared by the desktop bar and the mobile menu. */
export const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/search", label: "Search" },
  { href: "/acts", label: "Bare Acts" },
  { href: "/mapping", label: "IPC ⇄ BNS Mapping" },
  { href: "/daily", label: "Daily Quiz" },
  { href: "/saved", label: "Saved" },
];
