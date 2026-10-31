import { formatRwf } from "@/lib/money";
import { formatPhone } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import type { UssdPrompt } from "@/lib/payments/ussd";

/**
 * One-tap mobile money payment.
 *
 * Renders a `tel:` link holding the whole USSD string, so tapping it opens the
 * handset dialer with the receiving number and amount already filled in - the
 * customer only presses Call and enters their MoMo PIN. On a computer (where a
 * tel: link does nothing useful) the code is printed so it can be dialled by
 * hand. Nothing here claims the payment succeeded; verification still happens
 * through the transaction reference.
 */
export function UssdPayButton({
  prompt,
  label,
  className,
}: {
  prompt: UssdPrompt | null;
  label?: string;
  className?: string;
}) {
  if (!prompt) return null;

  return (
    <div className={className}>
      <a
        href={prompt.href}
        className={buttonClasses("primary", "lg", "w-full")}
        data-ussd-code={prompt.code}
        aria-label={`Pay ${formatRwf(prompt.amountRwf)} with MTN MoMo`}
      >
        {label ?? `Pay ${formatRwf(prompt.amountRwf)} with MoMo`}
      </a>
      <p className="mt-2 text-xs leading-5 text-muted">
        Tapping opens <strong className="font-semibold text-navy-900">{prompt.code}</strong> in your
        phone&apos;s dialer with the amount filled in — press call, then enter your MoMo PIN. On a
        computer, dial that code from your phone and send{" "}
        <strong className="font-semibold text-navy-900">{formatRwf(prompt.amountRwf)}</strong> to{" "}
        <strong className="font-semibold text-navy-900">{formatPhone(prompt.msisdn)}</strong>.
      </p>
    </div>
  );
}
