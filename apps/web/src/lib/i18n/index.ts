import { de } from "./messages/de";
import { en, type MessageKey } from "./messages/en";
import { fr } from "./messages/fr";
import { nl } from "./messages/nl";
import type { SupportedLanguage } from "./types";

export const messages: Record<
  SupportedLanguage,
  Record<MessageKey, string>
> = {
  en,
  nl,
  de,
  fr,
};

export type { MessageKey };

export function translate(
  language: SupportedLanguage,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  let text = messages[language][key] ?? messages.en[key] ?? key;

  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }

  return text;
}

export function translateErrorCode(
  language: SupportedLanguage,
  code: string,
): string {
  const key = `error.${code}` as MessageKey;
  if (key in messages.en) {
    return translate(language, key);
  }
  return translate(language, "error.UNKNOWN_ERROR");
}
