"use client";
import { useFormStatus } from "react-dom";

/** A submit button that shows it heard the tap and blocks double sends. */
export function Submit({ children, busy, className = "btn" }: { children: React.ReactNode; busy: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? busy : children}
    </button>
  );
}
