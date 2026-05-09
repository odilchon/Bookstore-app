import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const Body = z.object({ content: z.string().trim().min(1).max(4000) });

async function ownerOrError(userId: string, bookId: string) {
  return prisma.book.findFirst({ where: { id: bookId, userId } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await ownerOrError(userId, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const messages = await prisma.message.findMany({
    where: { bookId: id, userId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(messages);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await ownerOrError(userId, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const m = await prisma.message.create({
    data: { bookId: id, userId, content: body.data.content },
  });
  return NextResponse.json(m);
}
