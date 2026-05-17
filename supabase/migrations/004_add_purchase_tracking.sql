-- Add purchase tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_purchased BOOLEAN DEFAULT false;
