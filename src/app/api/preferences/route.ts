import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const Body = z.object({
  theme: z.enum(["light", "dark", "sepia"]).optional(),
  font: z.string().trim().min(1).max(40).optional(),
  fontSize: z.number().int().min(10).max(40).optional(),
  lineSpacing: z.number().min(1).max(3).optional(),
  background: z.string().trim().min(1).max(40).optional(),
  pageAnimation: z.enum(["slide", "fade", "none"]).optional(),
  scrollBehavior: z.enum(["smooth", "instant"]).optional(),
  readerMode: z.enum(["scroll", "paged"]).optional(),
  autoScroll: z.boolean().optional(),
  autoScrollSpeed: z.number().int().min(5).max(300).optional(),
});

async function ensure(userId: string) {
  return prisma.preferences.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prefs = await ensure(userId);
  return NextResponse.json(prefs);
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  await ensure(userId);
  const prefs = await prisma.preferences.update({
    where: { userId },
    data: body.data,
  });
  return NextResponse.json(prefs);
}
