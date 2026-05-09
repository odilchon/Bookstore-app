import path from "path";
import JSZip from "jszip";
import {
  DOMParser,
  XMLSerializer,
  type Document as XmlDocument,
  type Element as XmlElement,
  type Node as XmlNode,
} from "@xmldom/xmldom";

export type EpubChapter = {
  title: string;
  html: string;
};

function parseXml(xml: string): XmlDocument {
  return new DOMParser({
    errorHandler: () => {},
  }).parseFromString(xml, "application/xml");
}

function attr(el: XmlElement, name: string): string {
  return el.getAttribute(name) || "";
}

function dirname(filePath: string): string {
  const dir = path.posix.dirname(filePath);
  return dir === "." ? "" : dir;
}

function joinZipPath(base: string, href: string): string {
  return path.posix.normalize(path.posix.join(base, href)).replace(/^\//, "");
}

function removeElements(doc: XmlDocument, names: string[]) {
  for (const name of names) {
    const items = Array.from(doc.getElementsByTagName(name));
    for (const item of items) {
      item.parentNode?.removeChild(item);
    }
  }
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\s(href|src)\s*=\s*"javascript:[^"]*"/gi, "")
    .replace(/\s(href|src)\s*=\s*'javascript:[^']*'/gi, "");
}

function extractBodyHtml(raw: string): string {
  const doc = parseXml(raw);
  removeElements(doc, ["script", "iframe", "object", "embed"]);

  const body = doc.getElementsByTagName("body")[0];
  if (!body) return sanitizeHtml(raw);

  const serializer = new XMLSerializer();
  return sanitizeHtml(
    Array.from(body.childNodes)
      .map((node) => serializer.serializeToString(node as XmlNode))
      .join(""),
  );
}

function chapterTitle(raw: string, fallback: string): string {
  const doc = parseXml(raw);
  const h1 = doc.getElementsByTagName("h1")[0]?.textContent?.trim();
  if (h1) return h1;
  const h2 = doc.getElementsByTagName("h2")[0]?.textContent?.trim();
  if (h2) return h2;
  const title = doc.getElementsByTagName("title")[0]?.textContent?.trim();
  return title || fallback;
}

export async function parseEpub(buffer: Buffer): Promise<EpubChapter[]> {
  const zip = await JSZip.loadAsync(buffer);
  const container = await zip.file("META-INF/container.xml")?.async("string");
  if (!container) throw new Error("EPUB container.xml not found");

  const containerDoc = parseXml(container);
  const rootfile = containerDoc.getElementsByTagName("rootfile")[0];
  const opfPath = rootfile ? attr(rootfile, "full-path") : "";
  if (!opfPath) throw new Error("EPUB package file not found");

  const opf = await zip.file(opfPath)?.async("string");
  if (!opf) throw new Error("EPUB package content not found");

  const opfDoc = parseXml(opf);
  const opfDir = dirname(opfPath);
  const manifest = new Map<string, { href: string; mediaType: string }>();

  for (const item of Array.from(opfDoc.getElementsByTagName("item"))) {
    const id = attr(item, "id");
    const href = attr(item, "href");
    if (!id || !href) continue;
    manifest.set(id, {
      href: joinZipPath(opfDir, href),
      mediaType: attr(item, "media-type"),
    });
  }

  // Build a lookup of all media files for image inlining
  const mediaLookup = new Map<string, { href: string; mediaType: string }>();
  for (const [, item] of manifest) {
    mediaLookup.set(item.href, item);
  }

  const chapters: EpubChapter[] = [];
  const itemRefs = Array.from(opfDoc.getElementsByTagName("itemref"));

  for (const itemRef of itemRefs) {
    const idref = attr(itemRef, "idref");
    const item = manifest.get(idref);
    if (!item) continue;
    if (!/x?html/i.test(item.mediaType) && !/\.(xhtml|html?)$/i.test(item.href)) continue;

    const raw = await zip.file(item.href)?.async("string");
    if (!raw) continue;

    const chapterDir = dirname(item.href);
    let html = extractBodyHtml(raw);

    // Inline images: replace src="..." with data URIs
    html = await inlineImages(html, chapterDir, zip);

    chapters.push({
      title: chapterTitle(raw, `Chapter ${chapters.length + 1}`),
      html,
    });
  }

  if (chapters.length === 0) {
    throw new Error("No readable HTML chapters found in EPUB");
  }

  return chapters;
}

// Cache for already-inlined images to avoid re-reading the same file multiple times
const imageCache = new Map<string, string>();

async function inlineImages(html: string, chapterDir: string, zip: JSZip): Promise<string> {
  // Match src="..." and xlink:href="..." in <img> and <image> tags
  const srcPattern = /(<(?:img|image)\b[^>]*?\b(?:src|xlink:href)\s*=\s*")([^"]+)(")/gi;
  const matches: { full: string; prefix: string; href: string; suffix: string; index: number }[] = [];

  let m: RegExpExecArray | null;
  while ((m = srcPattern.exec(html)) !== null) {
    matches.push({ full: m[0], prefix: m[1], href: m[2], suffix: m[3], index: m.index });
  }

  if (matches.length === 0) return html;

  // Process all unique hrefs
  const replacements = new Map<string, string>();
  for (const match of matches) {
    const href = match.href;
    if (replacements.has(href) || href.startsWith("data:") || href.startsWith("http")) continue;

    const zipPath = joinZipPath(chapterDir, decodeURIComponent(href.split("#")[0]));
    const cacheKey = zipPath;

    if (imageCache.has(cacheKey)) {
      replacements.set(href, imageCache.get(cacheKey)!);
      continue;
    }

    const file = zip.file(zipPath);
    if (!file) continue;

    try {
      const data = await file.async("base64");
      const ext = zipPath.split(".").pop()?.toLowerCase() || "png";
      const mimeMap: Record<string, string> = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        svg: "image/svg+xml",
        webp: "image/webp",
      };
      const mime = mimeMap[ext] || "image/png";
      const dataUri = `data:${mime};base64,${data}`;
      imageCache.set(cacheKey, dataUri);
      replacements.set(href, dataUri);
    } catch {
      // Skip images we can't read
    }
  }

  // Apply replacements
  let result = html;
  for (const [href, dataUri] of replacements) {
    // Escape href for regex
    const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "g"), dataUri);
  }

  return result;
}
