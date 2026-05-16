/**
 * Resend Email Utility
 *
 * Used for sending emails directly (session reminders, homework notifications, etc.)
 * Magic link emails are handled automatically by Supabase via SMTP settings.
 *
 * Usage (server-side only — Cloudflare Worker or API route):
 *
 *   import { sendEmail } from '@/lib/email';
 *   await sendEmail({ to: 'student@email.com', subject: '...', html: '...' });
 */

import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY || import.meta.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn('[Resend] Missing RESEND_API_KEY. Emails will not be sent.');
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
  if (!resend) {
    console.error('[Resend] Not configured. Set RESEND_API_KEY.');
    return { error: 'Resend not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: from || 'English Immersion <onboarding@resend.dev>',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[Resend] Send error:', error);
      return { error };
    }

    console.log('[Resend] Email sent:', data?.id);
    return { data };
  } catch (err) {
    console.error('[Resend] Unexpected error:', err);
    return { error: err };
  }
}

// ---- Email Templates ----

export function sessionReminderEmail(studentName: string, date: string, time: string, link: string) {
  return {
    subject: '📅 Your English session is coming up',
    html: `
      <h2>Hi ${studentName}!</h2>
      <p>Your English session is scheduled for:</p>
      <p><strong>${date} at ${time}</strong></p>
      <p><a href="${link}">Join session →</a></p>
      <p>See you there!<br>— Mauricio</p>
    `,
  };
}

export function homeworkEmail(studentName: string, homework: string) {
  return {
    subject: '📝 New homework assignment',
    html: `
      <h2>Hi ${studentName}!</h2>
      <p>Here's your homework for this week:</p>
      <p><strong>${homework}</strong></p>
      <p>Complete it before our next session.<br>— Mauricio</p>
    `,
  };
}

export function welcomeEmail(studentName: string) {
  return {
    subject: '🎉 Welcome to English Immersion!',
    html: `
      <h2>Welcome, ${studentName}!</h2>
      <p>You're now part of the English Immersion program.</p>
      <p>Here's what to expect:</p>
      <ul>
        <li>Conversation-first sessions — no textbooks</li>
        <li>AI-assisted when you get stuck</li>
        <li>Real-world topics that matter to you</li>
      </ul>
      <p><a href="https://english-tutor-mexico.pages.dev/student/dashboard">Go to your dashboard →</a></p>
      <p>See you in your first session!<br>— Mauricio</p>
    `,
  };
}
