import { neonAuth } from "@/lib/auth/neon";

export const { GET, POST, PUT, DELETE, PATCH } = neonAuth.handler();
