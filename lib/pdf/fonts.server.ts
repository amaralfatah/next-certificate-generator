import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { FONT_IDS } from "@/lib/fonts";

const cache = new Map<string, Uint8Array>();

/** Reads a curated font from public/fonts (traced into the server bundle by next.config). */
export async function loadFont(id: string) {
  if (!(FONT_IDS as readonly string[]).includes(id)) throw new Error(`Unknown font ${id}`);
  let bytes = cache.get(id);
  if (!bytes) {
    bytes = new Uint8Array(await readFile(path.join(process.cwd(), "public", "fonts", `${id}.ttf`)));
    cache.set(id, bytes);
  }
  return bytes;
}
