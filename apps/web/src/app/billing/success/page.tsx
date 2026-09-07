"use client";

import Link from "next/link";

import { AppShell } from "@/components/AppShell";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

export default function BillingSuccessPage() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <div className="max-w-lg space-y-5">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          {t("billing.successTitle")}
        </h1>
        <p className="text-base leading-relaxed text-[var(--text-secondary)]">
          {t("billing.successBody")}
        </p>
        <Link
          href="/"
          className="inline-flex rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          {t("billing.returnSearch")}
        </Link>
      </div>
    </AppShell>
  );
}
