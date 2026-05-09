"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Stats = {
  user: { name: string | null; email: string | null };
  books: number;
  completed: number;
  reading: number;
  totalPagesRead: number;
  avgPercentage: number;
  today: { pages: number; minutes: number };
  week: {
    pages: number;
    minutes: number;
    days: { date: string; label: string; pages: number; minutes: number }[];
  };
  streak: number;
  goal: { type: "pages" | "minutes"; value: number; progress: number };
  recent: {
    id: string;
    title: string;
    author: string | null;
    fileType: string;
    totalPages: number;
    currentPage: number;
    percentage: number;
    status: string;
    updatedAt: string;
  }[];
  notification: string | null;
};

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", day: "2-digit", month: "short" });
}

export default function DashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [today] = useState(() => new Date());

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const greetingName = useMemo(() => {
    const raw = stats?.user.name?.trim() || stats?.user.email?.split("@")[0] || "Reader";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [stats]);

  if (!stats) {
    return (
      <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <div className="p-6 text-sm" style={{ color: "var(--text-subtle)" }}>Loading dashboard…</div>
      </div>
    );
  }

  const maxDay = Math.max(1, ...stats.week.days.map((d) => d.pages));
  const goalUnit = stats.goal.type === "pages" ? "pages" : "min";
  const goalCurrent = stats.goal.type === "pages" ? stats.today.pages : stats.today.minutes;

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Top bar: greeting + date */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Hello, {greetingName}! <span className="inline-block">👋</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-subtle)" }}>
              This is what&apos;s happening in your library this week.
            </p>
          </div>
          <div
            className="px-4 py-2 rounded-xl text-sm"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-secondary)",
              color: "var(--text-muted)",
            }}
          >
            Today, {formatDate(today)}
          </div>
        </div>

        {stats.notification && (
          <div className="rounded-xl border border-amber-700/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            🔔 {stats.notification}
          </div>
        )}

        {/* Hero grid: 4 stat cards + chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 grid grid-cols-2 gap-4">
            <StatCard
              label="Pages read"
              value={stats.totalPagesRead.toLocaleString()}
              accent="primary"
              hint="all time"
            />
            <StatCard
              label="Books"
              value={stats.books}
              accent="muted"
              hint={`${stats.reading} reading`}
            />
            <StatCard
              label="Completed"
              value={stats.completed}
              accent="muted"
              hint="finished"
              trend={stats.completed > 0 ? "up" : null}
            />
            <StatCard
              label="Avg progress"
              value={`${stats.avgPercentage}%`}
              accent="muted"
              hint="per book"
            />
          </div>

          {/* Weekly chart */}
          <div
            className="lg:col-span-2 rounded-2xl p-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-secondary)" }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-medium">Reading this week</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-subtle)" }}>Pages per day · last 7 days</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold">{stats.week.pages}</div>
                <div className="text-xs" style={{ color: "var(--text-subtle)" }}>{stats.week.minutes} min total</div>
              </div>
            </div>
            <div className="flex items-end gap-2 h-44">
              {stats.week.days.map((d, i) => {
                const h = (d.pages / maxDay) * 100;
                const isToday = i === stats.week.days.length - 1;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group">
                    <div
                      className="text-[10px] opacity-0 group-hover:opacity-100 transition"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {d.pages}
                    </div>
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className={`w-full rounded-md transition-all ${
                          isToday
                            ? "bg-emerald-500"
                            : d.pages > 0
                              ? "bg-indigo-500/80"
                              : ""
                        }`}
                        style={{
                          height: `${Math.max(4, h)}%`,
                          ...(!(isToday || d.pages > 0) && { background: "var(--bg-badge)" }),
                        }}
                        title={`${d.label}: ${d.pages} pages, ${d.minutes} min`}
                      />
                    </div>
                    <div className={`text-[11px] ${isToday ? "text-emerald-400" : ""}`}
                      style={!isToday ? { color: "var(--text-subtle)" } : {}}
                    >
                      {d.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Second row: streak + goal + reading vs done */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-secondary)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>Streak</span>
              <span className="text-xl">🔥</span>
            </div>
            <div className="text-3xl font-semibold">
              {stats.streak} <span className="text-sm font-normal" style={{ color: "var(--text-subtle)" }}>days</span>
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--text-subtle)" }}>
              {stats.streak > 0 ? "Keep the chain going" : "Start your streak today"}
            </p>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-secondary)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>Today&apos;s goal</span>
              <Link href="/stats" className="text-xs text-indigo-400 hover:text-indigo-300">Edit</Link>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold">
                {goalCurrent}
                <span className="text-sm" style={{ color: "var(--text-subtle)" }}>/{stats.goal.value}</span>
              </span>
              <span className="text-sm" style={{ color: "var(--text-subtle)" }}>{goalUnit}</span>
            </div>
            <div className="h-2 mt-3 rounded-full overflow-hidden" style={{ background: "var(--bg-badge)" }}>
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                style={{ width: `${stats.goal.progress}%` }}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--text-subtle)" }}>{stats.goal.progress}% of daily goal</p>
          </div>

          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-secondary)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>Library mix</span>
            </div>
            <DonutChart
              segments={[
                { label: "Completed", value: stats.completed, color: "#10b981" },
                { label: "Reading", value: stats.reading, color: "#6366f1" },
                {
                  label: "Not started",
                  value: Math.max(0, stats.books - stats.completed - stats.reading),
                  color: "#3f3f46",
                },
              ]}
            />
          </div>
        </div>

        {/* Recent books */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-secondary)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-medium">Continue reading</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-subtle)" }}>Recently added or updated</p>
            </div>
            <Link
              href="/library"
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{
                background: "var(--bg-badge)",
                color: "var(--text-secondary)",
              }}
            >
              Open library →
            </Link>
          </div>

          {stats.recent.length === 0 ? (
            <div className="text-sm py-8 text-center" style={{ color: "var(--text-subtle)" }}>
              No books yet.{" "}
              <Link href="/library" className="text-indigo-400 hover:text-indigo-300">
                Upload your first one
              </Link>
              .
            </div>
          ) : (
            <ul>
              {stats.recent.map((b, idx) => (
                <li
                  key={b.id}
                  className="py-3 flex items-center gap-4"
                  style={idx < stats.recent.length - 1 ? { borderBottom: "1px solid var(--border-secondary)" } : {}}
                >
                  <div className="w-10 h-12 rounded-md bg-gradient-to-br from-indigo-500/40 to-emerald-500/30 flex items-center justify-center text-xs uppercase font-semibold text-white/80 shrink-0">
                    {b.fileType}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/reader/${b.id}`}
                      className="font-medium truncate hover:text-indigo-300 transition block"
                    >
                      {b.title}
                    </Link>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-subtle)" }}>
                      {b.status === "completed"
                        ? "Completed"
                        : b.status === "reading"
                          ? `Page ${b.currentPage}${b.totalPages ? `/${b.totalPages}` : ""}`
                          : "Not started"}
                      {b.author ? ` · ${b.author}` : ""}
                    </div>
                  </div>
                  <div className="hidden sm:block w-40">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-badge)" }}>
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${b.percentage}%` }}
                      />
                    </div>
                    <div className="text-[11px] mt-1 text-right" style={{ color: "var(--text-subtle)" }}>
                      {Math.round(b.percentage)}%
                    </div>
                  </div>
                  <Link
                    href={`/reader/${b.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent: "primary" | "muted";
  trend?: "up" | "down" | null;
}) {
  const isPrimary = accent === "primary";
  return (
    <div
      className="rounded-2xl p-4 transition"
      style={{
        background: isPrimary ? "var(--stat-primary-bg)" : "var(--bg-card)",
        color: isPrimary ? "var(--stat-primary-text)" : "var(--text-primary)",
        border: isPrimary
          ? "1px solid var(--stat-primary-border)"
          : "1px solid var(--border-secondary)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>
          {label}
        </span>
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
          style={{
            background: isPrimary ? "#6366f1" : "var(--bg-badge)",
            color: isPrimary ? "#fff" : "var(--text-muted)",
          }}
          aria-hidden
        >
          ↗
        </span>
      </div>
      <div className="text-2xl font-semibold mt-2 flex items-center gap-2">
        {value}
        {trend === "up" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
            ↑
          </span>
        )}
      </div>
      {hint && (
        <div className="text-xs mt-1" style={{ color: "var(--text-subtle)" }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function DonutChart({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--bg-badge)" strokeWidth="14" />
        {total > 0 &&
          segments.map((s, i) => {
            if (s.value === 0) return null;
            const length = (s.value / total) * circumference;
            const dasharray = `${length} ${circumference - length}`;
            const dashoffset = -offset;
            offset += length;
            return (
              <circle
                key={i}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth="14"
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
                transform="rotate(-90 50 50)"
              />
            );
          })}
        <text
          x="50"
          y="54"
          textAnchor="middle"
          fontSize="16"
          fontWeight="600"
          fill="var(--donut-text)"
        >
          {total}
        </text>
      </svg>
      <ul className="text-xs space-y-1.5 flex-1 min-w-0">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: s.color }}
            />
            <span style={{ color: "var(--text-muted)" }} className="truncate">{s.label}</span>
            <span className="ml-auto font-medium" style={{ color: "var(--text-secondary)" }}>{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
