"use client";
import { useEffect, useState } from "react";

type Stats = {
  books: number;
  completed: number;
  totalPagesRead: number;
  avgPercentage: number;
  today: { pages: number; minutes: number };
  goal: { type: "pages" | "minutes"; value: number; progress: number };
  notification: string | null;
};

export default function StatsClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [goalType, setGoalType] = useState<"pages" | "minutes">("pages");
  const [goalValue, setGoalValue] = useState(20);

  const load = async () => {
    const r = await fetch("/api/stats");
    const j: Stats = await r.json();
    setStats(j);
    setGoalType(j.goal.type);
    setGoalValue(j.goal.value);
  };
  useEffect(() => { load(); }, []);

  const saveGoal = async () => {
    await fetch("/api/goal", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: goalType, value: goalValue }),
    });
    load();
  };

  if (!stats) {
    return (
      <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <div className="p-6 text-sm" style={{ color: "var(--text-subtle)" }}>Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <div className="p-6 max-w-3xl mx-auto w-full space-y-6">
        <h1 className="text-3xl font-semibold">Stats &amp; Goals</h1>

        {stats.notification && (
          <div className="rounded-xl border border-amber-700/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            🔔 {stats.notification}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Books" value={stats.books} />
          <Stat label="Completed" value={stats.completed} />
          <Stat label="Pages read" value={stats.totalPagesRead} />
          <Stat label="Avg progress" value={`${stats.avgPercentage}%`} />
        </div>

        <section
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-secondary)" }}
        >
          <h2 className="font-medium mb-3">Daily goal</h2>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <select
              value={goalType}
              onChange={(e) => setGoalType(e.target.value as "pages" | "minutes")}
              className="px-2.5 py-1.5 text-sm rounded-lg"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-secondary)",
                color: "var(--text-primary)",
              }}
            >
              <option value="pages">Pages</option>
              <option value="minutes">Minutes</option>
            </select>
            <input
              type="number"
              min={1}
              max={1000}
              value={goalValue}
              onChange={(e) => setGoalValue(Number(e.target.value) || 1)}
              className="w-24 px-2.5 py-1.5 text-sm rounded-lg"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-secondary)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={saveGoal}
              className="px-3 py-1.5 text-sm rounded-lg font-medium"
              style={{
                background: "var(--accent-bg)",
                color: "var(--accent-text)",
              }}
            >
              Save
            </button>
          </div>
          <div className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
            Today: {stats.today.pages} pages · {stats.today.minutes} min ({stats.goal.progress}% of goal)
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-badge)" }}>
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
              style={{ width: `${stats.goal.progress}%` }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-secondary)" }}
    >
      <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text-subtle)" }}>{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
