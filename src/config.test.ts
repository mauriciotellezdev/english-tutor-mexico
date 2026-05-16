/**
 * Site config — falsifiable tests
 */
import { describe, it, expect } from "vitest";
import { SITE_CONFIG } from "./config";

describe("SITE_CONFIG", () => {
  it("exports a non-empty object", () => {
    expect(SITE_CONFIG).toBeDefined();
    expect(typeof SITE_CONFIG).toBe("object");
  });

  it("has a calendly property that is a non-empty string", () => {
    expect(SITE_CONFIG).toHaveProperty("calendly");
    expect(typeof SITE_CONFIG.calendly).toBe("string");
    expect(SITE_CONFIG.calendly.length).toBeGreaterThan(0);
  });

  it("has a workerUrl property that is a valid HTTPS URL", () => {
    expect(SITE_CONFIG).toHaveProperty("workerUrl");
    expect(typeof SITE_CONFIG.workerUrl).toBe("string");
    expect(SITE_CONFIG.workerUrl).toMatch(/^https:\/\//);
  });

  it("workerUrl contains workers.dev domain", () => {
    expect(SITE_CONFIG.workerUrl).toContain("workers.dev");
  });

  it("calendly does not contain spaces", () => {
    expect(SITE_CONFIG.calendly).not.toContain(" ");
  });
});
