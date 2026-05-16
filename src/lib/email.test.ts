/**
 * Email template generators — falsifiable tests
 * These are pure functions, so they're easy to test thoroughly.
 */
import { describe, it, expect } from "vitest";
import {
  sessionReminderEmail,
  homeworkEmail,
  welcomeEmail,
} from "./email";

describe("email templates", () => {
  describe("sessionReminderEmail", () => {
    it("returns an object with subject and html", () => {
      const result = sessionReminderEmail("Maria", "Monday", "3:00 PM", "https://meet.example.com");
      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
    });

    it("includes the student name in the HTML", () => {
      const result = sessionReminderEmail("Maria", "Monday", "3:00 PM", "https://meet.example.com");
      expect(result.html).toContain("Maria");
    });

    it("includes the date and time in the HTML", () => {
      const result = sessionReminderEmail("Maria", "Monday", "3:00 PM", "https://meet.example.com");
      expect(result.html).toContain("Monday");
      expect(result.html).toContain("3:00 PM");
    });

    it("includes the meeting link in the HTML", () => {
      const result = sessionReminderEmail("Maria", "Monday", "3:00 PM", "https://meet.example.com");
      expect(result.html).toContain("https://meet.example.com");
    });

    it("subject contains calendar emoji", () => {
      const result = sessionReminderEmail("Maria", "Monday", "3:00 PM", "https://meet.example.com");
      expect(result.subject).toContain("📅");
    });

    it("subject mentions session is coming up", () => {
      const result = sessionReminderEmail("Maria", "Monday", "3:00 PM", "https://meet.example.com");
      expect(result.subject.toLowerCase()).toContain("session");
      expect(result.subject.toLowerCase()).toContain("coming up");
    });

    it("different student names produce different HTML", () => {
      const r1 = sessionReminderEmail("Maria", "Monday", "3:00 PM", "https://meet.example.com");
      const r2 = sessionReminderEmail("Carlos", "Monday", "3:00 PM", "https://meet.example.com");
      expect(r1.html).not.toBe(r2.html);
    });

    it("different times produce different HTML", () => {
      const r1 = sessionReminderEmail("Maria", "Monday", "3:00 PM", "https://meet.example.com");
      const r2 = sessionReminderEmail("Maria", "Monday", "5:00 PM", "https://meet.example.com");
      expect(r1.html).not.toBe(r2.html);
    });
  });

  describe("homeworkEmail", () => {
    it("returns an object with subject and html", () => {
      const result = homeworkEmail("Maria", "Watch a YouTube video and summarize it");
      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
    });

    it("includes the student name in the HTML", () => {
      const result = homeworkEmail("Maria", "Watch a YouTube video");
      expect(result.html).toContain("Maria");
    });

    it("includes the homework description in the HTML", () => {
      const result = homeworkEmail("Maria", "Watch a YouTube video and summarize it");
      expect(result.html).toContain("Watch a YouTube video and summarize it");
    });

    it("subject contains memo emoji", () => {
      const result = homeworkEmail("Maria", "Watch a YouTube video");
      expect(result.subject).toContain("📝");
    });

    it("subject mentions homework assignment", () => {
      const result = homeworkEmail("Maria", "Watch a YouTube video");
      expect(result.subject.toLowerCase()).toContain("homework");
    });

    it("different homework produces different HTML", () => {
      const r1 = homeworkEmail("Maria", "Watch a YouTube video");
      const r2 = homeworkEmail("Maria", "Record a voice memo");
      expect(r1.html).not.toBe(r2.html);
    });
  });

  describe("welcomeEmail", () => {
    it("returns an object with subject and html", () => {
      const result = welcomeEmail("Maria");
      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
    });

    it("includes the student name in the HTML", () => {
      const result = welcomeEmail("Maria");
      expect(result.html).toContain("Maria");
    });

    it("subject contains party emoji", () => {
      const result = welcomeEmail("Maria");
      expect(result.subject).toContain("🎉");
    });

    it("subject mentions welcome", () => {
      const result = welcomeEmail("Maria");
      expect(result.subject.toLowerCase()).toContain("welcome");
    });

    it("mentions conversation-first sessions", () => {
      const result = welcomeEmail("Maria");
      expect(result.html).toContain("Conversation-first");
    });

    it("mentions AI-assisted sessions", () => {
      const result = welcomeEmail("Maria");
      expect(result.html).toContain("AI-assisted");
    });

    it("includes dashboard link", () => {
      const result = welcomeEmail("Maria");
      expect(result.html).toContain("/student/dashboard");
    });

    it("different student names produce different HTML", () => {
      const r1 = welcomeEmail("Maria");
      const r2 = welcomeEmail("Carlos");
      expect(r1.html).not.toBe(r2.html);
    });
  });
});
