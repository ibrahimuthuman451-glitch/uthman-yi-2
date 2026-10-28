"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type AdminNavItem = { href: string; label: string; badge?: number };

export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Administration" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {items.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-10 shrink-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-600 text-white"
                : "text-navy-200 hover:bg-white/10 hover:text-white",
            )}
          >
            <span className="whitespace-nowrap">{item.label}</span>
            {typeof item.badge === "number" && item.badge > 0 ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  active ? "bg-white/20 text-white" : "bg-brand-500/20 text-brand-100",
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
