"use client";
import { useState } from "react";

/** Copies text to the clipboard, and says so for two seconds. */
export function CopyButton({ text, label = "کۆپی کەپشن" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn small ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          window.setTimeout(() => setDone(false), 2000);
        } catch {
          window.prompt("کۆپی بکە:", text);
        }
      }}
    >
      {done ? "کۆپی کرا ✓" : label}
    </button>
  );
}
