import path from "node:path";

import { config as loadDotenv } from "dotenv";

loadDotenv({ path: path.resolve(__dirname, "../../.env") });

export type AppConfig = {
  port: number;
  corsOrigin: string;
  databaseUrl: string;
  demoUserEmail: string;
  nodeEnv: string;
};

function requireNonEmpty(
  env: NodeJS.ProcessEnv,
  key: string,
  missing: string[],
): string | undefined {
  const value = env[key]?.trim();
  if (!value) {
    missing.push(key);
    return undefined;
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const missing: string[] = [];

  const databaseUrl = requireNonEmpty(env, "DATABASE_URL", missing);
  const demoUserEmail = requireNonEmpty(env, "DEMO_USER_EMAIL", missing);
  const corsOrigin =
    env.CORS_ORIGIN?.trim() || "http://localhost:3000";

  const portRaw = env.PORT?.trim() || "4000";
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid PORT: must be an integer between 1 and 65535 (received a non-secret invalid value).`,
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  return {
    port,
    corsOrigin,
    databaseUrl: databaseUrl!,
    demoUserEmail: demoUserEmail!,
    nodeEnv: env.NODE_ENV?.trim() || "development",
  };
}

export const config = loadConfig();
