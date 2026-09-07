export const SUPPORTED_LANGUAGES = ["en", "nl", "de", "fr"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

export const LANGUAGE_STORAGE_KEY = "pantry-lens.lang";

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  nl: "Nederlands",
  de: "Deutsch",
  fr: "Français",
};

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return (
    typeof value === "string" &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
}

export function parseStoredLanguage(value: string | null): SupportedLanguage {
  if (isSupportedLanguage(value)) {
    return value;
  }
  return DEFAULT_LANGUAGE;
}
