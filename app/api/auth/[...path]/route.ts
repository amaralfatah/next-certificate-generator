import type { NextRequest } from "next/server";
import { neonAuth } from "@/lib/auth/neon";
import { env } from "@/lib/env";

type Context = { params: Promise<{ path: string[] }> };

/** Proxies to Neon Auth. Without Neon Auth configured (local dev login) these routes do not exist. */
const handle = (method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH") => (req: NextRequest, ctx: Context) =>
  env.neonAuth ? neonAuth().handler()[method](req, ctx) : new Response("Not found", { status: 404 });

export const GET = handle("GET");
export const POST = handle("POST");
export const PUT = handle("PUT");
export const DELETE = handle("DELETE");
export const PATCH = handle("PATCH");
