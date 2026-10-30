"use client";
import { useFormStatus } from "react-dom";

/** A submit button that shows it heard the tap and blocks double sends. Can send its form to another action. */
export function Submit({
  children,
  busy,
  className = "btn",
  formAction,
  name,
  value,
}: {
  children: React.ReactNode;
  busy: string;
  className?: string;
  formAction?: (form: FormData) => void | Promise<void>;
  name?: string;
  value?: string;
}) {
  const { pending, data } = useFormStatus();
  // Only the button that was pressed says it is busy; the others just wait.
  const mine = pending && (!name || data?.get(name) === value);
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={mine} formAction={formAction} name={name} value={value}>
      {mine ? busy : children}
    </button>
  );
}
