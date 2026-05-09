import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const Body = z.object({
  page: z.number().int().positive(),
  text: z.string().trim().min(1).max(5000),
});

async function ownerOrError(userId: string, bookId: string) {
  const book = await prisma.book.findFirst({ where: { id: bookId, userId } });
  return book;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await ownerOrError(userId, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const notes = await prisma.note.findMany({
    where: { bookId: id, userId },
    orderBy: [{ page: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(notes);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await ownerOrError(userId, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const note = await prisma.note.create({
    data: { bookId: id, userId, page: body.data.page, text: body.data.text },
  });
  return NextResponse.json(note);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const noteId = searchParams.get("noteId");
  if (!noteId) return NextResponse.json({ error: "noteId required" }, { status: 400 });
  await prisma.note.deleteMany({ where: { id: noteId, bookId: id, userId } });
  return NextResponse.json({ ok: true });
}
