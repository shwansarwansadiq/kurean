"use client";
import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="login-form">
      <label htmlFor="password">وشەی نهێنی</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required dir="ltr" autoFocus />
      {state?.error ? (
        <p className="login-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="btn pub" disabled={pending}>
        {pending ? "چاوەڕێ بکە…" : "چوونەژوورەوە"}
      </button>
    </form>
  );
}
