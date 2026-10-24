"use client";

import { Copy, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { deleteEvent, duplicateEvent, type FormState } from "@/app/forms/actions";
import { Button, Field, Input } from "@/components/ui";

export function DuplicateButton({ eventId }: { eventId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" disabled={pending} onClick={() => start(() => duplicateEvent(eventId))}>
      <Copy /> {pending ? "Menduplikat…" : "Duplikat"}
    </Button>
  );
}

/** Hidden behind a button: the confirmation field only appears once the organizer asks to delete. */
export function DeleteEventForm({ eventId, title }: { eventId: string; title: string }) {
  const [state, action, pending] = useActionState(deleteEvent.bind(null, eventId), undefined as FormState);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="danger" onClick={() => setOpen(true)}>
        <Trash2 /> Hapus
      </Button>
    );
  }
  return (
    <form action={action} className="grid gap-3">
      <Field
        label={
          <>
            Ketik <span className="font-mono text-danger">{title}</span> untuk mengonfirmasi
          </>
        }
        htmlFor="confirm"
        error={state?.errors?.confirm}
      >
        <Input id="confirm" name="confirm" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" autoFocus />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" variant="danger" disabled={pending || value.trim() !== title}>
          <Trash2 /> {pending ? "Menghapus…" : "Hapus permanen"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Batal
        </Button>
      </div>
    </form>
  );
}
