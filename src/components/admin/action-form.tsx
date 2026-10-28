"use client";

import { useActionState, type ReactNode } from "react";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared admin form wrapper.
 *
 * Server actions are passed in as props (Next serialises them), so every admin
 * form gets identical pending, success and error handling without duplicating
 * client components.
 */
export function AdminActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Saving…",
  variant = "primary",
  className,
  submitClassName,
  resetOnSuccess = false,
  showSubmit = true,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "outline" | "danger";
  className?: string;
  submitClassName?: string;
  resetOnSuccess?: boolean;
  showSubmit?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const fieldErrorEntries = Object.entries(state.fieldErrors ?? {});

  return (
    <form
      action={formAction}
      className={cn("space-y-4", className)}
      key={resetOnSuccess && state.status === "success" ? state.message : "form"}
      noValidate
    >
      {state.status === "success" ? (
        <Alert tone="success" title="Saved">
          {state.message}
        </Alert>
      ) : null}
      {state.status === "error" ? (
        <Alert tone="error" title="Not saved">
          <p>{state.message}</p>
          {fieldErrorEntries.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
              {fieldErrorEntries.map(([field, messages]) => (
                <li key={field}>
                  <span className="font-semibold">{field}:</span> {messages.join(" ")}
                </li>
              ))}
            </ul>
          ) : null}
        </Alert>
      ) : null}
      {children}
      {showSubmit ? (
        <Button type="submit" variant={variant} disabled={pending} className={submitClassName}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      ) : null}
    </form>
  );
}
