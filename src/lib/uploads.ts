import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");

export async function ensureDir(): Promise<string> {
  await fs.mkdir(ROOT, { recursive: true });
  return ROOT;
}

export async function saveUpload(userId: string, file: File): Promise<{
  filePath: string;
  fileName: string;
  size: number;
}> {
  const dir = await ensureDir();
  const userDir = path.join(dir, userId);
  await fs.mkdir(userDir, { recursive: true });
  const ext = path.extname(file.name) || ".pdf";
  const id = crypto.randomBytes(12).toString("hex");
  const safeName = id + ext;
  const abs = path.join(userDir, safeName);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(abs, buf);
  return { filePath: abs, fileName: file.name, size: buf.length };
}

export async function deleteUpload(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore
  }
}

export async function readUpload(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath);
}
