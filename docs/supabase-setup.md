# Supabase Setup Guide — English Tutor Mexico

> Follow these steps to set up Supabase for the QR code referral system, student auth, and teacher dashboard.

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **New Project**
3. Choose a project name (e.g., `english-tutor-mexico`)
4. Set a strong database password (save it somewhere safe)
5. Choose a region close to Mexico (US East or US West)
6. Wait for the project to be created (~2 minutes)

---

## 2. Run the SQL Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open the file `supabase/migrations/001_initial_schema.sql` from this project
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run** (or Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned" — this is expected

This creates all tables, indexes, RLS policies, and seed data.

---

## 3. Create the Teacher Account

1. Go to **Authentication** → **Users** in the Supabase dashboard
2. Click **Add User** → **Create new user**
3. Enter your email (the one you use for the tutoring business)
4. Set a temporary password (you'll use magic links, so this doesn't matter much)
5. Click **Create User**
6. After the user is created, go to **SQL Editor** and run:

```sql
UPDATE profiles SET role = 'teacher'
WHERE email = 'YOUR_EMAIL@example.com';
```

Replace `YOUR_EMAIL@example.com` with your actual email.

---

## 4. Configure Auth Settings

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to:
   - Development: `http://localhost:4321`
   - Production: `https://english-tutor-mexico.pages.dev`
3. Add to **Redirect URLs**:
   - `http://localhost:4321/student/callback`
   - `http://localhost:4321/teacher/callback`
   - `https://english-tutor-mexico.pages.dev/student/callback`
   - `https://english-tutor-mexico.pages.dev/teacher/callback`

---

## 5. Configure Email Delivery (Optional but Recommended)

Supabase's free tier sends only 3 emails/hour. For production, connect an email provider:

### Option A: Resend (Recommended — Free: 3K emails/month)

1. Go to [resend.com](https://resend.com) and sign up
2. Verify your domain (or use the default resend.com domain for testing)
3. Create an API key
4. In Supabase, go to **Project Settings** → **Auth** → **Email Templates**
5. Scroll to **SMTP Settings** and configure:
   - SMTP Host: `smtp.resend.com`
   - SMTP Port: `587`
   - SMTP User: `resend`
   - SMTP Password: (your Resend API key)
   - Sender Email: (your verified email)

### Option B: Use Supabase Default (Free: 3 emails/hour)

Good for testing. Not suitable for production with many students.

---

## 6. Set Environment Variables

### Local Development

Create a `.env.local` file in the project root:

```env
PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Get these values from:
- **Project Settings** → **API**
- **Project URL** → `PUBLIC_SUPABASE_URL`
- **anon public** key → `PUBLIC_SUPABASE_ANON_KEY`

### Cloudflare Pages Deployment

1. Go to your Cloudflare Pages project settings
2. Go to **Settings** → **Environment Variables**
3. Add both variables:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`

---

## 7. Test the Setup

### Test Student Signup

1. Run the dev server: `bun run dev`
2. Go to `http://localhost:4321/student/signup`
3. Enter your name and email
4. Click "Create Account"
5. Check your email for the magic link
6. Click the link — you should be redirected to `/student/dashboard`

### Test QR Code Signup

1. Go to `http://localhost:4321/student/signup?ref=qr-flyer-001`
2. The ref code should be auto-filled
3. Complete signup
4. After logging in, check your dashboard — you should see the discount banner

### Test Teacher Dashboard

1. Go to `http://localhost:4321/teacher/login`
2. Enter your teacher email
3. Click the magic link in your email
4. You should see the Tutor OS dashboard with:
   - Student count
   - QR campaigns (2 seeded by default)
   - Ability to create new QR campaigns
   - Ability to download QR codes

---

## 8. Generate QR Codes for Printing

1. Go to the Teacher Dashboard → QR Codes tab
2. Click **+ New Campaign**
3. Fill in:
   - Campaign Name (e.g., "Flyer — Language School CDMX")
   - Ref Code (e.g., "qr-flyer-002")
   - Discount % (default: 50)
   - Discount Sessions (default: 5)
4. Click **Create Campaign**
5. Click **Download QR** to get the SVG file
6. Print the QR code on flyers, business cards, or stickers

### QR Code URL Format

Each QR code links to:
```
https://english-tutor-mexico.pages.dev/signup?ref=QR_CODE_HERE
```

When someone scans it, they land on the signup page with the ref code pre-filled.

---

## 9. Database Tables Overview

| Table | Purpose |
|---|---|
| `profiles` | User profiles (extends Supabase auth) |
| `qr_campaigns` | QR code campaigns with discount settings |
| `qr_scans` | Every scan of a QR code |
| `student_discounts` | Active discounts per student |
| `sessions` | Lesson sessions (scheduled, completed, etc.) |
| `homework` | Homework assignments per student |

---

## 10. Troubleshooting

### Magic link email not arriving
- Check spam folder
- Verify SMTP settings in Supabase (if using custom provider)
- Wait up to 5 minutes (email delivery can be slow on free tier)

### "Invalid or expired magic link"
- Magic links expire after 1 hour
- Request a new one from the login page

### QR discount not applying
- Check that the campaign code exists and is active in `qr_campaigns`
- Check that the student doesn't already have an active discount
- Check the browser console for errors

### Teacher dashboard shows "Access denied"
- Verify your profile has `role = 'teacher'` in the database
- Run: `SELECT role FROM profiles WHERE email = 'your@email.com';`

### QR code download fails
- Make sure the `qrcode` npm package is installed: `bun install`
- Check browser console for errors

---

## 11. Next Steps

After the basic setup is working:

1. **Customize email templates** in Supabase (Auth → Email Templates)
2. **Add more QR campaigns** for different locations/events
3. **Set up Google Analytics** to track overall site traffic
4. **Create printed materials** with QR codes
5. **Add session booking integration** (Calendly or custom)
6. **Build out the student portal** with more features

---

*Questions? Check the `docs/qr-auth-tracking-plan.md` for the full architecture plan.*
