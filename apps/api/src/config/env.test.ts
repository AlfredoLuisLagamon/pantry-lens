import { describe, expect, it } from "vitest";

import { loadConfig } from "../config/env";

describe("loadConfig", () => {
  const base = {
    DATABASE_URL: "mysql://pantry:pantry@127.0.0.1:3306/pantry_lens",
    DEMO_USER_EMAIL: "demo@pantry-lens.local",
    CORS_ORIGIN: "http://localhost:3000",
    PORT: "4000",
  };

  it("loads required core variables", () => {
    expect(loadConfig(base)).toMatchObject({
      port: 4000,
      corsOrigin: "http://localhost:3000",
      databaseUrl: base.DATABASE_URL,
      demoUserEmail: base.DEMO_USER_EMAIL,
    });
  });

  it("fails clearly when required variables are missing", () => {
    expect(() => loadConfig({})).toThrow(
      /Missing required environment variables: DATABASE_URL, DEMO_USER_EMAIL/,
    );
  });

  it("fails clearly for an invalid PORT", () => {
    expect(() => loadConfig({ ...base, PORT: "not-a-port" })).toThrow(
      /Invalid PORT/,
    );
  });

  it("does not include secret values in missing-variable errors", () => {
    expect(() =>
      loadConfig({
        DATABASE_URL: "",
        DEMO_USER_EMAIL: "demo@pantry-lens.local",
      }),
    ).toThrow(/DATABASE_URL/);

    try {
      loadConfig({
        DATABASE_URL: "mysql://secret-user:secret-pass@127.0.0.1:3306/db",
        DEMO_USER_EMAIL: "",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain("secret-pass");
      expect(message).toContain("DEMO_USER_EMAIL");
    }
  });
});
