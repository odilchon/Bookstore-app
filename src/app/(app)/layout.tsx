import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SidebarBookList from "@/components/SidebarBookList";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const books = await prisma.book.findMany({
    where: { userId },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, title: true },
  });

  return (
    <AppShell
      email={session?.user?.email}
      bookListSlot={<SidebarBookList initial={books} />}
    >
      {children}
    </AppShell>
  );
}
