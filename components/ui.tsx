import Link from "next/link";
import { cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "seal" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-2 shadow-[0_1px_0_0_oklch(1_0_0/0.15)_inset,0_1px_2px_oklch(0.27_0.04_255/0.25)]",
  seal: "bg-seal text-white hover:bg-seal-ink shadow-[0_1px_0_0_oklch(1_0_0/0.2)_inset,0_1px_2px_oklch(0.48_0.16_32/0.35)]",
  outline: "border border-line-strong bg-card text-ink hover:bg-paper-2",
  ghost: "text-ink-2 hover:bg-paper-2 hover:text-ink",
  danger: "border border-seal/30 bg-seal-wash text-seal-ink hover:bg-seal hover:text-white",
};
const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8rem] gap-1.5 rounded-md",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-5 text-[0.95rem] gap-2 rounded-lg",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center font-semibold whitespace-nowrap transition-[background-color,color,transform,box-shadow] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...rest
}: React.ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

const fieldBase =
  "w-full rounded-lg border border-line-strong bg-card px-3 text-ink placeholder:text-muted placeholder:normal-case transition-[border-color,box-shadow] outline-none focus:border-seal focus:ring-3 focus:ring-ring/30 aria-invalid:border-seal aria-invalid:ring-3 aria-invalid:ring-seal/15 read-only:bg-paper-2 read-only:text-ink-2 disabled:opacity-60";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldBase, "h-11 md:h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-24 py-2.5", className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        fieldBase,
        "h-11 appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9 md:h-10",
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b6255' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-semibold text-ink", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  // Tie the hint/error to the control so screen readers read it with the label.
  const describedBy = htmlFor && (error || hint) ? `${htmlFor}-desc` : undefined;
  const control =
    describedBy && isValidElement<{ "aria-describedby"?: string }>(children)
      ? cloneElement(children, { "aria-describedby": describedBy })
      : children;
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {control}
      {error ? (
        <p id={describedBy} className="mt-1.5 text-[0.8rem] font-medium text-seal-ink" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={describedBy} className="mt-1.5 text-[0.8rem] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type Tone = "neutral" | "ok" | "warn" | "seal" | "ink";
const TONES: Record<Tone, string> = {
  neutral: "bg-paper-2 text-ink-2 ring-line-strong",
  ok: "bg-ok-wash text-ok ring-ok/25",
  warn: "bg-warn-wash text-warn ring-warn/25",
  seal: "bg-seal-wash text-seal-ink ring-seal/25",
  ink: "bg-ink text-paper ring-ink",
};

export function Badge({ tone = "neutral", className, ...props }: React.ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset [&_svg]:size-3",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("rounded-xl border border-line bg-card shadow-[0_1px_2px_oklch(0.27_0.04_255/0.04)]", className)} {...props} />;
}

export function Notice({
  tone = "neutral",
  announce,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  tone?: "neutral" | "warn" | "seal" | "ok";
  /** Set on notices that appear in response to an action so assistive tech reads them out. */
  announce?: boolean;
}) {
  const tones = {
    neutral: "border-line bg-paper-2 text-ink-2",
    warn: "border-warn/25 bg-warn-wash text-warn",
    seal: "border-seal/25 bg-seal-wash text-seal-ink",
    ok: "border-ok/25 bg-ok-wash text-ok",
  };
  return (
    <div
      role={announce ? (tone === "seal" || tone === "warn" ? "alert" : "status") : undefined}
      className={cn("flex gap-3 rounded-lg border px-3.5 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0", tones[tone], className)}
      {...props}
    />
  );
}
