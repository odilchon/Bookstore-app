"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import ReaderSidePanel from "./ReaderSidePanel";
import ReaderControls from "./ReaderControls";
import EpubReaderView, { EpubNavApi } from "./EpubReaderView";

const PdfReaderView = dynamic(() => import("./PdfReaderView"), { ssr: false });

export type Prefs = {
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

export type ReaderBook = {
  id: string;
  title: string;
  fileType: string;
  totalPages: number;
  currentPage: number;
  percentage: number;
};

const themeStyles: Record<string, { bg: string; fg: string; panel: string; border: string }> = {
  light: { bg: "#fafafa", fg: "#18181b", panel: "#ffffff", border: "#e4e4e7" },
  dark:  { bg: "#0a0a0a", fg: "#fafafa", panel: "#18181b", border: "#27272a" },
  sepia: { bg: "#f5ecd9", fg: "#3b2f1e", panel: "#efe3c8", border: "#d8c8a3" },
};

export default function Reader({ book, prefs: initialPrefs }: { book: ReaderBook; prefs: Prefs }) {
  const isEpub = book.fileType.toLowerCase() === "epub";
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [numPages, setNumPages] = useState<number>(book.totalPages || 0);
  const [page, setPage] = useState<number>(book.currentPage || 1);
  const [panel, setPanel] = useState<"chat" | "notes" | "highlights" | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastSavedPageRef = useRef<number>(book.currentPage || 1);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [toolbarHidden, setToolbarHidden] = useState(false);
  const toolbarHoveredRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const cumulativeDistRef = useRef(0); // cumulative scroll distance in current direction
  const scrollDirRef = useRef<"up" | "down" | null>(null);
  const userScrollingRef = useRef(false);
  const epubNavRef = useRef<EpubNavApi>({
    prev: () => {},
    next: () => {},
    jump: () => {},
  });

  const HIDE_THRESHOLD = 80;  // px of sustained scroll-down to hide
  const SHOW_THRESHOLD = 30;  // px of sustained scroll-up to show

  const fileUrl = useMemo(() => `/api/files/${book.id}`, [book.id]);
  const theme = themeStyles[prefs.theme] || themeStyles.light;

  useEffect(() => {
    if (startTimeRef.current === 0) {
      startTimeRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      setContainerWidth(Math.max(320, Math.min(1100, w - 32)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const saveProgress = useCallback(
    async (current: number, total: number) => {
      const startedAt = startTimeRef.current || Date.now();
      const minutes = Math.max(0, Math.round((Date.now() - startedAt) / 60000));
      startTimeRef.current = Date.now();
      lastSavedPageRef.current = current;
      await fetch(`/api/books/${book.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPage: current, totalPages: total, minutesRead: minutes }),
      });
    },
    [book.id],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (numPages > 0 && page !== lastSavedPageRef.current) {
        saveProgress(page, numPages);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [page, numPages, saveProgress]);

  useEffect(() => {
    return () => {
      if (numPages > 0) {
        const startedAt = startTimeRef.current || Date.now();
        const minutes = Math.max(0, Math.round((Date.now() - startedAt) / 60000));
        if (minutes > 0) {
          fetch(`/api/books/${book.id}/progress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true,
            body: JSON.stringify({ currentPage: page, totalPages: numPages, minutesRead: minutes }),
          });
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll for scroll mode
  useEffect(() => {
    if (isEpub || prefs.readerMode !== "scroll" || !prefs.autoScroll) return;
    const el = scrollRef.current;
    if (!el) return;
    const speed = prefs.autoScrollSpeed;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      el.scrollTop += speed * dt;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isEpub, prefs.readerMode, prefs.autoScroll, prefs.autoScrollSpeed]);

  // Toolbar auto-hide with cumulative distance (no flickering)
  // + (PDF only) scroll-based page tracking
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      userScrollingRef.current = true;
      const top = el.scrollTop;
      const delta = top - lastScrollTopRef.current;
      lastScrollTopRef.current = top;

      // At the very top — always show
      if (top <= 4) {
        setToolbarHidden(false);
        cumulativeDistRef.current = 0;
        scrollDirRef.current = null;
      } else if (Math.abs(delta) > 0.5) {
        const dir: "up" | "down" = delta > 0 ? "down" : "up";

        // If direction changed, reset cumulative counter
        if (dir !== scrollDirRef.current) {
          scrollDirRef.current = dir;
          cumulativeDistRef.current = 0;
        }

        cumulativeDistRef.current += Math.abs(delta);

        if (dir === "down" && cumulativeDistRef.current >= HIDE_THRESHOLD && !toolbarHoveredRef.current) {
          setToolbarHidden(true);
          cumulativeDistRef.current = 0;
        } else if (dir === "up" && cumulativeDistRef.current >= SHOW_THRESHOLD) {
          setToolbarHidden(false);
          cumulativeDistRef.current = 0;
        }
      }

      if (!isEpub && prefs.readerMode === "scroll") {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const pages = el.querySelectorAll<HTMLElement>("[data-page-number]");
          const refTop = el.scrollTop + 80;
          let current = page;
          pages.forEach((p) => {
            if (p.offsetTop <= refTop) {
              current = Number(p.dataset.pageNumber) || current;
            }
          });
          if (current !== page) setPage(current);
          ticking = false;
        });
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isEpub, prefs.readerMode, page]);

  // When page state changes due to jump (not scroll), scroll to it
  const programmaticJump = useCallback((target: number) => {
    if (isEpub) {
      epubNavRef.current.jump(target);
      return;
    }
    setPage(target);
    const el = scrollRef.current;
    if (!el) return;
    if (prefs.readerMode === "scroll") {
      requestAnimationFrame(() => {
        const node = el.querySelector<HTMLElement>(`[data-page-number="${target}"]`);
        if (node) {
          el.scrollTo({ top: node.offsetTop - 16, behavior: prefs.scrollBehavior === "smooth" ? "smooth" : "auto" });
        }
      });
    } else {
      // Paged mode — scroll to top so the user reads from the start of the new page
      el.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [isEpub, prefs.readerMode, prefs.scrollBehavior]);

  const onDocLoad = ({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
  };

  const updatePrefs = async (patch: Partial<Prefs>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  };

  const goPrev = () => {
    if (isEpub) {
      epubNavRef.current.prev();
      return;
    }
    programmaticJump(Math.max(1, page - 1));
  };

  const goNext = () => {
    if (isEpub) {
      epubNavRef.current.next();
      return;
    }
    programmaticJump(Math.min(numPages || page + 1, page + 1));
  };

  const percentage = numPages > 0 ? Math.min(100, Math.round((page / numPages) * 1000) / 10) : 0;

  return (
    <div
      className="flex flex-1 min-h-0 h-full"
      style={{
        background: theme.bg,
        color: theme.fg,
        fontFamily: prefs.font,
        fontSize: prefs.fontSize,
        lineHeight: prefs.lineSpacing,
      }}
    >
      <div ref={containerRef} className="flex-1 min-w-0 min-h-0 flex flex-col relative">
        <div
          className="shrink-0 overflow-hidden transition-all duration-200 ease-out will-change-[max-height,transform]"
          style={{
            maxHeight: toolbarHidden ? 0 : 260,
            opacity: toolbarHidden ? 0 : 1,
            transform: toolbarHidden ? "translateY(-8px)" : "translateY(0)",
            pointerEvents: toolbarHidden ? "none" : "auto",
          }}
          onMouseEnter={() => { toolbarHoveredRef.current = true; }}
          onMouseLeave={() => { toolbarHoveredRef.current = false; }}
        >
          <ReaderControls
            title={book.title}
            page={page}
            numPages={numPages}
            percentage={percentage}
            prefs={prefs}
            onPrefs={updatePrefs}
            onPrev={goPrev}
            onNext={goNext}
            onJump={(p) => programmaticJump(Math.min(numPages || p, Math.max(1, p)))}
            onTogglePanel={(p) => setPanel((cur) => (cur === p ? null : p))}
            activePanel={panel}
            theme={theme}
          />
        </div>

        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
          style={{
            scrollBehavior: prefs.scrollBehavior === "smooth" ? "smooth" : "auto",
            overscrollBehavior: "contain",
          }}
        >
          {loadError && (
            <div className="p-6 text-sm text-red-600">Failed to load: {loadError}</div>
          )}
          {isEpub ? (
            <EpubReaderView
              bookId={book.id}
              theme={theme}
              prefs={prefs}
              initialPage={Math.max(1, book.currentPage || 1)}
              onLocationChange={(nextPage, totalPages) => {
                setNumPages(totalPages);
                setPage(nextPage);
              }}
              onError={setLoadError}
              onReadyNav={(api) => {
                epubNavRef.current = api;
              }}
            />
          ) : (
            <PdfReaderView
              fileUrl={fileUrl}
              prefs={prefs}
              numPages={numPages}
              page={page}
              containerWidth={containerWidth}
              scrollRef={scrollRef}
              onDocLoad={onDocLoad}
              onError={setLoadError}
            />
          )}
        </div>

        <style>{`
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes slideIn { from { transform: translateX(20px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        `}</style>
      </div>

      {panel && (
        <ReaderSidePanel
          bookId={book.id}
          page={page}
          mode={panel}
          onClose={() => setPanel(null)}
          onJump={(p) => programmaticJump(Math.min(numPages || p, Math.max(1, p)))}
          theme={theme}
        />
      )}
    </div>
  );
}
