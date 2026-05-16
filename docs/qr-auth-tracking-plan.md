# QR Code Referral System, Auth & Student Tracking — Architecture Plan

> **Project:** English Tutor Mexico — QR Code Discount + Student Portal
> **Last Updated:** May 2026
> **Status:** Planning / Research

---

## Table of Contents

1. [Overview](#1-overview)
2. [QR Code System](#2-qr-code-system)
3. [Database Selection](#3-database-selection)
4. [Authentication System](#4-authentication-system)
5. [Database Schema](#5-database-schema)
6. [Student Portal Features](#6-student-portal-features)
7. [Teacher Dashboard Features](#7-teacher-dashboard-features)
8. [QR Discount Flow](#8-qr-discount-flow)
9. [Implementation Phases](#9-implementation-phases)
10. [Cost Breakdown](#10-cost-breakdown)
11. [Security Considerations](#11-security-considerations)
12. [Alternative Approaches](#12-alternative-approaches)

---

## 1. Overview

### The Problem

Mauricio goes to language schools, meetups, and events in person to recruit students. He needs:
- A way to offer a **50% discount on first 5 lessons** to people he meets
- A way to **track who used the QR code** and how many discounted lessons they've used
- A way for students to **sign up, log in, and see their session count**
- A way for him (teacher) to **log in and manage students, sessions, and discounts**

### The Solution

A QR code that links to a special signup URL. When someone scans it and registers:
1. They get tagged with the QR campaign
2. Their account gets a 50% discount credit for 5 lessons
3. They can log in via email magic link to see their dashboard
4. Mauricio can log in to a teacher dashboard to manage everything

---

## 2. QR Code System

### Approach: Self-Hosted QR Generation (Free)

**Do NOT use a paid QR code service.** You're a software engineer — generate your own QR codes and track scans through your own system.

### How It Works

```
QR Code contains URL:
https://english-tutor-mexico.pages.dev/signup?ref=qr-flyer-001

When scanned → User lands on signup page with ?ref=qr-flyer-001
→ Signup form captures the ref code
→ Ref code is stored with the student record
→ Discount is automatically applied
```

### QR Code Generation Options

| Option | Cost | Pros | Cons |
|---|---|---|---|
| **Self-generated (recommended)** | Free | Full control, trackable, no limits | Requires dev work |
| **Hovercode** | Free tier | Easy, tracks scans | Free tier limits, third-party dependency |
| **MetricQR** | Free | Unlimited free QR codes with analytics | Third-party, less control |
| **QRelix** | Free | Enterprise features free | Third-party |
| **Bitly** | Free tier | Well-known, reliable | Free tier limits, branded links |

### Recommendation: Self-Generate + Track Internally

Since you're already deploying on Cloudflare Pages with a Worker, you can:

1. **Generate QR codes programmatically** using a library like `qrcode` (npm)
2. **Each QR code has a unique ref code** (e.g., `qr-flyer-001`, `qr-school-cdmx-001`)
3. **Track scans server-side** — when someone visits `/signup?ref=xxx`, log the scan
4. **Create a teacher page** to generate new QR codes and view scan stats

### QR Code Design

- Include your logo in the center
- Use brand colors (indigo/cyan from the site)
- Add a short URL below the QR code for people who can't scan
- Print on flyers, business cards, stickers

### QR Code Tracking

Each QR code should track:
- Total scans (page visits with that ref code)
- Signups from that code
- Active students from that code
- Revenue generated from that code

---

## 3. Database Selection

### Options Compared

| Platform | Free Tier | Pros | Cons | Best For |
|---|---|---|---|---|
| **Supabase** | 500MB DB, 50K MAU, 1GB storage | PostgreSQL, built-in auth with magic links, RLS, real-time, excellent DX | Projects pause after 1 week inactivity on free tier | **Recommended** |
| **Cloudflare D1** | 5GB storage, 100K reads/day, 100K writes/day | Native to Cloudflare, SQL, edge-located, no pausing | No built-in auth, newer ecosystem, fewer tools | If you want to stay in CF ecosystem |
| **Cloudflare KV** | 100K reads/day, 1K writes/day | Ultra-fast, edge-located | Not relational, limited querying, not ideal for complex data | Caching, not primary DB |
| **Firebase** | 1GB storage, 50K reads/day | Real-time, Google ecosystem, mature | NoSQL (bad for relational data), vendor lock-in, pricing unpredictable at scale | Mobile apps, real-time |
| **PocketBase** | Self-hosted | Simple, single binary, built-in auth, easy | You manage the server, no free hosted tier | Self-hosted projects |
| **Turso (libSQL)** | 9GB storage, 500M row reads/month | SQLite-based, edge-located, generous free tier | No built-in auth, newer ecosystem | Edge-first apps |

### Recommendation: **Supabase**

**Why Supabase wins for this project:**

1. **Built-in magic link auth** — exactly what you need for email-link login, zero extra work
2. **PostgreSQL** — relational data (students → sessions → discounts) is natural with SQL
3. **Row Level Security (RLS)** — students can only see their own data, teacher can see everything
4. **Free tier is generous** — 500MB is more than enough for this use case
5. **Excellent developer experience** — you're a software engineer, Supabase's DX is top-tier
6. **Dashboard** — you get a built-in admin UI for viewing/editing data
7. **Email delivery** — Supabase handles magic link emails out of the box (3/hour on free, or connect Resend/SendGrid for unlimited)

### Alternative: Cloudflare D1 + Workers

If you want to stay entirely within the Cloudflare ecosystem (since you're already on Pages + Workers):

- **D1** for the database (SQLite at the edge)
- **Workers** for API routes
- **Custom magic link implementation** using JWT tokens sent via Resend (free tier: 3K emails/month)
- More work to set up auth, but zero external dependencies

**Verdict:** Supabase is faster to implement. D1 is better long-term if you want to minimize dependencies.

---

## 4. Authentication System

### Student Auth: Magic Links (Passwordless)

Students enter their email → receive a magic link → click to log in.

**Why magic links:**
- No passwords to remember or reset
- Works perfectly on mobile (tap the link in email)
- Lower friction = more signups
- More secure (no password leaks)
- Mexicans prefer WhatsApp/email over password management

**Implementation with Supabase:**
```javascript
// Send magic link
await supabase.auth.signInWithOtp({
  email: 'student@email.com',
  options: {
    emailRedirectTo: 'https://english-tutor-mexico.pages.dev/student/dashboard'
  }
})
```

**Email delivery:**
- Supabase free tier: 3 emails/hour (enough for initial use)
- Production: Connect **Resend** (free: 3K emails/month) or **SendGrid** (free: 100 emails/day)

### Teacher Auth: Magic Links or Password

For Mauricio (single admin user), either approach works:
- Magic link (same as students) — simplest
- Password + 2FA — more secure for admin access

**Recommendation:** Magic link for now. You can add 2FA later if needed.

### Session Management

- Supabase handles session tokens automatically
- Sessions persist in localStorage (student stays logged in)
- Teacher dashboard checks for admin role via RLS

---

## 5. Database Schema

### Tables

```sql
-- Users table (Supabase auth.users handles auth, this is the profile)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  current_level TEXT, -- 'a0', 'a1', 'a2', 'b1', 'b2'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR Campaigns
CREATE TABLE qr_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- e.g., 'qr-flyer-001'
  name TEXT NOT NULL, -- e.g., 'Flyer - Language School CDMX'
  discount_percent INTEGER DEFAULT 50,
  discount_sessions INTEGER DEFAULT 5,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR Scans (track every scan)
CREATE TABLE qr_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES qr_campaigns(id),
  ip_address TEXT,
  user_agent TEXT,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student Discount Tracking
CREATE TABLE student_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  campaign_id UUID REFERENCES qr_campaigns(id),
  discount_percent INTEGER NOT NULL,
  total_sessions INTEGER NOT NULL, -- e.g., 5
  used_sessions INTEGER DEFAULT 0,
  remaining_sessions INTEGER GENERATED ALWAYS AS (total_sessions - used_sessions) STORED,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- optional expiration
);

-- Sessions (each lesson)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no-show')),
  notes TEXT,
  topics_covered TEXT[], -- array of topics
  corrections_made TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments (simple tracking)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  session_id UUID REFERENCES sessions(id),
  amount INTEGER NOT NULL, -- in MXN cents
  discount_applied INTEGER DEFAULT 0, -- discount amount in MXN cents
  original_amount INTEGER NOT NULL,
  payment_method TEXT, -- 'stripe', 'spei', 'oxxo', 'paypal', 'cash'
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Homework assignments
CREATE TABLE homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  session_id UUID REFERENCES sessions(id),
  description TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT FALSE
);
```

### Row Level Security (RLS) Policies

```sql
-- Students can only see their own data
CREATE POLICY "Students see own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Students can update their own profile
CREATE POLICY "Students update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Teacher can see everything
CREATE POLICY "Teacher sees all profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Students see own sessions
CREATE POLICY "Students see own sessions"
  ON sessions FOR SELECT
  USING (student_id = auth.uid());

-- Teacher sees all sessions
CREATE POLICY "Teacher sees all sessions"
  ON sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Similar RLS for all other tables
```

---

## 6. Student Portal Features

### Routes

```
/student/signup          — Sign up page (with QR ref code capture)
/student/login           — Magic link login page
/student/dashboard       — Student dashboard (protected)
/student/sessions        — Session history
/student/homework        — Homework assignments
/student/level           — Current level info and progress
```

### Dashboard Content

- **Welcome message** with student name
- **Current level** (A0, A1, A2, B1, B2)
- **Sessions remaining** (total purchased + discount remaining)
- **Next scheduled session** (date, time, link)
- **Recent homework** assignments
- **Quick actions:**
  - Book a session (links to Calendly)
  - Message on WhatsApp
  - View level guide

### Discount Display

```
┌─────────────────────────────────┐
│  🎉 QR Code Discount Active     │
│  50% off for 5 sessions         │
│  ████████░░░░░░░░░░░░░░░ 2/5   │
│  3 discounted sessions remaining│
└─────────────────────────────────┘
```

---

## 7. Teacher Dashboard Features

### Routes

```
/teacher/login             — Teacher login (protected, not in nav)
/teacher/dashboard         — Overview
/teacher/students          — Student list
/teacher/students/[id]     — Student detail
/teacher/sessions          — Session calendar
/teacher/qr-codes          — QR code management
/teacher/analytics         — Revenue and growth stats
```

### Dashboard Content

- **Total active students**
- **Sessions this week**
- **Revenue this month**
- **QR code performance** (scans, conversions)
- **Upcoming sessions** list
- **Recent signups**

### Student Detail Page

- Student profile (name, email, phone, level)
- Session history (completed, cancelled, no-show)
- Discount status (remaining sessions)
- Homework completion rate
- Notes and progress tracking
- Quick actions: schedule session, send message, adjust level

### QR Code Management

- List all active QR campaigns
- Generate new QR codes (with unique ref codes)
- View scan stats per campaign
- View conversion rate (scans → signups)
- Download QR code images (PNG, SVG)
- Deactivate campaigns

---

## 8. QR Discount Flow

### Step-by-Step

```
1. Mauricio prints QR code on flyer/business card
   URL: english-tutor-mexico.pages.dev/signup?ref=qr-flyer-001

2. Person scans QR code with phone camera
   → Opens signup page with ref code pre-filled

3. Person enters email and name
   → System creates account
   → System logs the QR scan
   → System creates student_discount record (50% off, 5 sessions)
   → Magic link email is sent

4. Person clicks magic link in email
   → Logged into student dashboard
   → Sees their discount: "50% off for 5 sessions — 5 remaining"

5. Person books a session (via Calendly or direct booking)
   → Session is created in the database

6. Session is completed
   → Teacher marks it as completed in teacher dashboard
   → used_sessions increments by 1
   → If used_sessions < 5, discount still applies
   → If used_sessions >= 5, discount expires

7. After discount expires
   → Student pays full price
   → Can still use the platform to track sessions
```

### Discount Application Logic

```javascript
function getLessonPrice(student, basePrice = 400) {
  const discount = student.activeDiscount;
  if (!discount || discount.remaining_sessions <= 0) {
    return basePrice; // full price
  }
  return basePrice * (1 - discount.discount_percent / 100); // 50% off
}
```

---

## 9. Implementation Phases

### Phase 1: Database + Auth (Week 1)

- [ ] Set up Supabase project
- [ ] Create database tables (profiles, qr_campaigns, qr_scans, student_discounts, sessions)
- [ ] Set up RLS policies
- [ ] Create teacher profile (manual insert into DB)
- [ ] Implement magic link auth with Supabase
- [ ] Connect Resend for email delivery (free tier: 3K emails/month)
- [ ] Create `/student/signup` page
- [ ] Create `/student/login` page
- [ ] Create `/student/dashboard` page (basic)

### Phase 2: QR Code System (Week 2)

- [ ] Create `/teacher/qr-codes` page
- [ ] Implement QR code generation (using `qrcode` npm package)
- [ ] Create QR campaign management (create, activate, deactivate)
- [ ] Implement scan tracking (log visits to `/signup?ref=xxx`)
- [ ] Create QR code download (PNG, SVG)
- [ ] Test QR code scanning and signup flow

### Phase 3: Session Tracking (Week 3)

- [ ] Create `/teacher/sessions` page
- [ ] Implement session CRUD (create, read, update, delete)
- [ ] Create `/student/sessions` page
- [ ] Implement session status tracking (scheduled, completed, cancelled)
- [ ] Build discount tracking logic
- [ ] Create `/student/dashboard` with session count and discount display

### Phase 4: Student Portal Polish (Week 4)

- [ ] Homework tracking
- [ ] Level progress display
- [ ] WhatsApp integration in dashboard
- [ ] Session booking integration (Calendly or custom)
- [ ] Email notifications (session reminders, homework assignments)

### Phase 5: Teacher Dashboard Polish (Week 5)

- [ ] Analytics and revenue tracking
- [ ] Student search and filtering
- [ ] Bulk actions (schedule multiple sessions)
- [ ] Export data (CSV)
- [ ] QR code performance analytics

### Phase 6: Payment Integration (Future)

- [ ] Connect existing Stripe checkout
- [ ] Automatic discount application at checkout
- [ ] Payment tracking in database
- [ ] Receipt generation

---

## 10. Cost Breakdown

### Free Tier (Recommended Starting Point)

| Service | Plan | Cost | Limits |
|---|---|---|---|
| **Supabase** | Free | $0 | 500MB DB, 50K MAU, 1GB storage |
| **Resend** | Free | $0 | 3,000 emails/month |
| **Cloudflare Pages** | Free | $0 | 500 builds/month, unlimited bandwidth |
| **Cloudflare Workers** | Free | $0 | 100K requests/day |
| **QR Code Generation** | Self-hosted | $0 | Unlimited |
| **Total** | | **$0/month** | |

### When You Need to Upgrade

| Trigger | Upgrade | Cost |
|---|---|---|
| > 500MB database | Supabase Pro | $25/month |
| > 3K emails/month | Resend Pro | $20/month |
| > 50K monthly active users | Supabase Pro | $25/month |
| > 100K worker requests/day | Workers Paid | $5/month + usage |

**Realistic timeline:** You won't need to pay anything until you have 50+ active students.

---

## 11. Security Considerations

### QR Code Abuse Prevention

- **Rate limit** signup attempts from the same IP
- **Validate** ref codes against the database (reject invalid codes)
- **Limit** discount usage to one per email address
- **Set expiration** on discount campaigns (e.g., 90 days from creation)
- **Monitor** for suspicious patterns (many signups from same IP)

### Data Protection

- **RLS policies** ensure students can only see their own data
- **HTTPS only** (already enforced by Cloudflare Pages)
- **No sensitive data** in QR codes (only ref codes, no personal info)
- **GDPR compliance** — Mexico's Ley Federal de Protección de Datos requires:
  - Privacy notice
  - Consent for data collection
  - Right to access/delete data

### Teacher Access

- Teacher account should be created manually in the database (not via public signup)
- Consider adding a simple admin PIN or secondary verification for the teacher dashboard
- The `/teacher/*` routes should NOT be linked in the public navigation

---

## 12. Alternative Approaches

### Option A: Supabase (Recommended)

**Best for:** Fast implementation, built-in auth, excellent DX
**Cost:** Free until scale
**Timeline:** 4-5 weeks

### Option B: Cloudflare D1 + Workers + Resend

**Best for:** Staying in Cloudflare ecosystem, edge performance
**Cost:** Free
**Timeline:** 6-7 weeks (more custom auth work)
**Trade-off:** You build auth yourself, but zero external dependencies

### Option C: No-Code/Low-Code (Not Recommended)

Tools like Airtable + Softr + Zapier could work but:
- Less control
- Monthly costs add up
- Harder to customize
- Not ideal for a software engineer

### Option D: Existing Tutoring Platform

Platforms like TutorCruncher, Teachworks, or MyTutor:
- $50-200/month
- Pre-built features
- Less customization
- Overkill for a solo tutor

---

## Appendix: QR Code Generation Code Example

```javascript
// server-side QR code generation (Cloudflare Worker or Astro API route)
import QRCode from 'qrcode';

export async function generateQRCode(campaignCode) {
  const url = `https://english-tutor-mexico.pages.dev/signup?ref=${campaignCode}`;

  // Generate as PNG buffer
  const pngBuffer = await QRCode.toBuffer(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 300,
    color: {
      dark: '#6366f1', // brand indigo
      light: '#ffffff'
    }
  });

  // Generate as SVG
  const svgString = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    color: {
      dark: '#6366f1',
      light: '#ffffff'
    }
  });

  return { pngBuffer, svgString };
}
```

---

*This document is a living plan. Update it as implementation progresses and requirements evolve.*
