import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const Body = z.object({
  type: z.enum(["pages", "minutes"]).optional(),
  value: z.number().int().min(1).max(1000).optional(),
});

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const goal = await prisma.goal.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  return NextResponse.json(goal);
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const goal = await prisma.goal.upsert({
    where: { userId },
    update: body.data,
    create: { userId, ...body.data },
  });
  return NextResponse.json(goal);
}
