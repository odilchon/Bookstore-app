import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { deleteUpload } from "@/lib/uploads";
import { z } from "zod";

export const runtime = "nodejs";

async function getOwned(userId: string, id: string) {
  return prisma.book.findFirst({ where: { id, userId } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const book = await prisma.book.findFirst({
    where: { id, userId },
    include: {
      progress: true,
      favorites: { where: { userId }, select: { id: true } },
    },
  });
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    id: book.id,
    title: book.title,
    fileType: book.fileType,
    totalPages: book.totalPages,
    currentPage: book.progress?.currentPage ?? 1,
    percentage: book.progress?.percentage ?? 0,
    status: book.progress?.status ?? "not_started",
    favorite: book.favorites.length > 0,
  });
}

const Patch = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  totalPages: z.number().int().positive().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const owned = await getOwned(userId, id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = Patch.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  await prisma.book.update({ where: { id }, data: body.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const owned = await getOwned(userId, id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.book.delete({ where: { id } });
  await deleteUpload(owned.filePath);
  return NextResponse.json({ ok: true });
}
