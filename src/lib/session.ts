import { auth } from "./auth";

export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) throw new Response("Unauthorized", { status: 401 });
  return id;
}
