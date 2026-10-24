import { Badge } from "@/components/ui";
import type { Availability } from "@/lib/forms";

const MAP: Record<Availability, { tone: "neutral" | "ok" | "warn" | "danger"; label: string }> = {
  draft: { tone: "neutral", label: "Draf" },
  open: { tone: "ok", label: "Menerima respons" },
  not_yet: { tone: "warn", label: "Terjadwal" },
  closed: { tone: "danger", label: "Ditutup" },
  full: { tone: "warn", label: "Kuota penuh" },
};

export function AvailabilityBadge({ value }: { value: Availability }) {
  const { tone, label } = MAP[value];
  return (
    <Badge tone={tone}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </Badge>
  );
}
