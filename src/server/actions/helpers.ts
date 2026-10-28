import "server-only";

import { getCurrentUser, type AdminUser } from "@/lib/auth/session";
import type { ActionState } from "@/lib/action-state";

export {
  actionError,
  actionSuccess,
  initialActionState,
  type ActionState,
} from "@/lib/action-state";

export async function getActionUser(): Promise<AdminUser | null> {
  return getCurrentUser();
}

/**
 * Converts unexpected failures into a safe message and logs the real error
 * server-side. Stack traces and database details never reach the browser.
 */
export function unexpectedError(error: unknown, context: string): ActionState {
  console.error(`[action:${context}]`, error);
  return {
    status: "error",
    message: "Something went wrong while processing this request. Please try again.",
  };
}

export const sessionExpired: ActionState = {
  status: "error",
  message: "Your session has expired. Please sign in again to continue.",
};
