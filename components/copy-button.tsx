"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";

export function CopyButton({ text, label = "Salin" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard blocked: the text is selectable next to the button */
        }
      }}
      aria-live="polite"
    >
      {copied ? <Check className="text-ok" /> : <Copy />}
      {copied ? "Tersalin" : label}
    </Button>
  );
}
