import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

vi.mock("../db/prisma", () => ({
  prisma: {
    stripeEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../integrations/stripe/client", () => ({
  getStripeWebhook: vi.fn(),
}));

import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { AppError } from "../errors/AppError";
import { getStripeWebhook } from "../integrations/stripe/client";
import { hasNutritionAccess } from "../lib/entitlements";
import {
  normalizeSubscriptionState,
  processStripeEvent,
  unixSecondsToDate,
  verifyStripeWebhookEvent,
} from "../services/stripeWebhooks";

const findEvent = prisma.stripeEvent.findUnique as ReturnType<typeof vi.fn>;
const findUser = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const findSubscription = prisma.subscription
  .findUnique as ReturnType<typeof vi.fn>;
const upsertSubscription = prisma.subscription
  .upsert as ReturnType<typeof vi.fn>;
const createEvent = prisma.stripeEvent.create as ReturnType<typeof vi.fn>;
const transaction = prisma.$transaction as ReturnType<typeof vi.fn>;
const getStripeWebhookMock = getStripeWebhook as ReturnType<typeof vi.fn>;

const WEBHOOK_SECRET = "whsec_test_secret";
const stripeForSignatures = new Stripe("sk_test_signature_helper");

function makeSubscription(overrides?: {
  id?: string;
  status?: Stripe.Subscription.Status;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string>;
  customer?: string;
  priceId?: string;
  periodEnd?: number;
  items?: Stripe.SubscriptionItem[];
}): Stripe.Subscription {
  const priceId = overrides?.priceId ?? "price_live_item";
  const periodEnd = overrides?.periodEnd ?? 1_725_000_000;
  const item = {
    id: "si_1",
    object: "subscription_item",
    billing_thresholds: null,
    created: 1,
    current_period_end: periodEnd,
    current_period_start: periodEnd - 30 * 24 * 60 * 60,
    discounts: [],
    metadata: {},
    plan: {} as Stripe.Plan,
    price: { id: priceId } as Stripe.Price,
    subscription: overrides?.id ?? "sub_1",
    tax_rates: null,
  } as Stripe.SubscriptionItem;

  return {
    id: overrides?.id ?? "sub_1",
    object: "subscription",
    status: overrides?.status ?? "active",
    cancel_at_period_end: overrides?.cancel_at_period_end ?? false,
    metadata: overrides?.metadata ?? { userId: "user_1" },
    customer: overrides?.customer ?? "cus_1",
    items: {
      object: "list",
      data: overrides?.items ?? [item],
      has_more: false,
      url: "",
    },
  } as Stripe.Subscription;
}

function makeEvent(
  type: string,
  object: unknown,
  id = "evt_1",
): Stripe.Event {
  return {
    id,
    object: "event",
    api_version: null,
    created: 1,
    type,
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: { object: object as Stripe.Event.Data.Object },
  } as Stripe.Event;
}

describe("unixSecondsToDate", () => {
  it("converts finite unix seconds including zero", () => {
    expect(unixSecondsToDate(0)).toEqual(new Date(0));
    expect(unixSecondsToDate(1_725_000_000)).toEqual(
      new Date(1_725_000_000 * 1000),
    );
  });

  it("preserves null and undefined without truthiness bugs", () => {
    expect(unixSecondsToDate(null)).toBeNull();
    expect(unixSecondsToDate(undefined)).toBeNull();
  });
});

describe("normalizeSubscriptionState", () => {
  it("mirrors item price.id and period end from stripe@22 item fields", () => {
    const subscription = makeSubscription({
      priceId: "price_from_item",
      periodEnd: 1_700_000_000,
      status: "past_due",
      cancel_at_period_end: true,
    });

    expect(normalizeSubscriptionState(subscription, "user_1")).toEqual({
      userId: "user_1",
      stripeSubscriptionId: "sub_1",
      stripePriceId: "price_from_item",
      status: "past_due",
      currentPeriodEnd: new Date(1_700_000_000 * 1000),
      cancelAtPeriodEnd: true,
    });
  });

  it("fails when subscription items are missing", () => {
    const subscription = makeSubscription({
      items: [],
    });

    expect(() => normalizeSubscriptionState(subscription, "user_1")).toThrow(
      AppError,
    );
  });
});

describe("verifyStripeWebhookEvent", () => {
  beforeEach(() => {
    getStripeWebhookMock.mockReturnValue({
      stripe: stripeForSignatures,
      config: {
        secretKey: "sk_test_signature_helper",
        webhookSecret: WEBHOOK_SECRET,
      },
    });
  });

  it("accepts a valid signature over raw payload bytes", () => {
    const payload = JSON.stringify(
      makeEvent("customer.created", { id: "cus_x" }),
    );
    const signature = stripeForSignatures.webhooks.generateTestHeaderString({
      payload,
      secret: WEBHOOK_SECRET,
    });

    const event = verifyStripeWebhookEvent(Buffer.from(payload), signature);
    expect(event.type).toBe("customer.created");
  });

  it("rejects a missing signature", () => {
    expect(() =>
      verifyStripeWebhookEvent(Buffer.from("{}"), undefined),
    ).toThrow(
      expect.objectContaining({
        code: "STRIPE_SIGNATURE_MISSING",
        statusCode: 400,
      }),
    );
  });

  it("rejects an invalid signature", () => {
    expect(() =>
      verifyStripeWebhookEvent(Buffer.from("{}"), "t=1,v1=bad"),
    ).toThrow(
      expect.objectContaining({
        code: "STRIPE_SIGNATURE_INVALID",
        statusCode: 400,
      }),
    );
  });
});

describe("processStripeEvent", () => {
  const retrieve = vi.fn();

  beforeEach(() => {
    findEvent.mockReset();
    findUser.mockReset();
    findSubscription.mockReset();
    upsertSubscription.mockReset();
    createEvent.mockReset();
    transaction.mockReset();
    retrieve.mockReset();
    getStripeWebhookMock.mockReset();

    getStripeWebhookMock.mockReturnValue({
      stripe: {
        subscriptions: { retrieve },
        webhooks: stripeForSignatures.webhooks,
      },
      config: {
        secretKey: "sk_test_mock",
        webhookSecret: WEBHOOK_SECRET,
      },
    });

    transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
      fn(prisma),
    );
    findEvent.mockResolvedValue(null);
    findSubscription.mockResolvedValue(null);
    upsertSubscription.mockResolvedValue({});
    createEvent.mockResolvedValue({});
    findUser.mockResolvedValue({ id: "user_1" });
  });

  it("returns success without mutating for duplicate StripeEvent ids", async () => {
    findEvent.mockResolvedValue({ id: "evt_dup", type: "x", processedAt: new Date() });

    await expect(
      processStripeEvent(makeEvent("customer.subscription.updated", {}, "evt_dup")),
    ).resolves.toEqual({ received: true });

    expect(retrieve).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("ignores unsupported events with 200 semantics", async () => {
    await expect(
      processStripeEvent(makeEvent("invoice.created", { id: "in_1" }, "evt_ignored")),
    ).resolves.toEqual({ received: true });
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("checkout.session.completed retrieves subscription and upserts local state", async () => {
    const current = makeSubscription({ status: "active", priceId: "price_item" });
    retrieve.mockResolvedValue(current);

    await processStripeEvent(
      makeEvent(
        "checkout.session.completed",
        {
          id: "cs_1",
          object: "checkout.session",
          client_reference_id: "user_1",
          metadata: { userId: "user_1" },
          customer: "cus_1",
          subscription: "sub_1",
        },
        "evt_checkout",
      ),
    );

    expect(retrieve).toHaveBeenCalledWith("sub_1");
    expect(upsertSubscription).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      create: expect.objectContaining({
        userId: "user_1",
        stripeSubscriptionId: "sub_1",
        stripePriceId: "price_item",
        status: "active",
      }),
      update: expect.objectContaining({
        stripeSubscriptionId: "sub_1",
        stripePriceId: "price_item",
        status: "active",
      }),
    });
    expect(createEvent).toHaveBeenCalledWith({
      data: { id: "evt_checkout", type: "checkout.session.completed" },
    });
  });

  it("created/updated persist retrieved status rather than stale event snapshot", async () => {
    const snapshot = makeSubscription({ status: "active" });
    const retrieved = makeSubscription({ status: "past_due", priceId: "price_item" });
    retrieve.mockResolvedValue(retrieved);

    await processStripeEvent(
      makeEvent("customer.subscription.updated", snapshot, "evt_updated"),
    );

    expect(upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ status: "past_due" }),
      }),
    );
    expect(hasNutritionAccess("past_due")).toBe(false);
  });

  it("deleted cancels matching current subscription", async () => {
    findSubscription.mockResolvedValue({
      userId: "user_1",
      stripeSubscriptionId: "sub_old",
      status: "active",
    });

    await processStripeEvent(
      makeEvent(
        "customer.subscription.deleted",
        makeSubscription({ id: "sub_old", status: "canceled" }),
        "evt_deleted",
      ),
    );

    expect(retrieve).not.toHaveBeenCalled();
    expect(upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          stripeSubscriptionId: "sub_old",
          status: "canceled",
        }),
      }),
    );
  });

  it("late delete for an older subscription does not overwrite the newer current row", async () => {
    findSubscription.mockResolvedValue({
      userId: "user_1",
      stripeSubscriptionId: "sub_new",
      status: "active",
    });

    await processStripeEvent(
      makeEvent(
        "customer.subscription.deleted",
        makeSubscription({ id: "sub_old", status: "canceled" }),
        "evt_late_delete",
      ),
    );

    expect(upsertSubscription).not.toHaveBeenCalled();
    expect(createEvent).toHaveBeenCalledWith({
      data: { id: "evt_late_delete", type: "customer.subscription.deleted" },
    });
  });

  it("treats StripeEvent unique conflicts as already-processed success", async () => {
    retrieve.mockResolvedValue(makeSubscription({ status: "active" }));
    transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["id"] },
      }),
    );

    await expect(
      processStripeEvent(
        makeEvent(
          "customer.subscription.created",
          makeSubscription({ status: "incomplete" }),
          "evt_race",
        ),
      ),
    ).resolves.toEqual({ received: true });
  });

  it("fails checkout.session.completed when subscription id is missing", async () => {
    await expect(
      processStripeEvent(
        makeEvent(
          "checkout.session.completed",
          {
            id: "cs_missing",
            object: "checkout.session",
            client_reference_id: "user_1",
            metadata: { userId: "user_1" },
            customer: "cus_1",
            subscription: null,
          },
          "evt_missing_sub",
        ),
      ),
    ).rejects.toMatchObject({
      code: "STRIPE_WEBHOOK_PROCESSING_FAILED",
      statusCode: 502,
    });
    expect(createEvent).not.toHaveBeenCalled();
  });

  it("fails closed when metadata user cannot be mapped", async () => {
    retrieve.mockResolvedValue(
      makeSubscription({ metadata: { userId: "missing_user" } }),
    );
    findUser.mockResolvedValue(null);

    await expect(
      processStripeEvent(
        makeEvent(
          "customer.subscription.created",
          makeSubscription({ metadata: { userId: "missing_user" } }),
          "evt_unmap",
        ),
      ),
    ).rejects.toMatchObject({
      code: "STRIPE_SUBSCRIPTION_MAPPING_FAILED",
    });
  });
});
