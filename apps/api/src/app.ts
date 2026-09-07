import cors from "cors";
import express from "express";

import { config } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { billingRouter } from "./routes/billing";
import { healthRouter } from "./routes/health";
import { productsRouter } from "./routes/products";
import { searchesRouter } from "./routes/searches";
import { stripeWebhookRouter } from "./routes/stripeWebhooks";
import { userRouter } from "./routes/user";

export function createApp() {
  const app = express();

  // Stripe signature verification requires the untouched raw body.
  // Mount before express.json() so webhook payloads are not pre-parsed.
  app.use("/api/webhooks", stripeWebhookRouter);

  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: false,
    }),
  );

  app.use(express.json());

  app.use("/api/health", healthRouter);
  app.use("/api/user", userRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/searches", searchesRouter);
  app.use("/api/billing", billingRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
