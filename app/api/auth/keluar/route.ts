import { NextResponse, type NextRequest } from "next/server";
import { endSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  await endSession();
  return NextResponse.redirect(new URL("/", req.url), 303);
}
