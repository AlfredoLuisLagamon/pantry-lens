"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { ProductGrid, ProductGridSkeleton } from "./ProductGrid";
import { RecentSearchesBar } from "./RecentSearchesBar";
import { ApiError } from "@/lib/api/types";
import {
  getRecentSearches,
  recordRecentSearch,
} from "@/lib/api/searches";
import {
  isUpstreamSearchError,
  searchProducts,
} from "@/lib/api/products";
import type { ProductSearchResponse } from "@/lib/api/types";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import type { SupportedLanguage } from "@/lib/i18n/types";

type SearchState =
  | { status: "idle" }
  | { status: "loading"; query: string; page: number }
  | {
      status: "success";
      query: string;
      page: number;
      data: ProductSearchResponse;
    }
  | {
      status: "error";
      query: string;
      page: number;
      code: string;
    };

export function SearchPanel() {
  const { language, isLanguageReady, t, tError } = useTranslation();
  const [input, setInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [recentHistoryUnavailable, setRecentHistoryUnavailable] =
    useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const languageRef = useRef(language);
  const activeQueryRef = useRef<string | null>(null);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!isLanguageReady) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const searches = await getRecentSearches();
        if (!cancelled) {
          setRecentQueries(searches.map((item) => item.query));
          setRecentHistoryUnavailable(false);
        }
      } catch {
        if (!cancelled) {
          setRecentHistoryUnavailable(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLanguageReady]);

  async function refreshRecentSearches() {
    try {
      const searches = await getRecentSearches();
      setRecentQueries(searches.map((item) => item.query));
      setRecentHistoryUnavailable(false);
    } catch {
      setRecentHistoryUnavailable(true);
    }
  }

  async function executeSearch(
    query: string,
    page: number,
    options: {
      recordHistory: boolean;
      languageOverride?: SupportedLanguage;
    },
  ) {
    if (!isLanguageReady && !options.languageOverride) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestLanguage = options.languageOverride ?? languageRef.current;

    setLocalError(null);
    setInput(query);
    activeQueryRef.current = query;
    setState({ status: "loading", query, page });

    try {
      const data = await searchProducts({
        query,
        page,
        language: requestLanguage,
        signal: controller.signal,
      });
      if (controller.signal.aborted) {
        return;
      }

      setState({ status: "success", query, page, data });

      if (options.recordHistory) {
        try {
          await recordRecentSearch(query);
          await refreshRecentSearches();
        } catch {
          setRecentHistoryUnavailable(true);
        }
      }
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        return;
      }
      if (error instanceof ApiError) {
        setState({
          status: "error",
          query,
          page,
          code: error.code,
        });
        return;
      }
      setState({
        status: "error",
        query,
        page,
        code: "UNKNOWN_ERROR",
      });
    }
  }

  useEffect(() => {
    if (!isLanguageReady) {
      return;
    }

    const activeQuery = activeQueryRef.current;
    if (!activeQuery) {
      return;
    }

    void executeSearch(activeQuery, 1, {
      recordHistory: false,
      languageOverride: language,
    });
    // Intentionally depend only on language readiness + language code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, isLanguageReady]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = input.trim();
    if (query.length < 2) {
      setLocalError(t("search.validation.minLength"));
      return;
    }
    void executeSearch(query, 1, { recordHistory: true });
  }

  const isLoading = state.status === "loading";
  const currentQuery = state.status === "idle" ? input.trim() : state.query;
  const currentPage = state.status === "idle" ? 1 : state.page;
  const canGoNext =
    state.status === "success" &&
    state.data.products.length === state.data.pageSize;
  const canGoPrevious = currentPage > 1 && state.status !== "idle";

  function errorMessage(code: string): string {
    if (isUpstreamSearchError(code)) {
      return t("search.upstreamError");
    }
    return tError(code);
  }

  return (
    <section className="space-y-7 sm:space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[2.35rem] sm:leading-tight">
          {t("search.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
          {t("search.subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5" noValidate>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <div className="min-w-0 flex-1">
            <label htmlFor="product-search" className="sr-only">
              {t("search.label")}
            </label>
            <input
              id="product-search"
              type="search"
              name="q"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                if (localError) {
                  setLocalError(null);
                }
              }}
              placeholder={t("search.placeholder")}
              autoComplete="off"
              aria-invalid={localError ? true : undefined}
              aria-describedby={localError ? "product-search-error" : undefined}
              className="h-12 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 text-base text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !isLanguageReady}
            className="h-12 rounded-xl bg-[var(--accent)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:bg-[color-mix(in_srgb,var(--accent)_55%,#9ca89d)] disabled:text-white/90"
          >
            {isLoading ? t("search.searching") : t("search.submit")}
          </button>
        </div>
        {localError ? (
          <p
            id="product-search-error"
            className="text-sm text-[var(--danger-text)]"
            role="alert"
          >
            {localError}
          </p>
        ) : null}
      </form>

      <RecentSearchesBar
        searches={recentQueries}
        disabled={isLoading || !isLanguageReady}
        onSelect={(query) =>
          void executeSearch(query, 1, { recordHistory: true })
        }
      />

      {recentHistoryUnavailable ? (
        <p className="text-xs text-[var(--text-muted)]">
          {t("recent.unavailable")}
        </p>
      ) : null}

      <div aria-live="polite" className="space-y-4">
        {state.status === "idle" ? (
          <p className="text-sm text-[var(--text-muted)]">{t("search.idleHint")}</p>
        ) : null}

        {state.status === "loading" ? <ProductGridSkeleton /> : null}

        {state.status === "error" ? (
          <div
            className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-5"
            role="alert"
          >
            <p className="font-medium text-[var(--danger-text)]">
              {errorMessage(state.code)}
            </p>
            <button
              type="button"
              onClick={() =>
                void executeSearch(state.query, state.page, {
                  recordHistory: state.page === 1,
                })
              }
              className="mt-3 rounded-lg border border-[color-mix(in_srgb,var(--danger-border)_80%,#c49a8f)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-medium text-[var(--danger-text)] transition hover:bg-[#fff8f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--danger-text)]"
            >
              {t("search.retry")}
            </button>
          </div>
        ) : null}

        {state.status === "success" && state.data.products.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-5">
            <p className="break-words font-medium text-[var(--foreground)]">
              {t("search.emptyTitle", { query: state.query })}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t("search.emptyHint")}
            </p>
          </div>
        ) : null}

        {state.status === "success" && state.data.products.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className="text-sm text-[var(--text-secondary)]">
                {t("search.resultsFor", { query: state.data.query })}
                {state.data.total !== null
                  ? t("search.resultsTotal", {
                      total: state.data.total.toLocaleString(),
                    })
                  : ""}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!canGoPrevious || isLoading}
                  onClick={() =>
                    void executeSearch(
                      currentQuery,
                      Math.max(1, currentPage - 1),
                      { recordHistory: false },
                    )
                  }
                  className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[color-mix(in_srgb,var(--skeleton)_70%,white)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("search.previous")}
                </button>
                <button
                  type="button"
                  disabled={!canGoNext || isLoading}
                  onClick={() =>
                    void executeSearch(currentQuery, currentPage + 1, {
                      recordHistory: false,
                    })
                  }
                  className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[color-mix(in_srgb,var(--skeleton)_70%,white)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("search.next")}
                </button>
              </div>
            </div>
            <ProductGrid products={state.data.products} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
