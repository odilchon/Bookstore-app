import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { readUpload } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const book = await prisma.book.findFirst({ where: { id, userId } });
  if (!book) return new Response("Not found", { status: 404 });

  const buf = await readUpload(book.filePath);
  const contentType = book.fileType === "epub" ? "application/epub+zip" : "application/pdf";
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(book.fileName)}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
