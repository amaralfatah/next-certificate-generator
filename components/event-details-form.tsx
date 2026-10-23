"use client";

import { useActionState, useState } from "react";
import { Button, Field, Input, Notice, Textarea } from "@/components/ui";
import type { FormState } from "@/app/dasbor/actions";

type Values = { title: string; date: string; organizerLabel: string; description: string; numberPrefix: string };

function suggestPrefix(title: string) {
  const initials = title
    .normalize("NFKD")
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return initials.length >= 2 ? initials.slice(0, 5) : "";
}

export function EventDetailsForm({
  action,
  initial,
  submitLabel,
  prefixLocked,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial?: Values;
  submitLabel: string;
  prefixLocked?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [prefix, setPrefix] = useState(initial?.numberPrefix ?? "");
  const [prefixTouched, setPrefixTouched] = useState(!!initial);
  const shownPrefix = prefixTouched ? prefix : suggestPrefix(title);
  const year = new Date().getFullYear();
  const e = state?.errors ?? {};

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <Field label="Nama acara" htmlFor="title" error={e.title} hint="Muncul di sertifikat sebagai {acara}.">
        <Input
          id="title"
          name="title"
          required
          maxLength={120}
          value={title}
          onChange={(ev) => setTitle(ev.target.value)}
          placeholder="Webinar Literasi Digital untuk Guru"
          aria-invalid={!!e.title}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tanggal acara" htmlFor="date" error={e.date}>
          <Input id="date" name="date" type="date" required defaultValue={initial?.date} aria-invalid={!!e.date} />
        </Field>
        <Field label="Penyelenggara" htmlFor="organizerLabel" error={e.organizerLabel}>
          <Input
            id="organizerLabel"
            name="organizerLabel"
            required
            maxLength={120}
            defaultValue={initial?.organizerLabel}
            placeholder="Komunitas Guru Penggerak"
            aria-invalid={!!e.organizerLabel}
          />
        </Field>
      </div>
      <Field label="Deskripsi singkat" htmlFor="description" error={e.description} hint="Opsional. Tampil di halaman form peserta.">
        <Textarea id="description" name="description" maxLength={500} defaultValue={initial?.description} rows={3} />
      </Field>
      <Field
        label="Prefix nomor sertifikat"
        htmlFor="numberPrefix"
        error={e.numberPrefix}
        hint={
          prefixLocked ? (
            "Terkunci karena sudah ada sertifikat terbit."
          ) : (
            <>
              Contoh nomor: <span className="num text-ink">{(shownPrefix || "ABC") + `-${year}-00001`}</span>. Harus unik.
            </>
          )
        }
      >
        <Input
          id="numberPrefix"
          name="numberPrefix"
          required
          maxLength={8}
          value={shownPrefix}
          readOnly={prefixLocked}
          onChange={(ev) => {
            setPrefixTouched(true);
            setPrefix(ev.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
          }}
          className="num uppercase sm:max-w-48"
          placeholder="WLD"
          aria-invalid={!!e.numberPrefix}
        />
      </Field>

      {state?.message && <Notice announce tone={state.ok ? "ok" : "seal"}>{state.message}</Notice>}

      <div>
        <Button type="submit" disabled={pending} variant="primary">
          {pending ? "Menyimpan…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
