"use client";

import { Lock, Rocket, Undo2 } from "lucide-react";
import { useState, useTransition } from "react";
import { setEventStatus } from "@/app/dasbor/actions";
import { Button, Notice } from "@/components/ui";

export function PublishControls({ eventId, status, blockers }: { eventId: string; status: string; blockers: string[] }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const run = (s: "open" | "closed" | "draft") =>
    start(async () => {
      const r = await setEventStatus(eventId, s);
      setMessage(r?.ok ? null : (r?.message ?? null));
    });

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {status === "draft" && (
          <Button variant="seal" onClick={() => run("open")} disabled={pending || blockers.length > 0}>
            <Rocket /> {pending ? "Memproses…" : "Publikasikan form"}
          </Button>
        )}
        {status === "open" && (
          <Button variant="outline" onClick={() => run("closed")} disabled={pending}>
            <Lock /> Tutup form
          </Button>
        )}
        {status === "closed" && (
          <>
            <Button variant="seal" onClick={() => run("open")} disabled={pending}>
              <Rocket /> Buka kembali
            </Button>
            <Button variant="ghost" onClick={() => run("draft")} disabled={pending}>
              <Undo2 /> Kembalikan ke draf
            </Button>
          </>
        )}
      </div>
      {message && <Notice tone="seal">{message}</Notice>}
    </div>
  );
}
