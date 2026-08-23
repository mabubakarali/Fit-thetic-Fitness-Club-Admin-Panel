-- ==============================================================================
-- FIT-THETIC GYM MANAGEMENT SYSTEM - MULTI-DEVICE CLOUD SCHEMA
-- ==============================================================================
-- Universal compatible schema for all sync operations and ID types
-- ==============================================================================

-- Drop old tables cleanly to ensure perfect compatibility
DROP TABLE IF EXISTS sync_operations CASCADE;
DROP TABLE IF EXISTS whatsapp_reminders CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS membership_plans CASCADE;
DROP TABLE IF EXISTS gym_settings CASCADE;
DROP TABLE IF EXISTS gym_users CASCADE;
DROP TABLE IF EXISTS gyms CASCADE;

-- 1. GYMS TABLE
CREATE TABLE gyms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT,
    phone TEXT NOT NULL DEFAULT '+92 300 1234567',
    email TEXT DEFAULT 'dawood@gmail.com',
    address TEXT NOT NULL DEFAULT 'Royal Avenue, Meherban Colony, Chak Shahzad, Isb',
    currency TEXT NOT NULL DEFAULT 'Rs.',
    receipt_footer TEXT NOT NULL DEFAULT 'Thank you for choosing Fit-Thetic Fitness Club! Registration & fees are non-refundable.',
    whatsapp_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_settings JSONB NOT NULL DEFAULT '{"d7": true, "d3": true, "d1": true, "d0": true}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. GYM_USERS TABLE
CREATE TABLE gym_users (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    gym_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner',
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. MEMBERSHIP PLANS TABLE
CREATE TABLE membership_plans (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    duration_days INTEGER NOT NULL DEFAULT 30,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT,
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT
);

-- 4. MEMBERS TABLE
CREATE TABLE members (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL,
    member_code TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    gender TEXT DEFAULT 'male',
    date_of_birth DATE,
    address TEXT,
    emergency_contact TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT,
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT
);

-- 5. MEMBERSHIPS TABLE
CREATE TABLE memberships (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    plan_id TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT,
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT
);

-- 6. PAYMENTS TABLE
CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    membership_id TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT,
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT
);

-- 7. RECEIPTS TABLE
CREATE TABLE receipts (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL,
    payment_id TEXT NOT NULL,
    receipt_number TEXT NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT
);

-- 8. WHATSAPP REMINDERS TABLE
CREATE TABLE whatsapp_reminders (
    id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    membership_id TEXT,
    reminder_type TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'sent',
    direct_opened BOOLEAN NOT NULL DEFAULT FALSE,
    message_text TEXT NOT NULL,
    whatsapp_message_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 9. SYNC OPERATIONS TABLE
CREATE TABLE sync_operations (
    operation_id TEXT PRIMARY KEY,
    gym_id TEXT NOT NULL,
    device_id TEXT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - PERMIT ALL SYNC OPERATIONS
-- ==============================================================================
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public gyms access" ON gyms FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public gym_users access" ON gym_users FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public plans access" ON membership_plans FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public members access" ON members FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public memberships access" ON memberships FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public payments access" ON payments FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public receipts access" ON receipts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public reminders access" ON whatsapp_reminders FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public sync_ops access" ON sync_operations FOR ALL TO public USING (true) WITH CHECK (true);

-- Insert Fit-Thetic Fitness Club record
INSERT INTO gyms (id, name, phone, email, address, currency, receipt_footer)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Fit-Thetic Fitness Club',
    '03216422429',
    'dawood@gmail.com',
    'Royal Avenue, Meherban Colony, Chak Shahzad, Isb',
    'Rs.',
    'Thank you for choosing Fit-Thetic Fitness Club! Registration & fees are non-refundable.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone;
