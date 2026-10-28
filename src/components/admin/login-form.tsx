"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { initialActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" ? <Alert tone="error">{state.message}</Alert> : null}
      <Field label="Email address" htmlFor="email" required error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
        />
      </Field>
      <Field label="Password" htmlFor="password" required error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-xs leading-5 text-muted">
        Staff access only. Failed attempts are recorded and rate limited.
      </p>
    </form>
  );
}
