import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const Body = z.object({
  page: z.number().int().positive(),
  text: z.string().trim().min(1).max(5000),
  color: z.string().trim().max(20).optional(),
});

async function ownerOrError(userId: string, bookId: string) {
  return prisma.book.findFirst({ where: { id: bookId, userId } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await ownerOrError(userId, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const items = await prisma.highlight.findMany({
    where: { bookId: id, userId },
    orderBy: [{ page: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await ownerOrError(userId, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const h = await prisma.highlight.create({
    data: {
      bookId: id,
      userId,
      page: body.data.page,
      text: body.data.text,
      color: body.data.color || "yellow",
    },
  });
  return NextResponse.json(h);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const hid = searchParams.get("highlightId");
  if (!hid) return NextResponse.json({ error: "highlightId required" }, { status: 400 });
  await prisma.highlight.deleteMany({ where: { id: hid, bookId: id, userId } });
  return NextResponse.json({ ok: true });
}
