import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const Body = z.object({
  currentPage: z.number().int().positive(),
  totalPages: z.number().int().positive().optional(),
  minutesRead: z.number().min(0).max(600).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const book = await prisma.book.findFirst({ where: { id, userId } });
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const total = body.data.totalPages ?? book.totalPages ?? 0;
  const current = Math.min(body.data.currentPage, total > 0 ? total : body.data.currentPage);
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 1000) / 10) : 0;
  const status = pct >= 100 ? "completed" : pct > 0 ? "reading" : "not_started";

  const prevProgress = await prisma.progress.findUnique({ where: { bookId: id } });
  const pagesDelta = Math.max(0, current - (prevProgress?.currentPage ?? 1));

  await prisma.$transaction([
    prisma.progress.upsert({
      where: { bookId: id },
      update: { currentPage: current, percentage: pct, status, userId },
      create: { bookId: id, userId, currentPage: current, percentage: pct, status },
    }),
    ...(total > 0 && total !== book.totalPages
      ? [prisma.book.update({ where: { id }, data: { totalPages: total } })]
      : []),
    ...(pagesDelta > 0 || (body.data.minutesRead ?? 0) > 0
      ? [
          prisma.readingEvent.create({
            data: { userId, bookId: id, pages: pagesDelta, minutes: body.data.minutesRead ?? 0 },
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ currentPage: current, percentage: pct, status });
}
