import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bciyxglcayukxudeuaru.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjaXl4Z2xjYXl1a3h1ZGV1YXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNjUzNjQsImV4cCI6MjEwMjY0MTM2NH0.SAOm-4WBTKmwRp___dGLdVdlolyDhtdanqB3GfqB-5U';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runTest() {
  console.log('Testing connection to Supabase:', SUPABASE_URL);

  // Test 1: Gyms
  console.log('\n--- 1. Testing gyms table ---');
  const gymPayload = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Fit-Thetic Fitness Club',
    phone: '03216422429',
    email: 'dawood@gmail.com',
  };
  const { data: gymRes, error: gymErr } = await supabase.from('gyms').upsert(gymPayload, { onConflict: 'id' }).select();
  console.log('Gyms Error:', gymErr);
  console.log('Gyms Data:', gymRes);

  // Test 2: Members
  console.log('\n--- 2. Testing members table ---');
  const memberPayload = {
    id: 'test-mem-001',
    gym_id: '00000000-0000-0000-0000-000000000001',
    member_code: 'FT-0001',
    full_name: 'Live Test Member',
    phone: '03001234567',
    status: 'active',
  };
  const { data: memRes, error: memErr } = await supabase.from('members').upsert(memberPayload, { onConflict: 'id' }).select();
  console.log('Members Error:', memErr);
  console.log('Members Data:', memRes);

  // Test 3: Membership Plans
  console.log('\n--- 3. Testing membership_plans table ---');
  const planPayload = {
    id: 'plan-001',
    gym_id: '00000000-0000-0000-0000-000000000001',
    name: 'Monthly Plan',
    price: 3000,
    duration_days: 30,
    is_active: true,
  };
  const { data: planRes, error: planErr } = await supabase.from('membership_plans').upsert(planPayload, { onConflict: 'id' }).select();
  console.log('Plans Error:', planErr);
  console.log('Plans Data:', planRes);

  // Test 4: Memberships
  console.log('\n--- 4. Testing memberships table ---');
  const msPayload = {
    id: 'ms-001',
    gym_id: '00000000-0000-0000-0000-000000000001',
    member_id: 'test-mem-001',
    plan_id: 'plan-001',
    start_date: '2026-08-23',
    end_date: '2026-09-23',
    amount: 3000,
    status: 'active',
  };
  const { data: msRes, error: msErr } = await supabase.from('memberships').upsert(msPayload, { onConflict: 'id' }).select();
  console.log('Memberships Error:', msErr);
  console.log('Memberships Data:', msRes);

  // Test 5: Payments
  console.log('\n--- 5. Testing payments table ---');
  const payPayload = {
    id: 'pay-001',
    gym_id: '00000000-0000-0000-0000-000000000001',
    member_id: 'test-mem-001',
    membership_id: 'ms-001',
    amount: 3000,
    payment_method: 'cash',
    payment_date: '2026-08-23',
  };
  const { data: payRes, error: payErr } = await supabase.from('payments').upsert(payPayload, { onConflict: 'id' }).select();
  console.log('Payments Error:', payErr);
  console.log('Payments Data:', payRes);
}

runTest();
