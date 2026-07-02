"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export function ChannelTestButton({ test }: { test: () => Promise<{ ok: boolean; error?: string }> }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => start(async () => {
          const r = await test();
          setResult(r.ok ? "Sent ✓" : `Failed: ${r.error ?? "error"}`);
          setTimeout(() => setResult(null), 4000);
        })}
      >
        <Send className="size-4" /> {pending ? "Sending…" : "Test"}
      </Button>
      {result && <span className={`text-xs ${result.startsWith("Sent") ? "text-success" : "text-danger"}`}>{result}</span>}
    </span>
  );
}
