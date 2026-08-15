import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({
  value,
  labels,
  className,
}: {
  value: string;
  labels: { copy: string; copied: string };
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={onCopy}
      className={
        className ??
        "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium tracking-wide text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
      }
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? `${labels.copied} ✓` : labels.copy}
    </button>
  );
}
