"use client";

import { ArrowDown, ArrowUp, Lock, Plus, Save, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { saveFormFields } from "@/app/dasbor/actions";
import { Button, Input, Label, Notice, Select, Textarea } from "@/components/ui";

type Row = { uid: string; label: string; type: "text" | "email" | "select" | "number"; required: boolean; options: string };

const TYPE_LABELS: Record<Row["type"], string> = {
  text: "Teks",
  email: "Email",
  select: "Pilihan",
  number: "Angka",
};

let uidCounter = 0;
const uid = () => `r${++uidCounter}`;

export function FormBuilder({
  eventId,
  initial,
  locked,
}: {
  eventId: string;
  initial: { label: string; type: Row["type"]; required: boolean; options: string[] }[];
  locked: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(() => initial.map((f) => ({ ...f, uid: uid(), options: f.options.join("\n") })));
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "seal"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const patch = (id: string, p: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.uid === id ? { ...r, ...p } : r)));
    setDirty(true);
    setMessage(null);
  };
  const move = (i: number, d: number) => {
    setRows((rs) => {
      const next = [...rs];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
    setDirty(true);
  };

  const save = () =>
    start(async () => {
      const r = await saveFormFields(
        eventId,
        rows.map((r) => ({
          label: r.label,
          type: r.type,
          required: r.required,
          options: r.options
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean),
        })),
      );
      setMessage(r?.message ? { tone: r.ok ? "ok" : "seal", text: r.message } : null);
      if (r?.ok) setDirty(false);
    });

  return (
    <div className="grid gap-4">
      {locked && (
        <Notice tone="warn">
          <Lock />
          <span>Form terkunci karena sudah ada peserta. Duplikat acara di Pengaturan untuk membuat form berbeda.</span>
        </Notice>
      )}

      <ol className="grid gap-3">
        {[
          { label: "Nama lengkap", hint: "Dicetak di sertifikat sebagai {nama}. Peserta mengonfirmasi ejaan sebelum mengirim." },
          { label: "Email", hint: "Satu sertifikat per email. Salinan PDF dikirim ke sini." },
        ].map((b) => (
          <li key={b.label} className="flex items-start gap-3 rounded-xl border border-line bg-paper-2/60 px-4 py-3">
            <Lock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
            <div>
              <p className="text-sm font-semibold">
                {b.label} <span className="font-normal text-muted">· wajib, bawaan</span>
              </p>
              <p className="text-xs text-muted">{b.hint}</p>
            </div>
          </li>
        ))}

        {rows.map((r, i) => (
          <li key={r.uid} className="rounded-xl border border-line bg-card p-4">
            <fieldset disabled={locked} className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
              <div>
                <Label htmlFor={`${r.uid}-label`}>Label</Label>
                <Input
                  id={`${r.uid}-label`}
                  value={r.label}
                  maxLength={60}
                  onChange={(e) => patch(r.uid, { label: e.target.value })}
                  placeholder="mis. Asal instansi"
                />
              </div>
              <div>
                <Label htmlFor={`${r.uid}-type`}>Jenis</Label>
                <Select id={`${r.uid}-type`} value={r.type} onChange={(e) => patch(r.uid, { type: e.target.value as Row["type"] })}>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <label className="mr-2 flex h-10 cursor-pointer items-center gap-2 text-sm select-none">
                  <input
                    type="checkbox"
                    checked={r.required}
                    onChange={(e) => patch(r.uid, { required: e.target.checked })}
                    className="size-4 accent-[var(--seal)]"
                  />
                  Wajib
                </label>
                <Button variant="ghost" size="sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Naikkan ${r.label || "kolom"}`}>
                  <ArrowUp />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`Turunkan ${r.label || "kolom"}`}>
                  <ArrowDown />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRows((rs) => rs.filter((x) => x.uid !== r.uid));
                    setDirty(true);
                  }}
                  aria-label={`Hapus ${r.label || "kolom"}`}
                >
                  <Trash2 />
                </Button>
              </div>
              {r.type === "select" && (
                <div className="sm:col-span-3">
                  <Label htmlFor={`${r.uid}-opts`}>Opsi (satu per baris)</Label>
                  <Textarea
                    id={`${r.uid}-opts`}
                    value={r.options}
                    onChange={(e) => patch(r.uid, { options: e.target.value })}
                    rows={3}
                    placeholder={"Guru\nSiswa\nUmum"}
                  />
                </div>
              )}
            </fieldset>
          </li>
        ))}
      </ol>

      {!locked && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setRows((rs) => [...rs, { uid: uid(), label: "", type: "text", required: false, options: "" }]);
              setDirty(true);
            }}
            disabled={rows.length >= 15}
          >
            <Plus /> Tambah kolom
          </Button>
          <Button variant={dirty ? "seal" : "primary"} onClick={save} disabled={pending || !dirty}>
            <Save /> {pending ? "Menyimpan…" : dirty ? "Simpan form" : "Tersimpan"}
          </Button>
        </div>
      )}
      {message && <Notice announce tone={message.tone}>{message.text}</Notice>}
      <p className="text-xs text-muted">
        Kolom tambahan bisa dicetak di sertifikat: buka tab Template, lalu tambahkan dari daftar Kolom.
      </p>
    </div>
  );
}
