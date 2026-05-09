"use client";
import { useEffect, useState, useCallback, useRef, FormEvent, DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Book = {
  id: string;
  title: string;
  author: string | null;
  fileType: string;
  uploadedAt: string;
  totalPages: number;
  currentPage: number;
  percentage: number;
  status: string;
  favorite: boolean;
};

async function readJsonSafe(res: Response): Promise<Record<string, unknown> | null> {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default function LibraryClient() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [q, setQ] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const editInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (favOnly) params.set("favorites", "1");
      const res = await fetch(`/api/books?${params}`);
      const json = await readJsonSafe(res);
      if (!res.ok) {
        const error = (json?.error as string | undefined) || "Failed to load books";
        setUploadErr(error);
        setBooks([]);
        return;
      }
      if (Array.isArray(json)) {
        setBooks(json as unknown as Book[]);
      } else {
        setBooks([]);
      }
    } catch {
      setUploadErr("Network error while loading books");
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [q, favOnly]);

  useEffect(() => {
    const t = setTimeout(load, 150);
    return () => clearTimeout(t);
  }, [load]);

  // Focus rename input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadErr(null);
    if (!pickedFile) {
      setUploadErr("Choose a PDF or EPUB file first");
      return;
    }
    const form = new FormData();
    form.append("file", pickedFile);
    if (title) form.append("title", title);
    setUploading(true);
    const res = await fetch("/api/books", { method: "POST", body: form });
    setUploading(false);
    if (!res.ok) {
      const j = await readJsonSafe(res);
      setUploadErr((j?.error as string | undefined) || "Upload failed");
      return;
    }
    setPickedFile(null);
    setTitle("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    await load();
    router.refresh();
  }

  function pickFile(f: File | null | undefined) {
    if (!f) return;
    const ext = f.name.toLowerCase().split(".").pop();
    if (ext !== "pdf" && ext !== "epub") {
      setUploadErr("Only PDF or EPUB files are supported");
      return;
    }
    setUploadErr(null);
    setPickedFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  async function toggleFav(id: string) {
    const res = await fetch(`/api/books/${id}/favorite`, { method: "POST" });
    if (!res.ok) {
      const j = await readJsonSafe(res);
      setUploadErr((j?.error as string | undefined) || "Failed to update favorite");
      return;
    }
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this book? This cannot be undone.")) return;
    const res = await fetch(`/api/books/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await readJsonSafe(res);
      setUploadErr((j?.error as string | undefined) || "Failed to delete book");
      return;
    }
    await load();
    router.refresh();
  }

  function startRename(book: Book) {
    setEditingId(book.id);
    setEditTitle(book.title);
  }

  async function saveRename(id: string) {
    const newTitle = editTitle.trim();
    if (!newTitle) {
      setEditingId(null);
      return;
    }

    const res = await fetch(`/api/books/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });

    if (!res.ok) {
      const j = await readJsonSafe(res);
      setUploadErr((j?.error as string | undefined) || "Failed to rename");
    } else {
      // Update locally for instant feedback
      setBooks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, title: newTitle } : b))
      );
      router.refresh(); // Update sidebar
    }
    setEditingId(null);
  }

  function cancelRename() {
    setEditingId(null);
    setEditTitle("");
  }

  const formatColors: Record<string, { bg: string; text: string }> = {
    pdf: { bg: "rgba(239,68,68,0.15)", text: "#f87171" },
    epub: { bg: "rgba(99,102,241,0.15)", text: "#818cf8" },
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
    <div className="p-6 max-w-5xl mx-auto w-full">
      <h1 className="text-3xl font-semibold mb-6">Library</h1>

      <form onSubmit={onUpload} className="mb-6 space-y-3">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
            dragOver
              ? "border-emerald-500 bg-emerald-500/10"
              : ""
          }`}
          style={!dragOver ? {
            borderColor: "var(--border-secondary)",
            background: "var(--bg-card)",
          } : {}}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.epub,application/pdf,application/epub+zip"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          {pickedFile ? (
            <div className="text-sm">
              <span className="font-medium">{pickedFile.name}</span>{" "}
              <span style={{ color: "var(--text-subtle)" }}>({(pickedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
              <div className="text-xs mt-1" style={{ color: "var(--text-subtle)" }}>Click to choose a different file</div>
            </div>
          ) : (
            <div className="text-sm">
              <div className="text-2xl mb-1">📄</div>
              <div className="font-medium">Drop a PDF or EPUB here</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-subtle)" }}>or click to browse · max 100 MB</div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional, auto-filled from filename)"
            className="flex-1 min-w-[12rem] px-3 py-2 rounded-lg text-sm"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-secondary)",
              color: "var(--text-primary)",
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-lg text-sm"
            style={{
              border: "1px solid var(--border-secondary)",
              color: "var(--text-secondary)",
            }}
          >
            Browse…
          </button>
          <button
            disabled={uploading || !pickedFile}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{
              background: "var(--accent-bg)",
              color: "var(--accent-text)",
            }}
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
        {uploadErr && <p className="text-sm text-red-400">{uploadErr}</p>}
      </form>

      <div className="mb-4 flex items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title…"
          className="flex-1 px-3 py-2 rounded-lg text-sm"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-secondary)",
            color: "var(--text-primary)",
          }}
        />
        <label className="text-sm flex items-center gap-2 select-none" style={{ color: "var(--text-muted)" }}>
          <input
            type="checkbox"
            checked={favOnly}
            onChange={(e) => setFavOnly(e.target.checked)}
            className="accent-emerald-500"
          />
          Favorites only
        </label>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--text-subtle)" }}>Loading…</p>
      ) : books.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-subtle)" }}>No books match.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((b) => {
            const fmt = formatColors[b.fileType?.toLowerCase()] || formatColors.pdf;
            const isEditing = editingId === b.id;

            return (
              <li
                key={b.id}
                className="rounded-2xl p-4 flex flex-col gap-2 transition"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-secondary)",
                }}
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Format badge */}
                    <span
                      className="shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                      style={{ background: fmt.bg, color: fmt.text }}
                    >
                      {b.fileType || "pdf"}
                    </span>

                    {isEditing ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(b.id);
                          if (e.key === "Escape") cancelRename();
                        }}
                        onBlur={() => saveRename(b.id)}
                        className="flex-1 min-w-0 text-sm font-medium px-1.5 py-0.5 rounded"
                        style={{
                          background: "var(--bg-input)",
                          border: "1px solid var(--border-secondary)",
                          color: "var(--text-primary)",
                          outline: "none",
                        }}
                      />
                    ) : (
                      <Link
                        href={`/reader/${b.id}`}
                        className="font-medium hover:text-indigo-300 truncate text-sm"
                      >
                        {b.title}
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!isEditing && (
                      <button
                        onClick={() => startRename(b)}
                        className="text-xs px-1 py-0.5 rounded opacity-50 hover:opacity-100 transition"
                        title="Rename"
                        style={{ color: "var(--text-muted)" }}
                      >
                        ✏️
                      </button>
                    )}
                    <button
                      onClick={() => toggleFav(b.id)}
                      className={`text-lg leading-none ${b.favorite ? "text-amber-400" : ""}`}
                      style={!b.favorite ? { color: "var(--text-faint)" } : {}}
                      title="Toggle favorite"
                    >
                      {b.favorite ? "★" : "☆"}
                    </button>
                  </div>
                </div>

                {/* Status */}
                <div className="text-xs" style={{ color: "var(--text-subtle)" }}>
                  {b.status === "completed"
                    ? "Completed"
                    : b.status === "reading"
                      ? `Reading · page ${b.currentPage}${b.totalPages ? `/${b.totalPages}` : ""}`
                      : "Not started"}
                </div>

                {/* Progress bar */}
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-badge)" }}>
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${b.percentage}%` }}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center mt-1">
                  <Link
                    href={`/reader/${b.id}`}
                    className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  >
                    Open
                  </Link>
                  <button
                    onClick={() => remove(b.id)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
    </div>
  );
}
