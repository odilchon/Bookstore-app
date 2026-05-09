import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  const [user, books, progresses, goal, weekEvents, lastEvent, recentBooks] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    prisma.book.count({ where: { userId } }),
    prisma.progress.findMany({ where: { userId } }),
    prisma.goal.upsert({ where: { userId }, update: {}, create: { userId } }),
    prisma.readingEvent.findMany({
      where: { userId, createdAt: { gte: startOfWeek } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.readingEvent.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.book.findMany({
      where: { userId },
      orderBy: { uploadedAt: "desc" },
      take: 5,
      include: { progress: true },
    }),
  ]);

  const completed = progresses.filter((p) => p.status === "completed").length;
  const reading = progresses.filter((p) => p.status === "reading").length;
  const totalPagesRead = progresses.reduce((s, p) => s + (p.currentPage || 0), 0);
  const avgPercentage =
    progresses.length > 0
      ? Math.round((progresses.reduce((s, p) => s + p.percentage, 0) / progresses.length) * 10) / 10
      : 0;

  // Daily buckets for the last 7 days (oldest -> newest)
  const days: { date: string; label: string; pages: number; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    days.push({ date: d.toISOString().slice(0, 10), label, pages: 0, minutes: 0 });
  }
  for (const ev of weekEvents) {
    const key = new Date(ev.createdAt);
    key.setHours(0, 0, 0, 0);
    const k = key.toISOString().slice(0, 10);
    const bucket = days.find((d) => d.date === k);
    if (bucket) {
      bucket.pages += ev.pages;
      bucket.minutes += ev.minutes;
    }
  }
  const todayPages = days[days.length - 1]?.pages ?? 0;
  const todayMinutes = days[days.length - 1]?.minutes ?? 0;
  const weekPages = days.reduce((s, d) => s + d.pages, 0);
  const weekMinutes = days.reduce((s, d) => s + d.minutes, 0);

  // Streak: count consecutive days (ending today) with at least one event
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if ((days[i].pages ?? 0) > 0 || (days[i].minutes ?? 0) > 0) streak++;
    else break;
  }

  const goalProgress =
    goal.type === "pages"
      ? Math.min(100, Math.round((todayPages / Math.max(1, goal.value)) * 100))
      : Math.min(100, Math.round((todayMinutes / Math.max(1, goal.value)) * 100));

  const idleHours = lastEvent
    ? Math.floor((Date.now() - lastEvent.createdAt.getTime()) / 3_600_000)
    : null;

  const recent = recentBooks.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    fileType: b.fileType,
    totalPages: b.totalPages,
    currentPage: b.progress?.currentPage ?? 0,
    percentage: b.progress?.percentage ?? 0,
    status: b.progress?.status ?? "not_started",
    updatedAt: b.progress?.updatedAt?.toISOString() ?? b.uploadedAt.toISOString(),
  }));

  return NextResponse.json({
    user: { name: user?.name ?? null, email: user?.email ?? null },
    books,
    completed,
    reading,
    totalPagesRead,
    avgPercentage,
    today: { pages: todayPages, minutes: todayMinutes },
    week: { pages: weekPages, minutes: weekMinutes, days },
    streak,
    goal: { type: goal.type, value: goal.value, progress: goalProgress },
    recent,
    notification:
      idleHours !== null && idleHours >= 24
        ? `You haven't read in ${idleHours} hours. Pick up where you left off?`
        : null,
  });
}
