"use client";
import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";

type Prefs = {
  theme: string;
  font: string;
  fontSize: number;
  lineSpacing: number;
  background: string;
  pageAnimation: string;
  scrollBehavior: string;
  readerMode: string;
  autoScroll: boolean;
  autoScrollSpeed: number;
};

const fonts = ["serif", "sans-serif", "monospace", "Georgia", "Inter"];

export default function SettingsClient() {
  const { theme: appTheme, setTheme: setAppTheme } = useTheme();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/preferences").then((r) => r.json()).then(setPrefs);
  }, []);

  const update = async (patch: Partial<Prefs>) => {
    setPrefs((p) => (p ? { ...p, ...patch } : p));
    await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  if (!prefs) {
    return (
      <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <div className="p-6 text-sm" style={{ color: "var(--text-subtle)" }}>Loading…</div>
      </div>
    );
  }

  const selectClass = "rounded-lg px-2.5 py-1.5 text-sm";
  const selectStyle = {
    background: "var(--bg-input)",
    border: "1px solid var(--border-secondary)",
    color: "var(--text-primary)",
  };
  const numberClass = "w-20 rounded-lg px-2.5 py-1.5 text-sm";

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <div className="p-6 max-w-2xl mx-auto w-full space-y-6">
        <h1 className="text-3xl font-semibold">Settings</h1>
        {saved && <div className="text-xs text-emerald-400">Saved</div>}

        {/* ──────── App Theme ──────── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-secondary)" }}
        >
          <h2 className="font-medium mb-4">App theme</h2>
          <div className="flex items-center gap-3">
            <ThemeButton
              label="☀️ Light"
              active={appTheme === "light"}
              onClick={() => setAppTheme("light")}
            />
            <ThemeButton
              label="🌙 Dark"
              active={appTheme === "dark"}
              onClick={() => setAppTheme("dark")}
            />
          </div>
        </div>

        {/* ──────── Reading preferences ──────── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-secondary)" }}
        >
          <h2 className="font-medium mb-4">Reading preferences</h2>

          <Row label="Reader mode">
            <select
              value={prefs.readerMode}
              onChange={(e) => update({ readerMode: e.target.value })}
              className={selectClass}
              style={selectStyle}
            >
              <option value="scroll">Scroll</option>
              <option value="paged">Paged (page flip)</option>
            </select>
          </Row>
          <Row label="Reader theme">
            <select
              value={prefs.theme}
              onChange={(e) => update({ theme: e.target.value })}
              className={selectClass}
              style={selectStyle}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="sepia">Sepia</option>
            </select>
          </Row>
          <Row label="Background">
            <select
              value={prefs.background}
              onChange={(e) => update({ background: e.target.value })}
              className={selectClass}
              style={selectStyle}
            >
              <option value="default">Default</option>
              <option value="paper">Paper</option>
              <option value="solid">Solid</option>
            </select>
          </Row>
          <Row label="Font">
            <select
              value={prefs.font}
              onChange={(e) => update({ font: e.target.value })}
              className={selectClass}
              style={selectStyle}
            >
              {fonts.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Row>
          <Row label="Font size">
            <input
              type="number" min={10} max={40}
              value={prefs.fontSize}
              onChange={(e) => update({ fontSize: Number(e.target.value) || 16 })}
              className={numberClass}
              style={selectStyle}
            />
          </Row>
          <Row label="Line spacing">
            <input
              type="number" step="0.1" min={1} max={3}
              value={prefs.lineSpacing}
              onChange={(e) => update({ lineSpacing: Number(e.target.value) || 1.5 })}
              className={numberClass}
              style={selectStyle}
            />
          </Row>
          <Row label="Page animation">
            <select
              value={prefs.pageAnimation}
              onChange={(e) => update({ pageAnimation: e.target.value })}
              className={selectClass}
              style={selectStyle}
            >
              <option value="slide">Slide</option>
              <option value="fade">Fade</option>
              <option value="none">None</option>
            </select>
          </Row>
          <Row label="Scroll behavior">
            <select
              value={prefs.scrollBehavior}
              onChange={(e) => update({ scrollBehavior: e.target.value })}
              className={selectClass}
              style={selectStyle}
            >
              <option value="smooth">Smooth</option>
              <option value="instant">Instant</option>
            </select>
          </Row>
          <Row label="Auto-scroll">
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <input
                type="checkbox"
                checked={prefs.autoScroll}
                onChange={(e) => update({ autoScroll: e.target.checked })}
                className="accent-emerald-500"
              />
              Enabled
            </label>
          </Row>
          <Row label="Auto-scroll speed (px/s)">
            <input
              type="number" min={5} max={300}
              value={prefs.autoScrollSpeed}
              onChange={(e) => update({ autoScrollSpeed: Number(e.target.value) || 40 })}
              className={numberClass}
              style={selectStyle}
            />
          </Row>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3"
      style={{ borderBottom: "1px solid var(--border-primary)" }}
    >
      <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

function ThemeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
      style={{
        background: active ? "var(--accent-bg)" : "var(--bg-button)",
        color: active ? "var(--accent-text)" : "var(--text-muted)",
        border: active ? "2px solid var(--accent-bg)" : "2px solid var(--border-secondary)",
        transform: active ? "scale(1.02)" : "scale(1)",
        boxShadow: active ? "0 2px 8px rgba(0,0,0,0.2)" : "none",
      }}
    >
      {label}
    </button>
  );
}
