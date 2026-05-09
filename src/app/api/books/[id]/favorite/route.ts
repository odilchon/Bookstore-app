import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const book = await prisma.book.findFirst({ where: { id, userId } });
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.favorite.findUnique({
    where: { userId_bookId: { userId, bookId: id } },
  });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorite: false });
  }
  await prisma.favorite.create({ data: { userId, bookId: id } });
  return NextResponse.json({ favorite: true });
}
