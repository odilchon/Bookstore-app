"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import type { Prefs } from "./Reader";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

function LazyPdfPage({
  pageNumber,
  width,
  rootRef,
}: {
  pageNumber: number;
  width: number;
  rootRef: RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { root: rootRef.current ?? null, rootMargin: "600px 0px" },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [rootRef]);

  return (
    <div
      ref={ref}
      data-page-number={pageNumber}
      className="mb-4 shadow bg-white"
      style={{ width, minHeight: Math.round(width * 1.414) }}
    >
      {visible && <Page pageNumber={pageNumber} width={width} />}
    </div>
  );
}

export default function PdfReaderView({
  fileUrl,
  prefs,
  numPages,
  page,
  containerWidth,
  scrollRef,
  onDocLoad,
  onError,
}: {
  fileUrl: string;
  prefs: Prefs;
  numPages: number;
  page: number;
  containerWidth: number;
  scrollRef: RefObject<HTMLDivElement | null>;
  onDocLoad: (data: { numPages: number }) => void;
  onError: (message: string) => void;
}) {
  return (
    <Document
      file={fileUrl}
      onLoadSuccess={onDocLoad}
      onLoadError={(error) => onError(error.message)}
      loading={<div className="p-6 text-sm">Loading PDF...</div>}
      className="flex flex-col items-center py-6"
    >
      {prefs.readerMode === "scroll"
        ? Array.from({ length: numPages }, (_, index) => (
            <LazyPdfPage
              key={index + 1}
              pageNumber={index + 1}
              width={containerWidth}
              rootRef={scrollRef}
            />
          ))
        : numPages > 0 && (
            <div
              key={page}
              data-page-number={page}
              className="shadow bg-white"
              style={{
                width: containerWidth,
                animation:
                  prefs.pageAnimation === "fade"
                    ? "fadeIn 220ms ease"
                    : prefs.pageAnimation === "slide"
                      ? "slideIn 260ms ease"
                      : undefined,
              }}
            >
              <Page pageNumber={page} width={containerWidth} />
            </div>
          )}
    </Document>
  );
}
