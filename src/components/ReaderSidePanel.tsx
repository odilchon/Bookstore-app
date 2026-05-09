"use client";
import { useEffect, useState, FormEvent } from "react";

type Note = { id: string; page: number; text: string; createdAt: string };
type Highlight = { id: string; page: number; text: string; color: string; createdAt: string };
type Message = { id: string; content: string; createdAt: string; role: string };
type Theme = { bg: string; fg: string; panel: string; border: string };

export default function ReaderSidePanel({
  bookId,
  page,
  mode,
  onClose,
  onJump,
  theme,
}: {
  bookId: string;
  page: number;
  mode: "chat" | "notes" | "highlights";
  onClose: () => void;
  onJump: (p: number) => void;
  theme: Theme;
}) {
  return (
    <aside
      className="w-80 shrink-0 border-l flex flex-col h-full overflow-hidden"
      style={{ background: theme.panel, borderColor: theme.border, color: theme.fg }}
    >
      <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
        <h3 className="font-medium capitalize">{mode}</h3>
        <button onClick={onClose} className="text-sm opacity-70 hover:opacity-100">×</button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        {mode === "notes" && <NotesPanel bookId={bookId} page={page} onJump={onJump} theme={theme} />}
        {mode === "highlights" && <HighlightsPanel bookId={bookId} page={page} onJump={onJump} theme={theme} />}
        {mode === "chat" && <ChatPanel bookId={bookId} page={page} theme={theme} />}
      </div>
    </aside>
  );
}

function inputStyle(theme: Theme): React.CSSProperties {
  return { background: theme.bg, color: theme.fg, borderColor: theme.border };
}

function btnPrimary(theme: Theme): React.CSSProperties {
  return { background: theme.fg, color: theme.bg };
}

function NotesPanel({
  bookId, page, onJump, theme,
}: { bookId: string; page: number; onJump: (p: number) => void; theme: Theme }) {
  const [items, setItems] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const load = async () => {
    const r = await fetch(`/api/books/${bookId}/notes`);
    setItems(await r.json());
  };
  useEffect(() => { load(); }, [bookId]);
  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await fetch(`/api/books/${bookId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page, text }),
    });
    setText("");
    load();
  };
  const remove = async (id: string) => {
    await fetch(`/api/books/${bookId}/notes?noteId=${id}`, { method: "DELETE" });
    load();
  };
  return (
    <>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 && <p className="text-xs opacity-60">No notes yet.</p>}
        {items.map((n) => (
          <div key={n.id} className="rounded border p-2 text-sm" style={{ borderColor: theme.border }}>
            <div className="flex justify-between items-start gap-2">
              <button onClick={() => onJump(n.page)} className="text-xs opacity-70 underline">p. {n.page}</button>
              <button onClick={() => remove(n.id)} className="text-xs text-red-500">delete</button>
            </div>
            <p className="whitespace-pre-wrap">{n.text}</p>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="p-3 border-t space-y-2" style={{ borderColor: theme.border }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Add note for page ${page}…`}
          rows={3}
          className="w-full text-sm rounded border px-2 py-1"
          style={inputStyle(theme)}
        />
        <button className="w-full text-sm py-1.5 rounded font-medium" style={btnPrimary(theme)}>Save note</button>
      </form>
    </>
  );
}

function HighlightsPanel({
  bookId, page, onJump, theme,
}: { bookId: string; page: number; onJump: (p: number) => void; theme: Theme }) {
  const [items, setItems] = useState<Highlight[]>([]);
  const [text, setText] = useState("");
  const [color, setColor] = useState("yellow");
  const load = async () => {
    const r = await fetch(`/api/books/${bookId}/highlights`);
    setItems(await r.json());
  };
  useEffect(() => { load(); }, [bookId]);

  useEffect(() => {
    const onMouseUp = () => {
      const s = window.getSelection();
      const t = s?.toString().trim();
      if (t && t.length >= 3) setText(t);
    };
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    await fetch(`/api/books/${bookId}/highlights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page, text, color }),
    });
    setText("");
    load();
  };
  const remove = async (id: string) => {
    await fetch(`/api/books/${bookId}/highlights?highlightId=${id}`, { method: "DELETE" });
    load();
  };
  return (
    <>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 && <p className="text-xs opacity-60">Select text in the document, then save it here.</p>}
        {items.map((h) => (
          <div
            key={h.id}
            className="rounded border p-2 text-sm"
            style={{ borderColor: theme.border, borderLeft: `4px solid ${h.color}` }}
          >
            <div className="flex justify-between items-start gap-2">
              <button onClick={() => onJump(h.page)} className="text-xs opacity-70 underline">p. {h.page}</button>
              <button onClick={() => remove(h.id)} className="text-xs text-red-500">delete</button>
            </div>
            <p className="whitespace-pre-wrap">{h.text}</p>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="p-3 border-t space-y-2" style={{ borderColor: theme.border }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Selected text appears here…"
          rows={3}
          className="w-full text-sm rounded border px-2 py-1"
          style={inputStyle(theme)}
        />
        <div className="flex items-center gap-2">
          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="text-sm border rounded px-1 py-0.5"
            style={inputStyle(theme)}
          >
            <option value="yellow">Yellow</option>
            <option value="lime">Green</option>
            <option value="lightblue">Blue</option>
            <option value="pink">Pink</option>
          </select>
          <button className="flex-1 text-sm py-1.5 rounded font-medium" style={btnPrimary(theme)}>Save highlight</button>
        </div>
      </form>
    </>
  );
}

function ChatPanel({ bookId, page, theme }: { bookId: string; page: number; theme: Theme }) {
  const [items, setItems] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [askAi, setAskAi] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const r = await fetch(`/api/books/${bookId}/messages`);
    setItems(await r.json());
  };
  useEffect(() => { load(); }, [bookId]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    if (askAi) {
      const res = await fetch(`/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, message: text, page }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || "AI request failed. Is Ollama running on http://localhost:11434?");
      }
    } else {
      await fetch(`/api/books/${bookId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
    }
    setText("");
    await load();
    setBusy(false);
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 && <p className="text-xs opacity-60">No messages yet.</p>}
        {items.map((m) => {
          const isAi = m.role === "assistant";
          return (
            <div
              key={m.id}
              className="rounded px-2 py-1.5 text-sm"
              style={{
                background: isAi ? theme.bg : theme.border,
                borderLeft: isAi ? `3px solid #10b981` : undefined,
              }}
            >
              <div className="text-[10px] opacity-60">
                {isAi ? "🤖 AI · " : ""}{new Date(m.createdAt).toLocaleString()}
              </div>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          );
        })}
        {busy && <p className="text-xs opacity-60">{askAi ? "AI is thinking…" : "Sending…"}</p>}
      </div>
      <form onSubmit={send} className="p-3 border-t space-y-2" style={{ borderColor: theme.border }}>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={askAi} onChange={(e) => setAskAi(e.target.checked)} />
          Ask AI assistant (Ollama)
        </label>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={askAi ? "Ask about this book…" : "Write a thought…"}
            className="flex-1 text-sm rounded border px-2 py-1"
            style={inputStyle(theme)}
            disabled={busy}
          />
          <button
            disabled={busy}
            className="text-sm px-3 rounded font-medium disabled:opacity-60"
            style={btnPrimary(theme)}
          >
            {askAi ? "Ask" : "Send"}
          </button>
        </div>
      </form>
    </>
  );
}
