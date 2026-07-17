"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { NAV_LINKS } from "@/lib/nav";

/** Hamburger → dropdown for narrow screens. Closes on route change + Escape. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close whenever the route changes (a link was tapped).
  useEffect(() => setOpen(false), [pathname]);

  // Escape closes; lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-text transition-colors hover:border-brand">
        <span className="relative block h-4 w-5" aria-hidden>
          <span
            className={`absolute left-0 h-0.5 w-5 bg-text transition-all duration-base ${
              open ? "top-1.5 rotate-45" : "top-0"
            }`}
          />
          <span
            className={`absolute left-0 top-1.5 h-0.5 w-5 bg-text transition-opacity duration-base ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute left-0 h-0.5 w-5 bg-text transition-all duration-base ${
              open ? "top-1.5 -rotate-45" : "top-3"
            }`}
          />
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="animate-fade fixed inset-0 top-14 z-40 bg-bg/60 backdrop-blur-sm"
          />
          <nav
            aria-label="Mobile"
            className="animate-rise fixed inset-x-0 top-14 z-50 border-b border-border bg-surface px-6 pb-6 pt-2 shadow-lg">
            <ul className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block border-b border-border py-4 text-body font-medium text-text transition-colors hover:text-brand">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <span className="mt-5 inline-flex rounded-md bg-brand px-3 py-2 text-small font-medium text-on-brand">
              📱 Android app — coming to Google Play
            </span>
          </nav>
        </>
      ) : null}
    </div>
  );
}
