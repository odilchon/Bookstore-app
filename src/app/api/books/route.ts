import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { saveUpload } from "@/lib/uploads";
import { aiChat } from "@/lib/openrouter";
import { extractPreview } from "@/lib/preview";

function looksSlugLike(s: string): boolean {
  return /^[a-z0-9._\-\s]+$/.test(s) && (s.includes("-") || s.includes("_"));
}

async function aiCleanTitle(baseName: string): Promise<string> {
  const raw = await aiChat(
    `You convert messy book filenames into clean, human-readable book titles.\n` +
      `Filename: "${baseName}"\n` +
      `Rules:\n` +
      `- If the filename is a transliteration of a known book, return its canonical title in the original language.\n` +
      `- Otherwise: replace underscores/dashes with spaces, capitalize properly, keep the original language.\n` +
      `- Drop file extensions, version tags, "ebook"/"epub"/"pdf"/years/scan/source noise.\n` +
      `- Output ONLY the final title in one line. No quotes, no "Title:" prefix, no explanation.`,
  );
  return raw
    .split("\n")[0]
    .replace(/^\s*(title|name)\s*[:\-—]\s*/i, "")
    .replace(/^["'`«»“”‘’]+|["'`«»“”‘’]+$/g, "")
    .replace(/\.+$/, "")
    .trim();
}

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase();
  const favOnly = searchParams.get("favorites") === "1";

  const books = await prisma.book.findMany({
    where: {
      userId,
      ...(q ? { title: { contains: q } } : {}),
      ...(favOnly ? { favorites: { some: { userId } } } : {}),
    },
    orderBy: { uploadedAt: "desc" },
    include: {
      progress: true,
      favorites: { where: { userId }, select: { id: true } },
    },
  });

  // Fire-and-forget: backfill clean titles for old slug-named books and missing previewText.
  const stale = books.filter((b) => looksSlugLike(b.title) || !b.previewText).slice(0, 5);
  if (stale.length > 0) {
    void Promise.allSettled(
      stale.map(async (b) => {
        try {
          const updates: { title?: string; previewText?: string } = {};
          if (looksSlugLike(b.title)) {
            const baseName = b.fileName.replace(/\.[^.]+$/, "");
            const newTitle = await aiCleanTitle(baseName);
            if (newTitle && newTitle !== b.title) updates.title = newTitle;
          }
          if (!b.previewText) {
            const buffer = await fs.readFile(b.filePath);
            const preview = await extractPreview(buffer, b.fileType, b.fileName);
            if (preview) updates.previewText = preview;
          }
          if (Object.keys(updates).length > 0) {
            await prisma.book.update({ where: { id: b.id }, data: updates });
          }
        } catch {
          /* ignore */
        }
      }),
    );
  }

  return NextResponse.json(
    books.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      fileType: b.fileType,
      uploadedAt: b.uploadedAt,
      totalPages: b.totalPages,
      currentPage: b.progress?.currentPage ?? 1,
      percentage: b.progress?.percentage ?? 0,
      status: b.progress?.status ?? "not_started",
      favorite: b.favorites.length > 0,
    })),
  );
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const titleRaw = String(form.get("title") || "").trim();
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext !== "pdf" && ext !== "epub") {
    return NextResponse.json({ error: "Only PDF or EPUB allowed" }, { status: 400 });
  }
  if (file.size > 100 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 100MB)" }, { status: 413 });
  }

  const saved = await saveUpload(userId, file);
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const buffer = await fs.readFile(saved.filePath);
  const previewText = await extractPreview(buffer, ext, baseName);

  let title = titleRaw;
  if (!title) {
    try {
      title = (await aiCleanTitle(baseName)) || baseName;
    } catch {
      title = baseName;
    }
  }

  const book = await prisma.book.create({
    data: {
      userId,
      title,
      fileName: saved.fileName,
      filePath: saved.filePath,
      fileType: ext,
      previewText,
      progress: { create: { userId, currentPage: 1, percentage: 0, status: "not_started" } },
    },
  });

  return NextResponse.json({ id: book.id, title: book.title });
}
