-- ==============================================================================
-- FIT-THETIC GYM MANAGEMENT SYSTEM (PHASE 1)
-- PostgreSQL / Supabase Schema Definition
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Admin profiles)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT UNIQUE NOT NULL,
    gender TEXT,
    date_of_birth DATE,
    address TEXT,
    emergency_contact TEXT,
    notes TEXT,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. MEMBERSHIP PLANS TABLE
CREATE TABLE IF NOT EXISTS membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price NUMERIC NOT NULL CHECK (price >= 0),
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. MEMBERS TABLE
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_code TEXT UNIQUE NOT NULL, -- e.g., GYM-0001
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    date_of_birth DATE,
    address TEXT,
    emergency_contact TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. MEMBERSHIPS TABLE (Historical & Current periods)
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES membership_plans(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PAYMENTS TABLE (All confirmed admin-recorded payments)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'easypaisa', 'jazzcash', 'bank_transfer', 'other')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID UNIQUE NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    receipt_number TEXT UNIQUE NOT NULL, -- e.g., GYM-2026-00001
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. WHATSAPP REMINDERS TABLE
CREATE TABLE IF NOT EXISTS whatsapp_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('7_days_before', '3_days_before', '1_day_before', 'on_expiry', 'custom')),
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'demo_generated' CHECK (status IN ('demo_generated', 'sent', 'failed')),
    direct_opened BOOLEAN NOT NULL DEFAULT FALSE,
    message_text TEXT NOT NULL,
    whatsapp_message_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. GYM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS gym_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_name TEXT NOT NULL DEFAULT 'Fit-thetic Gym',
    logo_url TEXT,
    phone TEXT NOT NULL DEFAULT '+92 300 1234567',
    email TEXT DEFAULT 'contact@fit-thetic.com',
    address TEXT NOT NULL DEFAULT 'Main Boulevard, Gulberg III, Lahore, Pakistan',
    currency TEXT NOT NULL DEFAULT 'Rs.',
    receipt_footer TEXT NOT NULL DEFAULT 'Thank you for choosing Fit-thetic Gym! Registration & fees are non-refundable.',
    whatsapp_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_settings JSONB NOT NULL DEFAULT '{"d7": true, "d3": true, "d1": true, "d0": true}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_members_member_code ON members(member_code);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_memberships_member_id ON memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_memberships_end_date ON memberships(end_date);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_membership_id ON payments(membership_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_reminders_member_membership ON whatsapp_reminders(member_id, membership_id, reminder_type);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (Admin Only)
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users with admin role full access
CREATE POLICY "Admins full access to profiles" ON profiles
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins full access to membership_plans" ON membership_plans
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins full access to members" ON members
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins full access to memberships" ON memberships
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins full access to payments" ON payments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins full access to receipts" ON receipts
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins full access to whatsapp_reminders" ON whatsapp_reminders
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins full access to gym_settings" ON gym_settings
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
