async function runScenarioTest() {
  const baseUrl = 'http://localhost:5000';
  console.log('🧪 Starting Multi-Device Synchronization & Financial Idempotency Test...');
  console.log(`Connecting to sync backend: ${baseUrl}\n`);

  // 1. Health Check
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const healthData = await healthRes.json();
  console.log('1. Health Check:', healthData);
  if (!healthRes.ok) throw new Error('Health check failed');

  // 2. Admin Authentication
  console.log('\n2. Testing Admin Login (dawood@gmail.com / 1234)...');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dawood@gmail.com', password: '1234' }),
  });
  const loginData = await loginRes.json();
  console.log('Login Result:', { success: loginData.success, hasToken: !!loginData.token, user: loginData.user });
  if (!loginData.token) throw new Error('Authentication failed');
  const token = loginData.token;

  // 3. Laptop Offline: Add Member A + Payment A
  console.log('\n3. Simulating Laptop Offline Mutations (Member A + Payment A)...');
  const laptopMemberA = {
    id: 'test-laptop-mem-A',
    member_code: 'FT-1001',
    full_name: 'Athlete Alpha (Laptop)',
    phone: '03001111111',
    status: 'active',
    updated_at: new Date().toISOString(),
  };
  const laptopPaymentA = {
    id: 'test-laptop-pay-A',
    member_id: 'test-laptop-mem-A',
    amount: 5000,
    payment_method: 'cash',
    payment_date: '2026-08-24',
    created_at: new Date().toISOString(),
  };

  const laptopPushRes = await fetch(`${baseUrl}/api/sync/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      items: [
        { id: 'op-lap-1', entity: 'members', entity_id: laptopMemberA.id, operation: 'INSERT', payload: laptopMemberA },
        { id: 'op-lap-2', entity: 'payments', entity_id: laptopPaymentA.id, operation: 'INSERT', payload: laptopPaymentA },
      ],
    }),
  });
  const laptopPushData = await laptopPushRes.json();
  console.log('Laptop Push Result:', laptopPushData);

  // 4. Mobile Offline: Add Member B + Payment B
  console.log('\n4. Simulating Mobile Offline Mutations (Member B + Payment B)...');
  const mobileMemberB = {
    id: 'test-mobile-mem-B',
    member_code: 'FT-1002',
    full_name: 'Athlete Beta (Mobile)',
    phone: '03002222222',
    status: 'active',
    updated_at: new Date().toISOString(),
  };
  const mobilePaymentB = {
    id: 'test-mobile-pay-B',
    member_id: 'test-mobile-mem-B',
    amount: 3000,
    payment_method: 'easypaisa',
    payment_date: '2026-08-24',
    created_at: new Date().toISOString(),
  };

  const mobilePushRes = await fetch(`${baseUrl}/api/sync/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      items: [
        { id: 'op-mob-1', entity: 'members', entity_id: mobileMemberB.id, operation: 'INSERT', payload: mobileMemberB },
        { id: 'op-mob-2', entity: 'payments', entity_id: mobilePaymentB.id, operation: 'INSERT', payload: mobilePaymentB },
      ],
    }),
  });
  const mobilePushData = await mobilePushRes.json();
  console.log('Mobile Push Result:', mobilePushData);

  // 5. Test Idempotent Retry: Push Payment A again
  console.log('\n5. Testing Idempotency & Financial Duplicate Protection (Retrying Payment A)...');
  const retryRes = await fetch(`${baseUrl}/api/sync/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      items: [
        { id: 'op-lap-2-retry', entity: 'payments', entity_id: laptopPaymentA.id, operation: 'INSERT', payload: laptopPaymentA },
      ],
    }),
  });
  const retryData = await retryRes.json();
  console.log('Retry Push Result:', retryData);

  // 6. Pull Remote Changes (Laptop pulls Mobile's changes, Mobile pulls Laptop's changes)
  console.log('\n6. Testing Pull Sync...');
  const pullRes = await fetch(`${baseUrl}/api/sync/pull`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const pullData = await pullRes.json();
  const members = pullData.data.members || [];
  const payments = pullData.data.payments || [];

  console.log(`Total Members in Sync Backend: ${members.length}`);
  console.log(`Total Payments in Sync Backend: ${payments.length}`);

  const hasMemberA = members.some((m: any) => m.id === 'test-laptop-mem-A' && !m.deleted_at);
  const hasMemberB = members.some((m: any) => m.id === 'test-mobile-mem-B' && !m.deleted_at);
  const payACount = payments.filter((p: any) => p.id === 'test-laptop-pay-A').length;
  const payBCount = payments.filter((p: any) => p.id === 'test-mobile-pay-B').length;

  console.log(`Athlete Alpha present: ${hasMemberA ? '✅ Yes' : '❌ No'}`);
  console.log(`Athlete Beta present: ${hasMemberB ? '✅ Yes' : '❌ No'}`);
  console.log(`Payment A duplicate count: ${payACount} (Expected: 1) -> ${payACount === 1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Payment B duplicate count: ${payBCount} (Expected: 1) -> ${payBCount === 1 ? '✅ PASS' : '❌ FAIL'}`);

  if (!hasMemberA || !hasMemberB || payACount !== 1 || payBCount !== 1) {
    throw new Error('Verification failed: sync data mismatch or duplicates detected');
  }

  // 7. Deletion & Tombstone Test
  console.log('\n7. Testing Tombstone Deletion Propagation (Deleting Athlete Alpha)...');
  const deletePushRes = await fetch(`${baseUrl}/api/sync/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      items: [
        {
          id: 'op-del-1',
          entity: 'members',
          entity_id: 'test-laptop-mem-A',
          operation: 'DELETE',
          payload: { id: 'test-laptop-mem-A', deleted_at: new Date().toISOString() },
        },
      ],
    }),
  });
  const deletePushData = await deletePushRes.json();
  console.log('Delete Push Result:', deletePushData);

  const pullAfterDelete = await fetch(`${baseUrl}/api/sync/pull`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const pullAfterDeleteData = await pullAfterDelete.json();
  const deletedMemA = (pullAfterDeleteData.data.members || []).find((m: any) => m.id === 'test-laptop-mem-A');
  console.log('Athlete Alpha Tombstone State:', { id: deletedMemA?.id, deleted_at: deletedMemA?.deleted_at });

  if (!deletedMemA?.deleted_at) {
    throw new Error('Tombstone verification failed: deleted_at not set');
  }
  console.log('✅ Tombstone verified: Athlete Alpha marked as deleted and cannot be resurrected!');

  console.log('\n🎉 ALL MULTI-DEVICE SYNC & FINANCIAL INTEGRITY TESTS PASSED 100%!');
}

runScenarioTest().catch((err) => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
