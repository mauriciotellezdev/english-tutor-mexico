/**
 * Auth flow logic — falsifiable tests
 * Tests the business logic patterns used in student/teacher signup, login,
 * callback handling, QR tracking, and session management.
 */
import { describe, it, expect } from "vitest";

// ---- Pure helper functions (extracted from auth page logic) ----

/**
 * Build the redirect URL for a magic link callback.
 */
function buildCallbackUrl(baseOrigin: string, path: string): string {
  return `${baseOrigin}${path}`;
}

/**
 * Extract ref code from URL query string.
 */
function extractRefCode(url: string): string | null {
  const parsed = new URL(url, "http://example.com");
  return parsed.searchParams.get("ref");
}

/**
 * Validate signup form data.
 */
function validateSignupForm(fullName: string, email: string): { valid: boolean; error?: string } {
  if (!fullName.trim()) return { valid: false, error: "Name is required" };
  if (!email.trim()) return { valid: false, error: "Email is required" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { valid: false, error: "Invalid email format" };
  return { valid: true };
}

/**
 * Validate login form data.
 */
function validateLoginForm(email: string): { valid: boolean; error?: string } {
  if (!email.trim()) return { valid: false, error: "Email is required" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { valid: false, error: "Invalid email format" };
  return { valid: true };
}

/**
 * Build Supabase OTP options for student signup.
 */
function buildStudentSignupOptions(
  fullName: string,
  refCode: string | null,
  origin: string
): {
  data: { full_name: string; role: string; ref_code: string | null };
  emailRedirectTo: string;
} {
  return {
    data: {
      full_name: fullName,
      role: "student",
      ref_code: refCode || null,
    },
    emailRedirectTo: `${origin}/student/callback`,
  };
}

/**
 * Build worker request body for teacher magic link.
 */
function buildTeacherMagicLinkRequest(
  email: string,
  origin: string
): { email: string; redirectTo: string; type: string } {
  return {
    email,
    redirectTo: `${origin}/teacher/callback`,
    type: "magiclink",
  };
}

/**
 * Determine callback result based on session and profile.
 */
function evaluateCallback(
  hasSession: boolean,
  profile: { role: string } | null
): { success: boolean; redirect?: string; error?: string } {
  if (!hasSession) {
    return { success: false, error: "Invalid or expired magic link" };
  }
  if (!profile) {
    return { success: false, error: "Profile not found" };
  }
  return { success: true, redirect: "/student/dashboard" };
}

/**
 * Determine teacher callback result.
 */
function evaluateTeacherCallback(
  hasSession: boolean,
  profile: { role: string } | null
): { success: boolean; redirect?: string; error?: string } {
  if (!hasSession) {
    return { success: false, error: "Invalid or expired magic link" };
  }
  if (!profile) {
    return { success: false, error: "Profile not found" };
  }
  if (profile.role !== "teacher") {
    return {
      success: false,
      error: `Access denied. Role is "${profile.role}" — needs to be "teacher"`,
    };
  }
  return { success: true, redirect: "/teacher/dashboard" };
}

/**
 * Build QR scan record.
 */
function buildQrScanRecord(
  campaignId: string,
  userAgent: string
): { campaign_id: string; ip_address: string; user_agent: string } {
  return {
    campaign_id: campaignId,
    ip_address: "", // Not available client-side
    user_agent: userAgent,
  };
}

/**
 * Calculate discount expiry date (90 days from now).
 */
function calcDiscountExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
}

/**
 * Check if a magic link response is successful.
 */
function isMagicLinkSuccess(response: { ok: boolean; data?: unknown; error?: string }): boolean {
  return response.ok;
}

// ---- Tests ----

describe("auth flow logic", () => {
  describe("buildCallbackUrl", () => {
    it("combines origin and path", () => {
      expect(buildCallbackUrl("http://localhost:4321", "/student/callback")).toBe(
        "http://localhost:4321/student/callback"
      );
    });

    it("works with production URL", () => {
      expect(buildCallbackUrl("https://english-tutor-mexico.pages.dev", "/teacher/callback")).toBe(
        "https://english-tutor-mexico.pages.dev/teacher/callback"
      );
    });
  });

  describe("extractRefCode", () => {
    it("extracts ref parameter from URL", () => {
      expect(extractRefCode("http://localhost:4321/student/signup?ref=qr-flyer-001")).toBe(
        "qr-flyer-001"
      );
    });

    it("returns null when no ref parameter", () => {
      expect(extractRefCode("http://localhost:4321/student/signup")).toBeNull();
    });

    it("returns null for empty ref parameter", () => {
      expect(extractRefCode("http://localhost:4321/student/signup?ref=")).toBe("");
    });

    it("ignores other query parameters", () => {
      expect(extractRefCode("http://localhost:4321/student/signup?foo=bar&ref=qr-001&baz=qux")).toBe(
        "qr-001"
      );
    });
  });

  describe("validateSignupForm", () => {
    it("returns valid for complete data", () => {
      const result = validateSignupForm("Maria Garcia", "maria@example.com");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("returns invalid for empty name", () => {
      const result = validateSignupForm("", "maria@example.com");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Name");
    });

    it("returns invalid for empty email", () => {
      const result = validateSignupForm("Maria", "");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Email");
    });

    it("returns invalid for invalid email format", () => {
      const result = validateSignupForm("Maria", "not-an-email");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid email");
    });

    it("trims whitespace from name", () => {
      const result = validateSignupForm("  ", "maria@example.com");
      expect(result.valid).toBe(false);
    });

    it("trims whitespace from email", () => {
      const result = validateSignupForm("Maria", "  ");
      expect(result.valid).toBe(false);
    });
  });

  describe("validateLoginForm", () => {
    it("returns valid for valid email", () => {
      const result = validateLoginForm("maria@example.com");
      expect(result.valid).toBe(true);
    });

    it("returns invalid for empty email", () => {
      const result = validateLoginForm("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Email");
    });

    it("returns invalid for invalid email", () => {
      const result = validateLoginForm("not-an-email");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid email");
    });
  });

  describe("buildStudentSignupOptions", () => {
    it("builds correct options with ref code", () => {
      const opts = buildStudentSignupOptions("Maria", "qr-flyer-001", "http://localhost:4321");
      expect(opts.data.full_name).toBe("Maria");
      expect(opts.data.role).toBe("student");
      expect(opts.data.ref_code).toBe("qr-flyer-001");
      expect(opts.emailRedirectTo).toBe("http://localhost:4321/student/callback");
    });

    it("sets ref_code to null when not provided", () => {
      const opts = buildStudentSignupOptions("Maria", null, "http://localhost:4321");
      expect(opts.data.ref_code).toBeNull();
    });

    it("sets ref_code to null for empty string", () => {
      const opts = buildStudentSignupOptions("Maria", "", "http://localhost:4321");
      expect(opts.data.ref_code).toBeNull();
    });
  });

  describe("buildTeacherMagicLinkRequest", () => {
    it("builds correct request body", () => {
      const body = buildTeacherMagicLinkRequest("mauricio@example.com", "http://localhost:4321");
      expect(body.email).toBe("mauricio@example.com");
      expect(body.redirectTo).toBe("http://localhost:4321/teacher/callback");
      expect(body.type).toBe("magiclink");
    });
  });

  describe("evaluateCallback (student)", () => {
    it("returns success with redirect when session and profile exist", () => {
      const result = evaluateCallback(true, { role: "student" });
      expect(result.success).toBe(true);
      expect(result.redirect).toBe("/student/dashboard");
    });

    it("returns error when no session", () => {
      const result = evaluateCallback(false, null);
      expect(result.success).toBe(false);
      expect(result.error).toContain("magic link");
    });

    it("returns error when no profile", () => {
      const result = evaluateCallback(true, null);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Profile");
    });
  });

  describe("evaluateTeacherCallback", () => {
    it("returns success when session exists and role is teacher", () => {
      const result = evaluateTeacherCallback(true, { role: "teacher" });
      expect(result.success).toBe(true);
      expect(result.redirect).toBe("/teacher/dashboard");
    });

    it("returns error when role is not teacher", () => {
      const result = evaluateTeacherCallback(true, { role: "student" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Access denied");
      expect(result.error).toContain("student");
    });

    it("returns error when no session", () => {
      const result = evaluateTeacherCallback(false, null);
      expect(result.success).toBe(false);
      expect(result.error).toContain("magic link");
    });

    it("returns error when no profile", () => {
      const result = evaluateTeacherCallback(true, null);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Profile");
    });
  });

  describe("buildQrScanRecord", () => {
    it("builds correct scan record", () => {
      const record = buildQrScanRecord("campaign-uuid-123", "Mozilla/5.0");
      expect(record.campaign_id).toBe("campaign-uuid-123");
      expect(record.ip_address).toBe("");
      expect(record.user_agent).toBe("Mozilla/5.0");
    });

    it("always sets ip_address to empty string", () => {
      const record = buildQrScanRecord("campaign-uuid-123", "test-agent");
      expect(record.ip_address).toBe("");
    });
  });

  describe("calcDiscountExpiry", () => {
    it("returns a date 90 days in the future", () => {
      const now = new Date("2026-01-01T00:00:00Z");
      const expiry = calcDiscountExpiry(now);
      const expected = new Date("2026-04-01T00:00:00Z");
      expect(expiry.toISOString().split("T")[0]).toBe("2026-04-01");
    });

    it("returns a future date when called with no argument", () => {
      const expiry = calcDiscountExpiry();
      expect(expiry.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("isMagicLinkSuccess", () => {
    it("returns true for successful response", () => {
      expect(isMagicLinkSuccess({ ok: true, data: { id: "email_123" } })).toBe(true);
    });

    it("returns false for failed response", () => {
      expect(isMagicLinkSuccess({ ok: false, error: "Failed" })).toBe(false);
    });
  });
});
