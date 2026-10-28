/**
 * Shared action-state types.
 *
 * Kept free of server-only imports so client components can use the same shape
 * for `useActionState` without pulling server code into the browser bundle.
 */
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  /** Optional value returned to the client (e.g. a new order number). */
  data?: Record<string, unknown>;
};

export const initialActionState: ActionState = { status: "idle" };

export function actionSuccess(message: string, data?: Record<string, unknown>): ActionState {
  return { status: "success", message, data };
}

export function actionError(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionState {
  return { status: "error", message, fieldErrors };
}
