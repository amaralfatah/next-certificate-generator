"use client";

import { Copy, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { deleteEvent, duplicateEvent, updateGuards, type FormState } from "@/app/dasbor/actions";
import { Button, Field, Input, Notice } from "@/components/ui";

export function GuardsForm({
  eventId,
  initial,
}: {
  eventId: string;
  initial: { opensAt: string; closesAt: string; quota: string; hasCode: boolean };
}) {
  const [state, action, pending] = useActionState(updateGuards.bind(null, eventId), undefined as FormState);
  const [removeCode, setRemoveCode] = useState(false);
  const e = state?.errors ?? {};

  return (
    <form action={action} className="grid gap-5" noValidate>
      <Field
        label="Kode kehadiran"
        htmlFor="attendanceCode"
        error={e.attendanceCode}
        hint={
          initial.hasCode
            ? "Kode aktif tersimpan terenkripsi dan tidak bisa ditampilkan. Isi untuk menggantinya."
            : "Opsional. Umumkan saat acara agar hanya yang hadir bisa mengambil sertifikat."
        }
      >
        <Input
          id="attendanceCode"
          name="attendanceCode"
          maxLength={32}
          autoComplete="off"
          placeholder={initial.hasCode ? "•••••• (aktif)" : "mis. HADIR26"}
          className="num uppercase sm:max-w-64"
          disabled={removeCode}
          aria-invalid={!!e.attendanceCode}
        />
      </Field>
      {initial.hasCode && (
        <label className="-mt-2 flex w-fit cursor-pointer items-center gap-2 text-sm select-none">
          <input
            type="checkbox"
            name="removeCode"
            value="1"
            checked={removeCode}
            onChange={(ev) => setRemoveCode(ev.target.checked)}
            className="size-4 accent-[var(--seal)]"
          />
          Hapus kode kehadiran
        </label>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Form dibuka (WIB)" htmlFor="opensAt" error={e.opensAt} hint="Kosongkan: langsung saat dipublikasikan.">
          <Input id="opensAt" name="opensAt" type="datetime-local" defaultValue={initial.opensAt} />
        </Field>
        <Field label="Form ditutup (WIB)" htmlFor="closesAt" error={e.closesAt} hint="Kosongkan: tutup manual.">
          <Input id="closesAt" name="closesAt" type="datetime-local" defaultValue={initial.closesAt} aria-invalid={!!e.closesAt} />
        </Field>
      </div>
      <Field label="Kuota maksimum" htmlFor="quota" error={e.quota} hint="Kosongkan untuk tanpa batas.">
        <Input
          id="quota"
          name="quota"
          type="number"
          inputMode="numeric"
          min={1}
          defaultValue={initial.quota}
          className="num sm:max-w-40"
          aria-invalid={!!e.quota}
        />
      </Field>
      {state?.message && <Notice tone={state.ok ? "ok" : "seal"}>{state.message}</Notice>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan pengaman"}
        </Button>
      </div>
    </form>
  );
}

export function DuplicateButton({ eventId }: { eventId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" disabled={pending} onClick={() => start(() => duplicateEvent(eventId))}>
      <Copy /> {pending ? "Menduplikat…" : "Duplikat acara"}
    </Button>
  );
}

export function DeleteEventForm({ eventId, title }: { eventId: string; title: string }) {
  const [state, action, pending] = useActionState(deleteEvent.bind(null, eventId), undefined as FormState);
  const [value, setValue] = useState("");
  return (
    <form action={action} className="grid gap-3">
      <Field
        label={
          <>
            Ketik <span className="font-mono text-seal-ink">{title}</span> untuk mengonfirmasi
          </>
        }
        htmlFor="confirm"
        error={state?.errors?.confirm}
      >
        <Input id="confirm" name="confirm" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" />
      </Field>
      <div>
        <Button type="submit" variant="danger" disabled={pending || value.trim() !== title}>
          <Trash2 /> {pending ? "Menghapus…" : "Hapus acara permanen"}
        </Button>
      </div>
    </form>
  );
}
