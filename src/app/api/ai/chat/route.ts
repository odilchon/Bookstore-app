import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { aiChat } from "@/lib/openrouter";

export const runtime = "nodejs";

const Body = z.object({
  bookId: z.string().min(1),
  message: z.string().trim().min(1).max(4000),
  pageText: z.string().max(8000).optional(),
  page: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { bookId, message, pageText } = parsed.data;

  const book = await prisma.book.findFirst({ where: { id: bookId, userId } });
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.message.create({
    data: { bookId, userId, content: message, role: "user" },
  });

  const context = (pageText || book.previewText || book.title || "").slice(0, 1000);

  const prompt =
    `You are a helpful reading assistant.\n\n` +
    `You are given part of a book. Use it to answer the question.\n\n` +
    `If the question is general (about the whole book), infer from the context.\n\n` +
    `Book: ${book.title}\n\n` +
    `Context:\n${context}\n\n` +
    `Question:\n${message}`;

  let reply = "";
  try {
    reply = await aiChat(prompt);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
  if (!reply) reply = "(empty response)";

  await prisma.message.create({
    data: { bookId, userId, content: reply, role: "assistant" },
  });

  return NextResponse.json({ reply });
}
