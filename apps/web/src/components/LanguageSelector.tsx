"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/lib/i18n/types";

type LanguageSelectorProps = {
  onLanguageChange?: (language: SupportedLanguage) => void;
};

export function LanguageSelector({ onLanguageChange }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="language-select"
        className="text-sm font-medium text-[var(--text-secondary)]"
      >
        {t("language.label")}
      </label>
      <select
        id="language-select"
        value={language}
        onChange={(event) => {
          const next = event.target.value as SupportedLanguage;
          setLanguage(next);
          onLanguageChange?.(next);
        }}
        className="max-w-[10.5rem] rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2.5 py-1.5 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
      >
        {SUPPORTED_LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {LANGUAGE_LABELS[code]}
          </option>
        ))}
      </select>
    </div>
  );
}
