import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import { BillingProvider } from "@/components/BillingProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

type ProviderOptions = {
  withBilling?: boolean;
};

function Providers({
  children,
  withBilling = false,
}: {
  children: ReactNode;
  withBilling?: boolean;
}) {
  if (withBilling) {
    return (
      <LanguageProvider>
        <BillingProvider>{children}</BillingProvider>
      </LanguageProvider>
    );
  }

  return <LanguageProvider>{children}</LanguageProvider>;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & ProviderOptions,
) {
  const { withBilling = false, ...renderOptions } = options ?? {};

  return render(ui, {
    wrapper: ({ children }) => (
      <Providers withBilling={withBilling}>{children}</Providers>
    ),
    ...renderOptions,
  });
}
