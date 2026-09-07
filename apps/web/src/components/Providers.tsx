"use client";

import { BillingProvider } from "./BillingProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <BillingProvider>{children}</BillingProvider>
    </LanguageProvider>
  );
}
