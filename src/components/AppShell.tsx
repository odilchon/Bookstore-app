"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/library", label: "Library", icon: "❏" },
  { href: "/stats", label: "Stats", icon: "↗" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function AppShell({
  email,
  bookListSlot,
  children,
}: {
  email: string | null | undefined;
  bookListSlot: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("sidebar-collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const v = !c;
      try {
        window.localStorage.setItem("sidebar-collapsed", v ? "1" : "0");
      } catch {}
      return v;
    });
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <div
      className="flex flex-1 h-screen overflow-hidden relative"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <aside
        className="shrink-0 flex flex-col h-full overflow-hidden transition-[width] duration-200 ease-out"
        style={{
          width: collapsed ? 0 : 288,
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border-primary)",
        }}
        aria-hidden={collapsed}
      >
        <div
          className="p-4 shrink-0 flex items-start justify-between gap-2"
          style={{ borderBottom: "1px solid var(--border-primary)" }}
        >
          <div className="min-w-0">
            <Link
              href="/"
              className="text-lg font-semibold block truncate"
              style={{ color: "var(--text-heading)" }}
            >
              📚 Bookstore
            </Link>
            <p className="text-xs truncate" style={{ color: "var(--text-subtle)" }}>
              {email}
            </p>
          </div>
          <button
            onClick={toggle}
            className="px-2 py-1 rounded leading-none"
            style={{ color: "var(--text-subtle)" }}
            title="Hide sidebar"
            aria-label="Hide sidebar"
          >
            ‹
          </button>
        </div>

        <nav className="p-3 space-y-1 text-sm shrink-0">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg transition"
                style={{
                  background: active ? "var(--accent-bg)" : "transparent",
                  color: active ? "var(--accent-text)" : "var(--text-muted)",
                  fontWeight: active ? 500 : 400,
                }}
              >
                <span
                  className="w-5 h-5 inline-flex items-center justify-center text-xs"
                  style={{ color: active ? "var(--accent-text)" : "var(--text-subtle)" }}
                  aria-hidden
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div
          className="px-3 pb-2 pt-3 text-[11px] uppercase tracking-wider shrink-0"
          style={{ color: "var(--text-faint)" }}
        >
          My books
        </div>
        {bookListSlot}

        <div
          className="p-3 shrink-0"
          style={{ borderTop: "1px solid var(--border-primary)" }}
        >
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-sm py-2 rounded-lg"
            style={{
              background: "var(--bg-button)",
              color: "var(--text-muted)",
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <button
        onClick={toggle}
        className="fixed top-2 left-2 z-40 px-2.5 py-1.5 rounded-md text-sm shadow-md backdrop-blur"
        title="Show sidebar"
        aria-label="Show sidebar"
        style={{
          display: collapsed ? "block" : "none",
          border: "1px solid var(--border-secondary)",
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
        }}
      >
        ☰
      </button>

      <main
        className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden"
        style={{ background: "var(--bg-primary)" }}
      >
        {children}
      </main>
    </div>
  );
}
