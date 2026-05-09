"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SidebarBookList({
  initial,
}: {
  initial: { id: string; title: string }[];
}) {
  const pathname = usePathname();
  return (
    <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-3 space-y-0.5">
      {initial.length === 0 && (
        <p className="text-xs px-2 py-2" style={{ color: "var(--text-faint)" }}>No books yet. Upload your first PDF.</p>
      )}
      {initial.map((b) => {
        const active = pathname === `/reader/${b.id}`;
        return (
          <Link
            key={b.id}
            href={`/reader/${b.id}`}
            className="block truncate text-sm px-2 py-1.5 rounded-md transition"
            style={{
              background: active ? "var(--bg-active)" : "transparent",
              color: active ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: active ? 500 : 400,
            }}
            title={b.title}
          >
            {b.title}
          </Link>
        );
      })}
    </div>
  );
}
