-- ============================================================
-- English Tutor Mexico — Supabase Schema
-- Run this SQL in your Supabase project's SQL editor
-- ============================================================

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  current_level TEXT CHECK (current_level IN ('a0', 'a1', 'a2', 'b1', 'b2')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. QR CAMPAIGNS
-- ============================================================
CREATE TABLE qr_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  discount_percent INTEGER DEFAULT 50,
  discount_sessions INTEGER DEFAULT 5,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. QR SCANS (track every scan)
-- ============================================================
CREATE TABLE qr_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES qr_campaigns(id),
  ip_address TEXT,
  user_agent TEXT,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. STUDENT DISCOUNTS
-- ============================================================
CREATE TABLE student_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  campaign_id UUID REFERENCES qr_campaigns(id),
  discount_percent INTEGER NOT NULL,
  total_sessions INTEGER NOT NULL,
  used_sessions INTEGER DEFAULT 0,
  remaining_sessions INTEGER GENERATED ALWAYS AS (total_sessions - used_sessions) STORED,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- ============================================================
-- 5. SESSIONS (lessons)
-- ============================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no-show')),
  notes TEXT,
  topics_covered TEXT[],
  corrections_made TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. HOMEWORK
-- ============================================================
CREATE TABLE homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  session_id UUID REFERENCES sessions(id),
  description TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- 7. INDEXES
-- ============================================================
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_qr_campaigns_code ON qr_campaigns(code);
CREATE INDEX idx_qr_campaigns_active ON qr_campaigns(is_active);
CREATE INDEX idx_qr_scans_campaign ON qr_scans(campaign_id);
CREATE INDEX idx_qr_scans_date ON qr_scans(scanned_at);
CREATE INDEX idx_student_discounts_student ON student_discounts(student_id);
CREATE INDEX idx_student_discounts_active ON student_discounts(is_active);
CREATE INDEX idx_sessions_student ON sessions(student_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_scheduled ON sessions(scheduled_at);
CREATE INDEX idx_homework_student ON homework(student_id);
CREATE INDEX idx_homework_completed ON homework(is_completed);

-- ============================================================
-- 8. FUNCTION: Create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 9. FUNCTION: Apply discount on first signup with QR code
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_qr_discount(
  p_student_id UUID,
  p_campaign_code TEXT
)
RETURNS TABLE (
  discount_id UUID,
  discount_percent INTEGER,
  total_sessions INTEGER
) AS $$
DECLARE
  v_campaign qr_campaigns%ROWTYPE;
  v_discount student_discounts%ROWTYPE;
BEGIN
  -- Get the campaign
  SELECT * INTO v_campaign
  FROM qr_campaigns
  WHERE code = p_campaign_code AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive QR campaign code: %', p_campaign_code;
  END IF;

  -- Check if student already has an active discount
  SELECT * INTO v_discount
  FROM student_discounts
  WHERE student_id = p_student_id AND is_active = TRUE;

  IF FOUND THEN
    RAISE EXCEPTION 'Student already has an active discount';
  END IF;

  -- Create the discount
  INSERT INTO student_discounts (
    student_id,
    campaign_id,
    discount_percent,
    total_sessions,
    expires_at
  ) VALUES (
    p_student_id,
    v_campaign.id,
    v_campaign.discount_percent,
    v_campaign.discount_sessions,
    NOW() + INTERVAL '90 days'
  ) RETURNING * INTO v_discount;

  RETURN QUERY SELECT v_discount.id, v_discount.discount_percent, v_discount.total_sessions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES ----
-- Students can see their own profile
CREATE POLICY "Students see own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Students can update their own profile
CREATE POLICY "Students update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Teacher can see all profiles
CREATE POLICY "Teacher sees all profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- ---- QR CAMPAIGNS ----
-- Teacher can manage campaigns
CREATE POLICY "Teacher manages campaigns"
  ON qr_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Public can read active campaigns (for signup validation)
CREATE POLICY "Public reads active campaigns"
  ON qr_campaigns FOR SELECT
  USING (is_active = TRUE);

-- ---- QR SCANS ----
-- Teacher can see all scans
CREATE POLICY "Teacher sees all scans"
  ON qr_scans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Anyone can insert scans (public endpoint)
CREATE POLICY "Anyone can insert scans"
  ON qr_scans FOR INSERT
  WITH CHECK (TRUE);

-- ---- STUDENT DISCOUNTS ----
-- Students can see their own discounts
CREATE POLICY "Students see own discounts"
  ON student_discounts FOR SELECT
  USING (student_id = auth.uid());

-- Teacher can see all discounts
CREATE POLICY "Teacher sees all discounts"
  ON student_discounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- ---- SESSIONS ----
-- Students can see their own sessions
CREATE POLICY "Students see own sessions"
  ON sessions FOR SELECT
  USING (student_id = auth.uid());

-- Teacher can manage all sessions
CREATE POLICY "Teacher manages all sessions"
  ON sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- ---- HOMEWORK ----
-- Students can see their own homework
CREATE POLICY "Students see own homework"
  ON homework FOR SELECT
  USING (student_id = auth.uid());

-- Students can mark homework complete
CREATE POLICY "Students update own homework"
  ON homework FOR UPDATE
  USING (student_id = auth.uid());

-- Teacher can manage all homework
CREATE POLICY "Teacher manages all homework"
  ON homework FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- ============================================================
-- 11. SEED DATA — Create the teacher account placeholder
-- ============================================================
-- NOTE: You must create the teacher user via Supabase Auth first.
-- After creating the user, update their profile role:
--
-- UPDATE profiles SET role = 'teacher'
-- WHERE email = 'your-email@example.com';

-- Seed a default QR campaign
INSERT INTO qr_campaigns (code, name, discount_percent, discount_sessions, description)
VALUES (
  'qr-flyer-001',
  'Flyer — Language School CDMX',
  50,
  5,
  '50% off first 5 lessons — flyer distributed at language schools in CDMX'
) ON CONFLICT (code) DO NOTHING;

INSERT INTO qr_campaigns (code, name, discount_percent, discount_sessions, description)
VALUES (
  'qr-flyer-002',
  'Flyer — Conversation Exchange Event',
  50,
  5,
  '50% off first 5 lessons — flyer distributed at language exchange events'
) ON CONFLICT (code) DO NOTHING;
