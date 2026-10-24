"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setEventStatus } from "@/app/forms/actions";
import { Notice, Switch } from "@/components/ui";

/** "Menerima respons", as in Google Forms: open ⇄ closed. Schedule and quota still close the form on their own. */
export function AcceptingToggle({ eventId, open, autoClosedReason }: { eventId: string; open: boolean; autoClosedReason: string | null }) {
  const [optimistic, setOptimistic] = useOptimistic(open);
  const [, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <Switch
        checked={optimistic}
        label="Menerima respons"
        onChange={(next) =>
          start(async () => {
            setOptimistic(next);
            const r = await setEventStatus(eventId, next ? "open" : "closed");
            setError(r?.ok ? null : (r?.message ?? "Gagal mengubah status."));
          })
        }
      />
      {optimistic && autoClosedReason && <p className="text-xs text-warn">{autoClosedReason}</p>}
      {error && (
        <Notice tone="danger" announce>
          {error}
        </Notice>
      )}
    </div>
  );
}
