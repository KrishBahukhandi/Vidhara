"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * A primary-navigation link that knows whether it is where you are.
 *
 * The header carried no active state at all, so on /acts/ipc/302 — three levels
 * into the library — nothing in the chrome said "Bare Acts". On a site that is
 * mostly one enormous section tree, that is the single orientation cue the
 * reader needs most, and it costs one attribute: `aria-current="page"`, which
 * is also what a screen reader announces.
 *
 * A link owns its whole subtree, since a section page IS the Bare Acts branch —
 * matching the path exactly would light nothing up on the pages people actually
 * spend their time on. "/" is the exception: every path starts with it.
 */
export function NavLink({
  href,
  children,
  className = "",
  activeClassName = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${className}${active ? ` ${activeClassName}` : ""}`}>
      {children}
    </Link>
  );
}
