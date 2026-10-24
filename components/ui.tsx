import Link from "next/link";
import { cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "seal" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

// DESIGN.md: blue is the only colour that paints an action. "seal" is the pill CTA (marketing, the one
// big action on a page); "primary" is the same blue at the tighter 8px utility radius.
const VARIANTS: Record<Variant, string> = {
  primary: "bg-seal text-white hover:bg-seal-ink",
  seal: "bg-seal text-white hover:bg-seal-ink rounded-full!",
  outline: "border border-line-strong bg-card text-ink hover:bg-paper-2",
  ghost: "text-ink-2 hover:bg-ink/5 hover:text-ink",
  danger: "border border-danger/30 bg-danger-wash text-danger hover:bg-danger hover:text-white",
};
const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8rem] gap-1.5 rounded-lg pointer-coarse:h-11 pointer-coarse:px-4 pointer-coarse:text-sm",
  md: "h-10 px-4 text-[0.9375rem] gap-2 rounded-lg",
  lg: "h-12 px-6 text-base gap-2 rounded-lg",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center font-medium whitespace-nowrap transition-[background-color,color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] active:duration-75 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
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
  "w-full rounded-sm border border-line-strong bg-card px-3 text-ink placeholder:text-faint placeholder:normal-case transition-[border-color,box-shadow] outline-none focus:border-seal focus:shadow-soft focus:ring-3 focus:ring-ring/25 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/15 disabled:opacity-60";
// Chrome matches every <select> as :read-only, so the read-only tint goes on text fields only.
const readOnlyTint = "read-only:bg-paper-2 read-only:text-ink-2";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldBase, readOnlyTint, "h-11 md:h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, readOnlyTint, "min-h-24 py-2.5", className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        fieldBase,
        "h-11 appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9 md:h-10",
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23615d59' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-ink", className)} {...props} />;
}

export function Field({
  label,
  labelClassName,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: React.ReactNode;
  labelClassName?: string;
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
      <Label htmlFor={htmlFor} className={labelClassName}>
        {label}
      </Label>
      {control}
      {error ? (
        <p id={describedBy} className="mt-1.5 text-[0.8rem] font-medium text-danger" role="alert">
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

type Tone = "neutral" | "ok" | "warn" | "danger" | "ink";
const TONES: Record<Tone, string> = {
  neutral: "bg-paper-2 text-ink-2 ring-line-strong",
  ok: "bg-ok-wash text-ok ring-ok/25",
  warn: "bg-warn-wash text-warn ring-warn/25",
  danger: "bg-danger-wash text-danger ring-danger/25",
  ink: "bg-ink text-paper ring-ink",
};

export function Badge({ tone = "neutral", className, ...props }: React.ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold tracking-[0.01em] whitespace-nowrap ring-1 ring-inset [&_svg]:size-3",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("rounded-xl border border-line bg-card", className)} {...props} />;
}

export function Notice({
  tone = "neutral",
  announce,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  tone?: "neutral" | "warn" | "danger" | "ok";
  /** Set on notices that appear in response to an action so assistive tech reads them out. */
  announce?: boolean;
}) {
  const tones = {
    neutral: "border-line bg-paper-2 text-ink-2",
    warn: "border-warn/25 bg-warn-wash text-warn",
    danger: "border-danger/25 bg-danger-wash text-danger",
    ok: "border-ok/25 bg-ok-wash text-ok",
  };
  return (
    <div
      role={announce ? (tone === "danger" || tone === "warn" ? "alert" : "status") : undefined}
      className={cn("flex gap-3 rounded-lg border px-3.5 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0", tones[tone], className)}
      {...props}
    />
  );
}

/** An on/off switch: a real checkbox with role="switch", styled as a track and thumb. */
export function Switch({
  checked,
  onChange,
  label,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "onChange"> & { checked: boolean; onChange: (checked: boolean) => void; label: React.ReactNode }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium select-none has-disabled:cursor-default has-disabled:opacity-60", className)}>
      <span className="relative inline-flex h-6 w-10 shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 z-10 cursor-pointer appearance-none rounded-full outline-none disabled:cursor-default"
          {...props}
        />
        <span className="absolute inset-0 rounded-full bg-line-strong transition-colors peer-checked:bg-seal peer-focus-visible:ring-3 peer-focus-visible:ring-ring" />
        <span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-soft transition-transform duration-200 peer-checked:translate-x-4" />
      </span>
      {label}
    </label>
  );
}
