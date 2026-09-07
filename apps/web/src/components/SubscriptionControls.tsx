"use client";

import { useBilling } from "./BillingProvider";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

type SubscriptionControlsProps = {
  compact?: boolean;
};

export function SubscriptionControls({
  compact = false,
}: SubscriptionControlsProps) {
  const { t, tError } = useTranslation();
  const { state, checkoutLoading, checkoutErrorCode, startCheckout } =
    useBilling();

  if (state.status === "loading") {
    return (
      <div
        className={
          compact
            ? "h-8 w-24 animate-pulse rounded-lg bg-[var(--skeleton)]"
            : "h-8 w-28 animate-pulse rounded-lg bg-[var(--skeleton)]"
        }
        aria-hidden
      />
    );
  }

  if (state.status === "unavailable") {
    return (
      <p className="max-w-[12rem] text-xs leading-snug text-[var(--text-muted)] sm:max-w-[14rem] sm:text-right">
        {t("billing.statusUnavailable")}
      </p>
    );
  }

  if (state.user.hasNutritionAccess) {
    return (
      <p className="rounded-md border border-[var(--success-border)] bg-[var(--success-bg)] px-2.5 py-1 text-sm font-medium text-[var(--success-text)]">
        {t("billing.subscribed")}
      </p>
    );
  }

  return (
    <div
      className={
        compact
          ? "flex flex-col items-start gap-1"
          : "flex flex-col items-stretch gap-1 sm:items-end"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {!compact ? (
          <span className="hidden text-xs text-[var(--text-muted)] sm:inline">
            {t("billing.price")}
          </span>
        ) : null}
        <button
          type="button"
          disabled={checkoutLoading}
          onClick={() => void startCheckout()}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:bg-[color-mix(in_srgb,var(--accent)_55%,#9ca89d)] disabled:text-white/90"
        >
          {checkoutLoading ? t("billing.redirecting") : t("billing.subscribe")}
        </button>
      </div>
      {checkoutErrorCode ? (
        <p
          className={
            compact
              ? "max-w-[16rem] text-left text-xs text-[var(--danger-text)]"
              : "max-w-[16rem] text-left text-xs text-[var(--danger-text)] sm:text-right"
          }
          role="alert"
        >
          {checkoutErrorCode === "STRIPE_CHECKOUT_FAILED" ||
          checkoutErrorCode === "STRIPE_CONFIGURATION" ||
          checkoutErrorCode === "ALREADY_SUBSCRIBED"
            ? tError(checkoutErrorCode)
            : t("billing.checkoutFailed")}
        </p>
      ) : null}
    </div>
  );
}
