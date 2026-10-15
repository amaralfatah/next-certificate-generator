import "server-only";
import { AwsClient } from "aws4fetch";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { signToken } from "@/lib/security/crypto";

/**
 * Private object storage. Cloudflare R2 (S3 API) when R2_* is configured, otherwise
 * files under .data/files served by /api/files with HMAC-signed URLs. Both hand out
 * short-lived signed URLs; nothing is public.
 */
export interface Storage {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
  signedGetUrl(key: string, ttlSeconds: number, downloadName?: string): Promise<string>;
  signedPutUrl(key: string, contentType: string, ttlSeconds: number): Promise<string>;
}

class R2Storage implements Storage {
  private client: AwsClient;
  private base: string;

  constructor(cfg: NonNullable<typeof env.r2>) {
    this.client = new AwsClient({
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
      service: "s3",
      region: "auto",
    });
    this.base = `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}`;
  }

  private url(key: string) {
    return `${this.base}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }

  async put(key: string, body: Uint8Array, contentType: string) {
    const res = await this.client.fetch(this.url(key), {
      method: "PUT",
      body: body as BodyInit,
      headers: { "content-type": contentType },
    });
    if (!res.ok) throw new Error(`R2 put ${key}: ${res.status}`);
  }

  async get(key: string) {
    const res = await this.client.fetch(this.url(key));
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`R2 get ${key}: ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  async delete(key: string) {
    const res = await this.client.fetch(this.url(key), { method: "DELETE" });
    if (!res.ok && res.status !== 404) throw new Error(`R2 delete ${key}: ${res.status}`);
  }

  private async presign(
    key: string,
    method: string,
    ttl: number,
    params: Record<string, string> = {},
    headers: Record<string, string> = {},
  ) {
    const url = new URL(this.url(key));
    url.searchParams.set("X-Amz-Expires", String(ttl));
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const signed = await this.client.sign(new Request(url, { method, headers }), {
      aws: { signQuery: true },
    });
    return signed.url;
  }

  signedGetUrl(key: string, ttl: number, downloadName?: string) {
    const params: Record<string, string> = downloadName
      ? { "response-content-disposition": `attachment; filename="${downloadName}"` }
      : {};
    return this.presign(key, "GET", ttl, params);
  }

  signedPutUrl(key: string, contentType: string, ttl: number) {
    return this.presign(key, "PUT", ttl, {}, { "content-type": contentType });
  }
}

export const LOCAL_ROOT = path.join(process.cwd(), ".data", "files");

export function localPath(key: string) {
  const p = path.resolve(LOCAL_ROOT, key);
  if (!p.startsWith(LOCAL_ROOT + path.sep)) throw new Error("Invalid key");
  return p;
}

class LocalStorage implements Storage {
  async put(key: string, body: Uint8Array) {
    const p = localPath(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, body);
  }

  async get(key: string) {
    try {
      return new Uint8Array(await readFile(localPath(key)));
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    await rm(localPath(key), { force: true });
  }

  private url(method: "GET" | "PUT", key: string, ttl: number, extra: Record<string, string> = {}) {
    const q = new URLSearchParams({
      key,
      t: signToken(env.authSecret, `file-${method}`, key, ttl),
      ...extra,
    });
    return `/api/files?${q}`;
  }

  async signedGetUrl(key: string, ttl: number, downloadName?: string) {
    return this.url("GET", key, ttl, downloadName ? { name: downloadName } : {});
  }

  async signedPutUrl(key: string, _contentType: string, ttl: number) {
    return this.url("PUT", key, ttl);
  }
}

let instance: Storage | undefined;

export function storage(): Storage {
  instance ??= env.r2 ? new R2Storage(env.r2) : new LocalStorage();
  return instance;
}
