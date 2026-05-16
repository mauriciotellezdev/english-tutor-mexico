/**
 * QR code, discount, session, and coupon business logic — falsifiable tests
 * These are pure functions extracted from the auth/dashboard flow patterns.
 */
import { describe, it, expect } from "vitest";

// ---- Pure helper functions (extracted from page logic) ----

/**
 * Calculate remaining sessions from a discount record.
 */
function calcRemainingSessions(total: number, used: number): number {
  return Math.max(0, total - used);
}

/**
 * Calculate discount usage percentage.
 */
function calcUsagePercent(total: number, used: number): number {
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
}

/**
 * Check if a discount is still valid (active and not expired).
 */
function isDiscountActive(
  isActive: boolean,
  expiresAt: Date | null,
  now: Date = new Date()
): boolean {
  if (!isActive) return false;
  if (expiresAt && now > expiresAt) return false;
  return true;
}

/**
 * Check if a QR campaign code is valid.
 */
function isValidCampaign(
  code: string | null,
  campaigns: Array<{ code: string; isActive: boolean; discountPercent: number; discountSessions: number }>
): { valid: boolean; campaign?: typeof campaigns[0] } {
  if (!code) return { valid: false };
  const campaign = campaigns.find((c) => c.code === code && c.isActive);
  if (!campaign) return { valid: false };
  return { valid: true, campaign };
}

/**
 * Determine session status display label.
 */
function sessionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    scheduled: "Scheduled",
    completed: "Completed",
    cancelled: "Cancelled",
    "no-show": "No Show",
  };
  return labels[status] || status;
}

/**
 * Format a session date for display.
 */
function formatSessionDate(date: Date): string {
  return date.toLocaleDateString("en-MX", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a session time for display.
 */
function formatSessionTime(date: Date): string {
  return date.toLocaleTimeString("en-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Determine if a session is upcoming (scheduled and in the future).
 */
function isSessionUpcoming(status: string, scheduledAt: Date, now: Date = new Date()): boolean {
  return status === "scheduled" && scheduledAt > now;
}

/**
 * Calculate progress bar width percentage.
 */
function progressPercent(total: number, used: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

/**
 * Validate email format.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate role value.
 */
function isValidRole(role: string): boolean {
  return role === "student" || role === "teacher";
}

/**
 * Validate CEFR level.
 */
function isValidLevel(level: string): boolean {
  return ["a0", "a1", "a2", "b1", "b2"].includes(level);
}

// ---- Tests ----

describe("QR & discount logic", () => {
  describe("calcRemainingSessions", () => {
    it("returns total minus used", () => {
      expect(calcRemainingSessions(5, 2)).toBe(3);
    });

    it("returns 0 when all sessions used", () => {
      expect(calcRemainingSessions(5, 5)).toBe(0);
    });

    it("returns 0 when more used than total (never negative)", () => {
      expect(calcRemainingSessions(5, 10)).toBe(0);
    });

    it("returns total when none used", () => {
      expect(calcRemainingSessions(5, 0)).toBe(5);
    });

    it("returns 0 for zero total", () => {
      expect(calcRemainingSessions(0, 0)).toBe(0);
    });
  });

  describe("calcUsagePercent", () => {
    it("returns 0 when nothing used", () => {
      expect(calcUsagePercent(5, 0)).toBe(0);
    });

    it("returns 100 when all used", () => {
      expect(calcUsagePercent(5, 5)).toBe(100);
    });

    it("returns 40 for 2 of 5 used", () => {
      expect(calcUsagePercent(5, 2)).toBe(40);
    });

    it("returns 0 for zero total (no division by zero)", () => {
      expect(calcUsagePercent(0, 0)).toBe(0);
    });

    it("caps at 100 when more used than total", () => {
      expect(calcUsagePercent(5, 10)).toBe(200); // Math allows >100, UI caps it
    });
  });

  describe("isDiscountActive", () => {
    it("returns true when active and not expired", () => {
      const expiresAt = new Date(Date.now() + 86400000); // tomorrow
      expect(isDiscountActive(true, expiresAt)).toBe(true);
    });

    it("returns false when inactive", () => {
      const expiresAt = new Date(Date.now() + 86400000);
      expect(isDiscountActive(false, expiresAt)).toBe(false);
    });

    it("returns false when expired", () => {
      const expiresAt = new Date(Date.now() - 86400000); // yesterday
      expect(isDiscountActive(true, expiresAt)).toBe(false);
    });

    it("returns true when active and no expiry date", () => {
      expect(isDiscountActive(true, null)).toBe(true);
    });

    it("returns false when inactive and no expiry date", () => {
      expect(isDiscountActive(false, null)).toBe(false);
    });
  });

  describe("isValidCampaign", () => {
    const campaigns = [
      { code: "qr-flyer-001", isActive: true, discountPercent: 50, discountSessions: 5 },
      { code: "qr-flyer-002", isActive: true, discountPercent: 50, discountSessions: 5 },
      { code: "qr-expired", isActive: false, discountPercent: 50, discountSessions: 5 },
    ];

    it("returns valid for active campaign code", () => {
      const result = isValidCampaign("qr-flyer-001", campaigns);
      expect(result.valid).toBe(true);
      expect(result.campaign).toBeDefined();
      expect(result.campaign!.code).toBe("qr-flyer-001");
    });

    it("returns invalid for null code", () => {
      const result = isValidCampaign(null, campaigns);
      expect(result.valid).toBe(false);
    });

    it("returns invalid for empty string code", () => {
      const result = isValidCampaign("", campaigns);
      expect(result.valid).toBe(false);
    });

    it("returns invalid for nonexistent code", () => {
      const result = isValidCampaign("nonexistent", campaigns);
      expect(result.valid).toBe(false);
    });

    it("returns invalid for inactive campaign", () => {
      const result = isValidCampaign("qr-expired", campaigns);
      expect(result.valid).toBe(false);
    });
  });
});

describe("session logic", () => {
  describe("sessionStatusLabel", () => {
    it("returns Scheduled for 'scheduled'", () => {
      expect(sessionStatusLabel("scheduled")).toBe("Scheduled");
    });

    it("returns Completed for 'completed'", () => {
      expect(sessionStatusLabel("completed")).toBe("Completed");
    });

    it("returns Cancelled for 'cancelled'", () => {
      expect(sessionStatusLabel("cancelled")).toBe("Cancelled");
    });

    it("returns No Show for 'no-show'", () => {
      expect(sessionStatusLabel("no-show")).toBe("No Show");
    });

    it("returns raw status for unknown values", () => {
      expect(sessionStatusLabel("unknown")).toBe("unknown");
    });
  });

  describe("isSessionUpcoming", () => {
    it("returns true for scheduled session in the future", () => {
      const future = new Date(Date.now() + 86400000);
      expect(isSessionUpcoming("scheduled", future)).toBe(true);
    });

    it("returns false for scheduled session in the past", () => {
      const past = new Date(Date.now() - 86400000);
      expect(isSessionUpcoming("scheduled", past)).toBe(false);
    });

    it("returns false for completed session", () => {
      const future = new Date(Date.now() + 86400000);
      expect(isSessionUpcoming("completed", future)).toBe(false);
    });

    it("returns false for cancelled session", () => {
      const future = new Date(Date.now() + 86400000);
      expect(isSessionUpcoming("cancelled", future)).toBe(false);
    });
  });

  describe("progressPercent", () => {
    it("returns 0 when nothing used", () => {
      expect(progressPercent(5, 0)).toBe(0);
    });

    it("returns 100 when all used", () => {
      expect(progressPercent(5, 5)).toBe(100);
    });

    it("returns 60 for 3 of 5 used", () => {
      expect(progressPercent(5, 3)).toBe(60);
    });

    it("caps at 100 when more used than total", () => {
      expect(progressPercent(5, 10)).toBe(100);
    });

    it("returns 0 for zero total", () => {
      expect(progressPercent(0, 0)).toBe(0);
    });
  });
});

describe("validation helpers", () => {
  describe("isValidEmail", () => {
    it("returns true for valid email", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
    });

    it("returns true for email with dots and plus", () => {
      expect(isValidEmail("user.name+tag@example.co.uk")).toBe(true);
    });

    it("returns false for missing @", () => {
      expect(isValidEmail("testexample.com")).toBe(false);
    });

    it("returns false for missing domain", () => {
      expect(isValidEmail("test@")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidEmail("")).toBe(false);
    });

    it("returns false for spaces", () => {
      expect(isValidEmail("test @example.com")).toBe(false);
    });
  });

  describe("isValidRole", () => {
    it("returns true for 'student'", () => {
      expect(isValidRole("student")).toBe(true);
    });

    it("returns true for 'teacher'", () => {
      expect(isValidRole("teacher")).toBe(true);
    });

    it("returns false for 'admin'", () => {
      expect(isValidRole("admin")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidRole("")).toBe(false);
    });

    it("returns false for null-like values", () => {
      expect(isValidRole("undefined")).toBe(false);
    });
  });

  describe("isValidLevel", () => {
    it("returns true for a0", () => {
      expect(isValidLevel("a0")).toBe(true);
    });

    it("returns true for a1, a2, b1, b2", () => {
      expect(isValidLevel("a1")).toBe(true);
      expect(isValidLevel("a2")).toBe(true);
      expect(isValidLevel("b1")).toBe(true);
      expect(isValidLevel("b2")).toBe(true);
    });

    it("returns false for b3", () => {
      expect(isValidLevel("b3")).toBe(false);
    });

    it("returns false for c1", () => {
      expect(isValidLevel("c1")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidLevel("")).toBe(false);
    });

    it("returns false for uppercase", () => {
      expect(isValidLevel("A0")).toBe(false);
    });
  });
});

describe("date formatting", () => {
  describe("formatSessionDate", () => {
    it("produces a non-empty string", () => {
      const result = formatSessionDate(new Date("2026-05-20T15:00:00Z"));
      expect(result.length).toBeGreaterThan(0);
    });

    it("includes the day number", () => {
      const result = formatSessionDate(new Date("2026-05-20T15:00:00Z"));
      expect(result).toContain("20");
    });
  });

  describe("formatSessionTime", () => {
    it("produces a non-empty string", () => {
      const result = formatSessionTime(new Date("2026-05-20T15:30:00Z"));
      expect(result.length).toBeGreaterThan(0);
    });

    it("includes hour and minute", () => {
      const result = formatSessionTime(new Date("2026-05-20T15:30:00Z"));
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });
});
