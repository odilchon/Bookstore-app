import { parseEpub } from "./epub";

const MAX_LEN = 2000;

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true } as unknown as Parameters<typeof pdfjs.getDocument>[0]).promise;
  const limit = Math.min(doc.numPages, 8);
  let out = "";
  for (let i = 1; i <= limit; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => {
        const s = (it as { str?: unknown }).str;
        return typeof s === "string" ? s : "";
      })
      .join(" ");
    out += text + "\n";
    if (out.length >= MAX_LEN) break;
  }
  await doc.destroy();
  return out.replace(/\s+/g, " ").trim().slice(0, MAX_LEN);
}

async function extractEpub(buffer: Buffer): Promise<string> {
  const chapters = await parseEpub(buffer);
  let out = "";
  for (const c of chapters) {
    out += stripHtml(c.html) + "\n";
    if (out.length >= MAX_LEN) break;
  }
  return out.replace(/\s+/g, " ").trim().slice(0, MAX_LEN);
}

export async function extractPreview(
  buffer: Buffer,
  fileType: string,
  fallback: string,
): Promise<string> {
  try {
    if (fileType === "pdf") return (await extractPdf(buffer)) || fallback;
    if (fileType === "epub") return (await extractEpub(buffer)) || fallback;
  } catch {
    /* ignore — fall through to fallback */
  }
  return fallback.slice(0, MAX_LEN);
}
