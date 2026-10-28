"use client";

import { useEffect } from "react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log only the digest in the browser; the full error stays on the server.
    console.error("Unexpected error", error.digest);
  }, [error.digest]);

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Error</p>
      <h1 className="mt-3 text-3xl font-bold text-navy-900 sm:text-4xl">Something went wrong</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted">
        We could not complete that request. Please try again. If it keeps happening, call Uthman IY
        on 0780551125 so we can help.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className={buttonClasses("primary", "md")}>
          Try again
        </button>
        <Link href="/" className={buttonClasses("outline", "md")}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
