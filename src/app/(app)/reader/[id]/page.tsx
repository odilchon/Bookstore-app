import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Reader from "@/components/Reader";

export default async function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const book = await prisma.book.findFirst({
    where: { id, userId },
    include: { progress: true },
  });
  if (!book) notFound();

  const prefs = await prisma.preferences.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  return (
    <Reader
      book={{
        id: book.id,
        title: book.title,
        fileType: book.fileType,
        totalPages: book.totalPages,
        currentPage: book.progress?.currentPage ?? 1,
        percentage: book.progress?.percentage ?? 0,
      }}
      prefs={prefs}
    />
  );
}
