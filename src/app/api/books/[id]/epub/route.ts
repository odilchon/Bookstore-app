import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readUpload } from "@/lib/uploads";
import { parseEpub } from "@/lib/epub";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const book = await prisma.book.findFirst({ where: { id, userId } });
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (book.fileType !== "epub") return NextResponse.json({ error: "Not an EPUB book" }, { status: 400 });

  try {
    const buffer = await readUpload(book.filePath);
    const chapters = await parseEpub(buffer);
    return NextResponse.json({ title: book.title, chapters });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse EPUB";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
