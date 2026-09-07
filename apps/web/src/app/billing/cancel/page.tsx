"use client";

import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

export default function BillingCancelPage() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <div className="max-w-lg space-y-5">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          {t("billing.cancelTitle")}
        </h1>
        <p className="text-base leading-relaxed text-[var(--text-secondary)]">
          {t("billing.cancelBody")}
        </p>
        <Link
          href="/"
          className="inline-flex rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[color-mix(in_srgb,var(--skeleton)_55%,white)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          {t("billing.returnHome")}
        </Link>
      </div>
    </AppShell>
  );
}
