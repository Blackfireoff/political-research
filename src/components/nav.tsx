"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DocumentIcon, InfoIcon, NewsIcon } from "./icons";

const LINKS = [
  { href: "/", label: "Actualité", icon: NewsIcon },
  { href: "/programmes", label: "Programmes", icon: DocumentIcon },
  { href: "/methode", label: "Méthode", icon: InfoIcon },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Navigation d'en-tête, grands écrans. */
export function TopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation principale" className="hidden gap-6 text-sm lg:flex">
      {LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(pathname, href) ? "page" : undefined}
          className="py-2 text-graphite hover:text-ink aria-[current=page]:text-ink aria-[current=page]:underline aria-[current=page]:underline-offset-8"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Barre d'onglets en bas de l'écran, à portée de pouce sur smartphone. */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className="flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-graphite aria-[current=page]:text-ink aria-[current=page]:font-semibold"
            >
              <Icon className="size-[22px]" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
