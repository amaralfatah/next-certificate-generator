"use client";

import { useState, useTransition } from "react";
import { updateGuards, updateNumberPrefix } from "@/app/forms/actions";
import { Button, Input, Switch } from "@/components/ui";
import { cn } from "@/lib/utils";

type Initial = { opensAt: string; closesAt: string; quota: string; hasCode: boolean; numberPrefix: string; prefixLocked: boolean };

/** One setting: what it does on the left, its control on the right, details below when it is on. */
function Row({ title, desc, control, children }: { title: string; desc: string; control: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="border-b border-line py-5 first:pt-0 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h4 className="font-medium">{title}</h4>
          <p className="mt-0.5 text-sm text-muted">{desc}</p>
        </div>
        <div className="shrink-0 pt-0.5">{control}</div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

const Err = ({ text }: { text?: string }) => (text ? <p className="mt-1.5 text-[0.8rem] font-medium text-danger">{text}</p> : null);

/** Response guards and the certificate number prefix, each saved as soon as it changes. */
export function SettingsPanel({ eventId, initial }: { eventId: string; initial: Initial }) {
  const [hasCode, setHasCode] = useState(initial.hasCode);
  const [codeOn, setCodeOn] = useState(initial.hasCode);
  const [codeDraft, setCodeDraft] = useState("");
  const [schedOn, setSchedOn] = useState(!!(initial.opensAt || initial.closesAt));
  const [opensAt, setOpensAt] = useState(initial.opensAt);
  const [closesAt, setClosesAt] = useState(initial.closesAt);
  const [limitOn, setLimitOn] = useState(!!initial.quota);
  const [quota, setQuota] = useState(initial.quota);
  const [prefix, setPrefix] = useState(initial.numberPrefix);
  const [savedPrefix, setSavedPrefix] = useState(initial.numberPrefix);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, start] = useTransition();

  const saveGuards = (over: Partial<{ opensAt: string; closesAt: string; quota: string; attendanceCode: string; removeCode: boolean }> = {}) =>
    start(async () => {
      const fd = new FormData();
      const sched = over.opensAt !== undefined || over.closesAt !== undefined || schedOn;
      fd.set("opensAt", sched ? (over.opensAt ?? opensAt) : "");
      fd.set("closesAt", sched ? (over.closesAt ?? closesAt) : "");
      fd.set("quota", over.quota ?? (limitOn ? quota : ""));
      if (over.attendanceCode) fd.set("attendanceCode", over.attendanceCode);
      if (over.removeCode) fd.set("removeCode", "1");
      const r = await updateGuards(eventId, undefined, fd);
      setErrors(r?.errors ?? {});
      setStatus(r?.ok ? "saved" : "error");
      if (r?.ok && over.attendanceCode) {
        setHasCode(true);
        setCodeDraft("");
      }
      if (r?.ok && over.removeCode) setHasCode(false);
    });

  const savePrefix = (value: string) => {
    if (value.trim().toUpperCase() === savedPrefix) return;
    start(async () => {
      const fd = new FormData();
      fd.set("numberPrefix", value);
      const r = await updateNumberPrefix(eventId, undefined, fd);
      setErrors(r?.errors ?? {});
      setStatus(r?.ok ? "saved" : "error");
      if (r?.ok) setSavedPrefix(value.trim().toUpperCase());
    });
  };

  return (
    <>
      <p className={cn("fixed right-4 bottom-4 z-20 rounded-full bg-card/95 px-3 py-1.5 text-xs shadow-soft", status === "idle" && !pending && "hidden")} aria-live="polite">
        {pending ? <span className="text-muted">Menyimpan…</span> : status === "error" ? <span className="text-danger">Belum tersimpan, periksa isian</span> : <span className="text-muted">Tersimpan</span>}
      </p>

      <section className="rounded-xl border border-line bg-card p-5 sm:p-6" aria-labelledby="set-respons">
        <h3 id="set-respons" className="mb-5 text-lg font-semibold">
          Respons
        </h3>

        <Row
          title="Kode kehadiran"
          desc="Peserta harus memasukkan kode yang kamu umumkan saat acara."
          control={
            <Switch
              checked={codeOn}
              label={<span className="sr-only">Kode kehadiran</span>}
              onChange={(on) => {
                setCodeOn(on);
                if (!on && hasCode) saveGuards({ removeCode: true });
              }}
            />
          }
        >
          {codeOn && (
            <form
              className="flex flex-wrap items-start gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (codeDraft.trim()) saveGuards({ attendanceCode: codeDraft });
              }}
            >
              <div className="w-full sm:w-56">
                <label htmlFor="attendanceCode" className="sr-only">
                  Kode kehadiran
                </label>
                <Input
                  id="attendanceCode"
                  value={codeDraft}
                  onChange={(e) => setCodeDraft(e.target.value)}
                  maxLength={32}
                  autoComplete="off"
                  placeholder={hasCode ? "Kode aktif · isi untuk mengganti" : "mis. HADIR26"}
                  className="num uppercase placeholder:normal-case"
                  aria-invalid={!!errors.attendanceCode}
                />
                <Err text={errors.attendanceCode} />
              </div>
              <Button type="submit" variant="outline" disabled={pending || !codeDraft.trim()}>
                {hasCode ? "Ganti kode" : "Simpan kode"}
              </Button>
              {hasCode && <p className="w-full text-xs text-muted">Kode tersimpan terenkripsi, jadi tidak bisa ditampilkan lagi. Salah 5 kali dalam 10 menit membuat peserta menunggu sebentar.</p>}
            </form>
          )}
        </Row>

        <Row
          title="Jadwal"
          desc="Mulai dan berhenti menerima respons secara otomatis."
          control={
            <Switch
              checked={schedOn}
              label={<span className="sr-only">Jadwal</span>}
              onChange={(on) => {
                setSchedOn(on);
                if (!on) {
                  setOpensAt("");
                  setClosesAt("");
                  if (opensAt || closesAt) saveGuards({ opensAt: "", closesAt: "" });
                }
              }}
            />
          }
        >
          {schedOn && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="opensAt" className="mb-1.5 block text-sm font-medium">
                  Mulai (WIB)
                </label>
                <Input
                  id="opensAt"
                  type="datetime-local"
                  value={opensAt}
                  onChange={(e) => {
                    setOpensAt(e.target.value);
                    saveGuards({ opensAt: e.target.value });
                  }}
                />
                <p className="mt-1.5 text-xs text-muted">Kosong: langsung saat dibagikan.</p>
              </div>
              <div>
                <label htmlFor="closesAt" className="mb-1.5 block text-sm font-medium">
                  Berhenti (WIB)
                </label>
                <Input
                  id="closesAt"
                  type="datetime-local"
                  value={closesAt}
                  onChange={(e) => {
                    setClosesAt(e.target.value);
                    saveGuards({ closesAt: e.target.value });
                  }}
                  aria-invalid={!!errors.closesAt}
                />
                {errors.closesAt ? <Err text={errors.closesAt} /> : <p className="mt-1.5 text-xs text-muted">Kosong: sampai kamu menutupnya.</p>}
              </div>
            </div>
          )}
        </Row>

        <Row
          title="Batas jumlah respons"
          desc="Formulir tertutup sendiri setelah jumlah ini tercapai."
          control={
            <Switch
              checked={limitOn}
              label={<span className="sr-only">Batas jumlah respons</span>}
              onChange={(on) => {
                setLimitOn(on);
                if (!on && quota) {
                  setQuota("");
                  saveGuards({ quota: "" });
                }
              }}
            />
          }
        >
          {limitOn && (
            <div>
              <label htmlFor="quota" className="sr-only">
                Batas jumlah respons
              </label>
              <Input
                id="quota"
                type="number"
                inputMode="numeric"
                min={1}
                value={quota}
                placeholder="mis. 100"
                onChange={(e) => setQuota(e.target.value)}
                // Read the input itself: the blur can arrive before the state update re-renders this handler.
                onBlur={(e) => e.currentTarget.value && saveGuards({ quota: e.currentTarget.value })}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.value && saveGuards({ quota: e.currentTarget.value })}
                className="num sm:max-w-40"
                aria-invalid={!!errors.quota}
              />
              <Err text={errors.quota} />
            </div>
          )}
        </Row>
      </section>

      <section className="rounded-xl border border-line bg-card p-5 sm:p-6" aria-labelledby="set-sertifikat">
        <h3 id="set-sertifikat" className="mb-5 text-lg font-semibold">
          Sertifikat
        </h3>
        <Row
          title="Awalan nomor"
          desc={initial.prefixLocked ? "Terkunci karena sudah ada respons." : `Nomor sertifikat menjadi ${savedPrefix}-2026-00001, dan seterusnya.`}
          control={
            <>
              <label htmlFor="numberPrefix" className="sr-only">
                Awalan nomor
              </label>
              <Input
                id="numberPrefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                onBlur={(e) => savePrefix(e.currentTarget.value)}
                onKeyDown={(e) => e.key === "Enter" && savePrefix(e.currentTarget.value)}
                maxLength={8}
                disabled={initial.prefixLocked}
                autoComplete="off"
                className="num w-28 uppercase"
                aria-invalid={!!errors.numberPrefix}
              />
            </>
          }
        >
          {errors.numberPrefix && <Err text={errors.numberPrefix} />}
        </Row>
      </section>
    </>
  );
}
