"use client";

import { useEffect, useRef, useState } from "react";

type Theme = { bg: string; fg: string; panel: string; border: string };

export type EpubNavApi = {
  prev: () => void;
  next: () => void;
  jump: (page: number) => void;
};

type ReaderPrefs = {
  readerMode: string;
  scrollBehavior: string;
};

type Chapter = {
  title: string;
  html: string;
};

type EpubPayload = {
  title: string;
  chapters: Chapter[];
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

export default function EpubReaderView({
  bookId,
  theme,
  prefs,
  initialPage,
  onLocationChange,
  onError,
  onReadyNav,
}: {
  bookId: string;
  theme: Theme;
  prefs: ReaderPrefs;
  initialPage: number;
  onLocationChange: (page: number, total: number) => void;
  onError: (message: string | null) => void;
  onReadyNav: (api: EpubNavApi) => void;
}) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(Math.max(1, initialPage));
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const currentPageRef = useRef(Math.max(1, initialPage));
  const totalRef = useRef(1);
  const locationChangeRef = useRef(onLocationChange);
  const errorRef = useRef(onError);
  const readyNavRef = useRef(onReadyNav);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    locationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    errorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    readyNavRef.current = onReadyNav;
  }, [onReadyNav]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      errorRef.current(null);

      try {
        const res = await fetch(`/api/books/${bookId}/epub`);
        const json = await readJsonSafe(res);

        if (!res.ok) {
          const error = (json?.error as string | undefined) || "Failed to load EPUB";
          throw new Error(error);
        }

        const payload = json as EpubPayload | null;
        const nextChapters = Array.isArray(payload?.chapters) ? payload.chapters : [];
        if (nextChapters.length === 0) throw new Error("EPUB has no readable chapters");

        if (cancelled) return;
        sectionRefs.current = [];
        totalRef.current = nextChapters.length;
        setChapters(nextChapters);

        const page = Math.max(1, Math.min(nextChapters.length, initialPage));
        setCurrentPage(page);
        currentPageRef.current = page;
        locationChangeRef.current(page, nextChapters.length);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Unknown EPUB error";
        errorRef.current(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [bookId, initialPage]);

  useEffect(() => {
    function jump(target: number) {
      const total = totalRef.current;
      const page = Math.max(1, Math.min(total, target));
      setCurrentPage(page);
      currentPageRef.current = page;
      locationChangeRef.current(page, total);

      if (prefs.readerMode === "scroll") {
        requestAnimationFrame(() => {
          sectionRefs.current[page - 1]?.scrollIntoView({
            block: "start",
            behavior: prefs.scrollBehavior === "smooth" ? "smooth" : "auto",
          });
        });
      }
    }

    readyNavRef.current({
      prev: () => jump(currentPageRef.current - 1),
      next: () => jump(currentPageRef.current + 1),
      jump,
    });

    return () => {
      readyNavRef.current({
        prev: () => {},
        next: () => {},
        jump: () => {},
      });
    };
  }, [prefs.readerMode, prefs.scrollBehavior]);

  useEffect(() => {
    if (prefs.readerMode !== "scroll" || chapters.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;

        const page = Number((visible.target as HTMLElement).dataset.pageNumber) || 1;
        if (page === currentPageRef.current) return;

        currentPageRef.current = page;
        setCurrentPage(page);
        locationChangeRef.current(page, chapters.length);
      },
      { root: null, threshold: [0.2, 0.5, 0.8] },
    );

    for (const section of sectionRefs.current) {
      if (section) observer.observe(section);
    }

    return () => observer.disconnect();
  }, [chapters.length, prefs.readerMode]);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center p-8 text-sm opacity-70">
        Loading EPUB...
      </div>
    );
  }

  if (chapters.length === 0) {
    return null;
  }

  const pageIndex = Math.max(0, Math.min(chapters.length - 1, currentPage - 1));
  const visibleChapters = prefs.readerMode === "paged" ? [chapters[pageIndex]] : chapters;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      {visibleChapters.map((chapter, index) => {
        const pageNumber = prefs.readerMode === "paged" ? currentPage : index + 1;

        return (
          <article
            key={`${pageNumber}-${chapter.title}`}
            ref={(node) => {
              sectionRefs.current[pageNumber - 1] = node;
            }}
            data-page-number={pageNumber}
            className="epub-chapter mb-10 border-b pb-10 last:border-b-0"
            style={{ borderColor: theme.border }}
          >
            <h2 className="mb-5 text-xl font-semibold">{chapter.title}</h2>
            <div
              className="epub-content"
              dangerouslySetInnerHTML={{ __html: chapter.html }}
            />
          </article>
        );
      })}

      <style jsx global>{`
        .epub-content {
          color: ${theme.fg};
          font-size: inherit;
          line-height: inherit;
        }

        .epub-content p {
          margin: 0 0 1em;
        }

        .epub-content h1,
        .epub-content h2,
        .epub-content h3,
        .epub-content h4 {
          margin: 1.3em 0 0.65em;
          font-weight: 700;
          line-height: 1.25;
        }

        .epub-content img {
          max-width: 100%;
          height: auto;
        }

        .epub-content a {
          color: #10b981;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
