"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";

type RecentSearchesBarProps = {
  searches: string[];
  disabled?: boolean;
  onSelect: (query: string) => void;
};

export function RecentSearchesBar({
  searches,
  disabled = false,
  onSelect,
}: RecentSearchesBarProps) {
  const { t } = useTranslation();

  if (searches.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {t("recent.title")}
      </p>
      <div className="flex flex-wrap gap-2">
        {searches.map((query) => (
          <button
            key={query}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(query)}
            className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  );
}
