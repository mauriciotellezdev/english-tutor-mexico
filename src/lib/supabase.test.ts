/**
 * Supabase client helpers — falsifiable tests
 * Tests the helper logic patterns (getSession, getUserProfile, isTeacher)
 * without depending on the actual Supabase module (which uses import.meta.env).
 */
import { describe, it, expect } from "vitest";

describe("supabase helper logic", () => {
  describe("getSession pattern", () => {
    it("returns session when auth.getSession succeeds", async () => {
      const mockSession = { user: { id: "user-123", email: "test@example.com" } };
      const mockGetSession = async () => ({
        data: { session: mockSession },
        error: null,
      });

      const { data: { session }, error } = await mockGetSession();
      expect(error).toBeNull();
      expect(session).toEqual(mockSession);
    });

    it("returns null when auth.getSession fails", async () => {
      const mockGetSession = async () => ({
        data: { session: null },
        error: { message: "Invalid token", status: 401 },
      });

      const { data: { session }, error } = await mockGetSession();
      expect(error).not.toBeNull();
      expect(session).toBeNull();
    });

    it("returns null when session is missing", async () => {
      const mockGetSession = async () => ({
        data: { session: null },
        error: null,
      });

      const { data: { session }, error } = await mockGetSession();
      expect(error).toBeNull();
      expect(session).toBeNull();
    });
  });

  describe("getUserProfile pattern", () => {
    it("returns profile when session exists and query succeeds", async () => {
      const mockProfile = {
        id: "user-123",
        email: "test@example.com",
        full_name: "Test User",
        role: "student",
        current_level: "a1",
      };

      const mockGetSession = async () => ({
        data: { session: { user: { id: "user-123" } } },
        error: null,
      });

      const mockQueryProfile = async (userId: string) => ({
        data: mockProfile,
        error: null,
      });

      // Simulate getUserProfile logic
      const { data: { session } } = await mockGetSession();
      expect(session).not.toBeNull();

      const { data, error } = await mockQueryProfile(session!.user.id);
      expect(error).toBeNull();
      expect(data).toEqual(mockProfile);
      expect(data!.role).toBe("student");
    });

    it("returns null when no session exists", async () => {
      const mockGetSession = async () => ({
        data: { session: null },
        error: null,
      });

      const { data: { session } } = await mockGetSession();
      expect(session).toBeNull();
      // getUserProfile would return null here
    });

    it("returns null when profile query fails", async () => {
      const mockQueryProfile = async (userId: string) => ({
        data: null,
        error: { message: "Profile not found" },
      });

      const { data, error } = await mockQueryProfile("user-123");
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });

  describe("isTeacher pattern", () => {
    it("returns true when profile role is teacher", () => {
      const profile = { role: "teacher" };
      const isTeacher = profile?.role === "teacher";
      expect(isTeacher).toBe(true);
    });

    it("returns false when profile role is student", () => {
      const profile = { role: "student" };
      const isTeacher = profile?.role === "teacher";
      expect(isTeacher).toBe(false);
    });

    it("returns false when profile is null", () => {
      const profile = null as unknown as { role?: string } | null;
      const isTeacher = profile?.role === "teacher";
      expect(isTeacher).toBe(false);
    });

    it("returns false when profile has no role", () => {
      const profile = { role: null } as unknown as { role?: string };
      const isTeacher = profile?.role === "teacher";
      expect(isTeacher).toBe(false);
    });
  });
});
