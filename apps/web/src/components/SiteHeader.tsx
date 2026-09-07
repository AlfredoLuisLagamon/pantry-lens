"use client";

import Link from "next/link";

import { LanguageSelector } from "./LanguageSelector";
import { SubscriptionControls } from "./SubscriptionControls";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_88%,white)] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[var(--page-max)] flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
        <Link
          href="/"
          className="shrink-0 font-[family-name:var(--font-display)] text-[1.65rem] font-semibold leading-none tracking-tight text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          Pantry Lens
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:justify-end">
          <SubscriptionControls />
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
}
