"use client";
import { Prefs } from "./Reader";

type Theme = { bg: string; fg: string; panel: string; border: string };

export default function ReaderControls({
  title,
  page,
  numPages,
  percentage,
  prefs,
  onPrefs,
  onPrev,
  onNext,
  onJump,
  onTogglePanel,
  activePanel,
  theme,
}: {
  title: string;
  page: number;
  numPages: number;
  percentage: number;
  prefs: Prefs;
  onPrefs: (p: Partial<Prefs>) => void;
  onPrev: () => void;
  onNext: () => void;
  onJump: (page: number) => void;
  onTogglePanel: (p: "chat" | "notes" | "highlights") => void;
  activePanel: string | null;
  theme: Theme;
}) {
  const fonts = ["serif", "sans-serif", "monospace", "Georgia", "Inter"];
  const inputStyle: React.CSSProperties = {
    background: theme.panel,
    color: theme.fg,
    borderColor: theme.border,
  };
  return (
    <div
      className="border-b shrink-0"
      style={{ background: theme.panel, borderColor: theme.border }}
    >
      <div className="px-4 py-2 flex items-center gap-2 flex-wrap">
        <h2 className="font-medium truncate flex-1 min-w-0">{title}</h2>
        <button onClick={onPrev} className="px-2 py-1 text-sm rounded border" style={inputStyle}>‹ Prev</button>
        <input
          type="number"
          min={1}
          max={numPages || undefined}
          value={page}
          onChange={(e) => onJump(Number(e.target.value) || 1)}
          className="w-16 px-2 py-1 text-sm rounded border text-center"
          style={inputStyle}
        />
        <span className="text-sm opacity-70">/ {numPages || "?"}</span>
        <button onClick={onNext} className="px-2 py-1 text-sm rounded border" style={inputStyle}>Next ›</button>
        <span className="text-sm opacity-70 mx-2">{percentage}%</span>
        <div className="flex-1" />
        {(["chat", "notes", "highlights"] as const).map((p) => (
          <button
            key={p}
            onClick={() => onTogglePanel(p)}
            className="px-2 py-1 text-sm rounded border capitalize"
            style={{
              ...inputStyle,
              background: activePanel === p ? theme.fg : theme.panel,
              color: activePanel === p ? theme.bg : theme.fg,
            }}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="h-1" style={{ background: theme.border }}>
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${percentage}%` }} />
      </div>
      <div className="px-4 py-2 flex items-center gap-3 flex-wrap text-xs">
        <Field label="Mode">
          <select
            value={prefs.readerMode}
            onChange={(e) => onPrefs({ readerMode: e.target.value as Prefs["readerMode"] })}
            className="border rounded px-1 py-0.5"
            style={inputStyle}
          >
            <option value="scroll">Scroll</option>
            <option value="paged">Pages</option>
          </select>
        </Field>
        <Field label="Theme">
          <select
            value={prefs.theme}
            onChange={(e) => onPrefs({ theme: e.target.value })}
            className="border rounded px-1 py-0.5"
            style={inputStyle}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="sepia">Sepia</option>
          </select>
        </Field>
        <Field label="Font">
          <select
            value={prefs.font}
            onChange={(e) => onPrefs({ font: e.target.value })}
            className="border rounded px-1 py-0.5"
            style={inputStyle}
          >
            {fonts.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="Size">
          <input
            type="number" min={10} max={40}
            value={prefs.fontSize}
            onChange={(e) => onPrefs({ fontSize: Number(e.target.value) || 16 })}
            className="w-14 border rounded px-1 py-0.5"
            style={inputStyle}
          />
        </Field>
        <Field label="Line">
          <input
            type="number" step="0.1" min={1} max={3}
            value={prefs.lineSpacing}
            onChange={(e) => onPrefs({ lineSpacing: Number(e.target.value) || 1.5 })}
            className="w-14 border rounded px-1 py-0.5"
            style={inputStyle}
          />
        </Field>
        <Field label="Anim">
          <select
            value={prefs.pageAnimation}
            onChange={(e) => onPrefs({ pageAnimation: e.target.value as Prefs["pageAnimation"] })}
            className="border rounded px-1 py-0.5"
            style={inputStyle}
          >
            <option value="slide">Slide</option>
            <option value="fade">Fade</option>
            <option value="none">None</option>
          </select>
        </Field>
        <Field label="Scroll">
          <select
            value={prefs.scrollBehavior}
            onChange={(e) => onPrefs({ scrollBehavior: e.target.value as Prefs["scrollBehavior"] })}
            className="border rounded px-1 py-0.5"
            style={inputStyle}
          >
            <option value="smooth">Smooth</option>
            <option value="instant">Instant</option>
          </select>
        </Field>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={prefs.autoScroll}
            onChange={(e) => onPrefs({ autoScroll: e.target.checked })}
          />
          Auto
        </label>
        <Field label="Speed">
          <input
            type="number" min={5} max={300}
            value={prefs.autoScrollSpeed}
            onChange={(e) => onPrefs({ autoScrollSpeed: Number(e.target.value) || 40 })}
            className="w-14 border rounded px-1 py-0.5"
            style={inputStyle}
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex items-center gap-1 opacity-90">{label} {children}</label>;
}
