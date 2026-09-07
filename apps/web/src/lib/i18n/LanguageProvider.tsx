"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { translate, translateErrorCode, type MessageKey } from "./index";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  parseStoredLanguage,
  type SupportedLanguage,
} from "./types";

type LanguageContextValue = {
  language: SupportedLanguage;
  isLanguageReady: boolean;
  setLanguage: (language: SupportedLanguage) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  tError: (code: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] =
    useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const [isLanguageReady, setIsLanguageReady] = useState(false);

  useEffect(() => {
    const stored = parseStoredLanguage(
      window.localStorage.getItem(LANGUAGE_STORAGE_KEY),
    );
    setLanguageState(stored);
    document.documentElement.lang = stored;
    setIsLanguageReady(true);
  }, []);

  const setLanguage = useCallback((next: SupportedLanguage) => {
    setLanguageState(next);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    document.documentElement.lang = next;
    setIsLanguageReady(true);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      isLanguageReady,
      setLanguage,
      t: (key, vars) => translate(language, key, vars),
      tError: (code) => translateErrorCode(language, code),
    }),
    [language, isLanguageReady, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within LanguageProvider");
  }
  return context;
}
