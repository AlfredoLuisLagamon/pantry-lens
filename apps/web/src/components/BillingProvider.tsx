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

import { createCheckoutSession } from "@/lib/api/billing";
import { ApiError } from "@/lib/api/types";
import { getUser, type UserResponse } from "@/lib/api/user";

type BillingState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; user: UserResponse };

type BillingContextValue = {
  state: BillingState;
  checkoutLoading: boolean;
  checkoutErrorCode: string | null;
  startCheckout: () => Promise<void>;
  clearCheckoutError: () => void;
};

const BillingContext = createContext<BillingContextValue | null>(null);

export function BillingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BillingState>({ status: "loading" });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutErrorCode, setCheckoutErrorCode] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const user = await getUser(controller.signal);
        if (controller.signal.aborted) {
          return;
        }
        setState({ status: "ready", user });
      } catch (error) {
        if (
          controller.signal.aborted ||
          (error instanceof Error && error.name === "AbortError")
        ) {
          return;
        }
        setState({ status: "unavailable" });
      }
    })();

    return () => controller.abort();
  }, []);

  const clearCheckoutError = useCallback(() => {
    setCheckoutErrorCode(null);
  }, []);

  const startCheckout = useCallback(async () => {
    if (checkoutLoading) {
      return;
    }

    setCheckoutLoading(true);
    setCheckoutErrorCode(null);

    try {
      const session = await createCheckoutSession();
      window.location.assign(session.url);
    } catch (error) {
      setCheckoutLoading(false);
      if (error instanceof ApiError) {
        setCheckoutErrorCode(error.code);
        return;
      }
      setCheckoutErrorCode("STRIPE_CHECKOUT_FAILED");
    }
  }, [checkoutLoading]);

  const value = useMemo<BillingContextValue>(
    () => ({
      state,
      checkoutLoading,
      checkoutErrorCode,
      startCheckout,
      clearCheckoutError,
    }),
    [
      state,
      checkoutLoading,
      checkoutErrorCode,
      startCheckout,
      clearCheckoutError,
    ],
  );

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  );
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error("useBilling must be used within BillingProvider");
  }
  return context;
}
