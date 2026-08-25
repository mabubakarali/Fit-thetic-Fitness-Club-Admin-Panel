import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  Member,
  MembershipPlan,
  Membership,
  Payment,
  Receipt,
  WhatsAppReminder,
  GymSettings,
  EnrichedMember,
  UnpaidMemberDetail,
  ExpiringMemberDetail,
  EnrichedPayment,
  EnrichedReceipt,
  SyncState,
  PaymentMethod,
  ReminderType,
} from '@/types/database';
import {
  getNonDeletedFromStore,
  getAllFromStore,
  putInStore,
  deleteFromStore,
  clearAllStores,
} from '@/lib/idb';
import { generateSeedData, SEED_GYM_SETTINGS, SEED_MEMBERSHIP_PLANS } from '@/lib/seedData';
import { generateNextMemberCode } from '@/lib/memberCode';
import { generateNextReceiptNumber } from '@/lib/receiptNumber';
import { enqueueSync, subscribeToSync, processSyncQueue } from '@/lib/syncEngine';
import { generateUUID } from '@/lib/uuid';
import { getDeviceId } from '@/lib/deviceId';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { format, isToday, isThisMonth, differenceInDays, addDays } from 'date-fns';

interface GymContextType {
  // Raw state
  members: Member[];
  plans: MembershipPlan[];
  memberships: Membership[];
  payments: Payment[];
  receipts: Receipt[];
  reminders: WhatsAppReminder[];
  settings: GymSettings;
  syncState: SyncState;
  isLoading: boolean;

  // Enriched views
  enrichedMembers: EnrichedMember[];
  unpaidMembers: UnpaidMemberDetail[];
  expiringMembers: ExpiringMemberDetail[];
  expiredMembers: EnrichedMember[];
  enrichedPayments: EnrichedPayment[];
  enrichedReceipts: EnrichedReceipt[];

  // Real-time KPI statistics
  stats: {
    totalActiveMembers: number;
    validActiveMembers: number;
    allRegisteredMembers: number;
    expiringIn7Days: number;
    expiredCount: number;
    unpaidCount: number;
    todayRevenue: number;
    thisMonthRevenue: number;
    totalRevenueAllTime: number;
  };

  // Actions / Mutations
  addMember: (
    memberData: Omit<Member, 'id' | 'member_code' | 'created_at' | 'updated_at'>,
    initialPlanId: string,
    customStartDate?: string,
    customEndDate?: string,
    initialPayment?: { amount: number; method: PaymentMethod; ref?: string; notes?: string }
  ) => Promise<{ member: Member; membership: Membership; receipt?: Receipt; enrichedReceipt?: EnrichedReceipt }>;

  updateMember: (id: string, updates: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  toggleMemberStatus: (id: string) => Promise<void>;

  renewMembership: (
    memberId: string,
    planId: string,
    startDate: string,
    customEndDate?: string,
    amountOverride?: number,
    immediatePayment?: { method: PaymentMethod; amount?: number; ref?: string; notes?: string }
  ) => Promise<{ membership: Membership; receipt?: Receipt; enrichedReceipt?: EnrichedReceipt }>;

  recordPayment: (
    memberId: string,
    membershipId: string,
    amount: number,
    method: PaymentMethod,
    paymentDate?: string,
    reference?: string,
    notes?: string
  ) => Promise<{ payment: Payment; receipt: Receipt; enrichedReceipt: EnrichedReceipt }>;

  addPlan: (plan: Omit<MembershipPlan, 'id' | 'created_at' | 'updated_at'>) => Promise<MembershipPlan>;
  updatePlan: (id: string, updates: Partial<MembershipPlan>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;

  getEnrichedReceipt: (receiptOrId: string | Receipt) => EnrichedReceipt | null;

  generateReminder: (
    memberId: string,
    membershipId: string,
    reminderType: ReminderType
  ) => Promise<{ reminder: WhatsAppReminder; alreadyExisted: boolean }>;

  getWhatsAppShareUrl: (
    memberId: string,
    membershipId?: string,
    reminderType?: ReminderType
  ) => string;

  importMembersBatch: (
    batchMembers: Member[],
    batchMemberships: Membership[]
  ) => Promise<void>;

  uploadLocalDataToCloud: (targetGymId?: string) => Promise<{
    success: boolean;
    membersUploaded: number;
    plansUploaded: number;
    paymentsUploaded: number;
    receiptsUploaded: number;
    error?: string;
  }>;

  updateSettings: (updates: Partial<GymSettings>) => Promise<void>;
  resetToDemoData: () => Promise<void>;
  forceSyncNow: () => Promise<{ success: boolean; pushed: number; pulled: number; errors: number; errorMessage?: string }>;
  exportFullDatabaseBackup: () => void;
  importFullDatabaseBackup: (jsonContent: string) => Promise<{ success: boolean; memberCount: number; paymentCount: number; receiptCount: number }>;
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export const GymProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeGymId, gym, authMode } = useAuth();

  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [reminders, setReminders] = useState<WhatsAppReminder[]>([]);
  const [settings, setSettings] = useState<GymSettings>(SEED_GYM_SETTINGS);
  const [syncState, setSyncState] = useState<SyncState>({
    mode: authMode,
    is_online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    is_syncing: false,
    last_synced_at: null,
    pending_count: 0,
    failed_count: 0,
    device_id: getDeviceId(),
    active_gym_id: activeGymId,
    active_gym_name: gym?.name,
    error: null,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ----------------------------------------------------
  // Initial IndexedDB Loading with Tombstone Filtering
  // ----------------------------------------------------
  const loadDataFromIDB = useCallback(async () => {
    setIsLoading(true);
    try {
      // Production Reset Trigger for clean initialization
      const isClean = localStorage.getItem('fit_thetic_production_clean_v1');
      if (!isClean) {
        await clearAllStores();
        const seeded = generateSeedData();
        await Promise.all([
          ...seeded.membershipPlans.map((p) => putInStore('membership_plans', p)),
          putInStore('gym_settings', seeded.gymSettings),
        ]);
        setMembers([]);
        setMemberships([]);
        setPayments([]);
        setReceipts([]);
        setReminders([]);
        setPlans(seeded.membershipPlans);
        setSettings(seeded.gymSettings);
        localStorage.setItem('fit_thetic_production_clean_v1', 'true');
        setIsLoading(false);
        return;
      }

      const [
        loadedMembers,
        loadedPlans,
        loadedMemberships,
        loadedPayments,
        loadedReceipts,
        loadedReminders,
        loadedSettings,
      ] = await Promise.all([
        getNonDeletedFromStore<Member>('members'),
        getNonDeletedFromStore<MembershipPlan>('membership_plans'),
        getNonDeletedFromStore<Membership>('memberships'),
        getNonDeletedFromStore<Payment>('payments'),
        getNonDeletedFromStore<Receipt>('receipts'),
        getAllFromStore<WhatsAppReminder>('whatsapp_reminders'),
        getAllFromStore<GymSettings>('gym_settings'),
      ]);

      if (loadedPlans.length === 0) {
        const seeded = generateSeedData();
        await Promise.all([
          ...seeded.membershipPlans.map((p) => putInStore('membership_plans', p)),
          putInStore('gym_settings', seeded.gymSettings),
        ]);

        setMembers([]);
        setPlans(seeded.membershipPlans);
        setMemberships([]);
        setPayments([]);
        setReceipts([]);
        setReminders([]);
        setSettings(seeded.gymSettings);
      } else {
        setMembers(loadedMembers);
        setPlans(loadedPlans.length > 0 ? loadedPlans : SEED_MEMBERSHIP_PLANS);
        setMemberships(loadedMemberships);
        setPayments(loadedPayments);
        setReceipts(loadedReceipts);
        setReminders(loadedReminders);

        const currentSettings = loadedSettings[0];
        if (!currentSettings) {
          const updatedSettings = { ...SEED_GYM_SETTINGS, id: 'sett-001', gym_id: activeGymId };
          await putInStore('gym_settings', updatedSettings);
          setSettings(updatedSettings);
        } else {
          setSettings(currentSettings);
        }
      }
    } catch (err) {
      console.error('Failed to load data from IndexedDB:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeGymId]);

  useEffect(() => {
    loadDataFromIDB();
    const unsubSync = subscribeToSync(setSyncState);

    const triggerSyncAndReload = async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const res = await processSyncQueue();
        if (res.pulled > 0 || res.pushed > 0) {
          await loadDataFromIDB();
        }
      }
    };

    // Continuous real-time background sync interval (every 2.5 seconds)
    const interval = setInterval(triggerSyncAndReload, 2500);

    const handleFocusOrOnline = () => {
      triggerSyncAndReload();
    };

    window.addEventListener('focus', handleFocusOrOnline);
    window.addEventListener('online', handleFocusOrOnline);
    document.addEventListener('visibilitychange', handleFocusOrOnline);

    return () => {
      unsubSync();
      clearInterval(interval);
      window.removeEventListener('focus', handleFocusOrOnline);
      window.removeEventListener('online', handleFocusOrOnline);
      document.removeEventListener('visibilitychange', handleFocusOrOnline);
    };
  }, [loadDataFromIDB]);

  // ----------------------------------------------------
  // Reactive Enriched Computations
  // ----------------------------------------------------

  const enrichedMembers: EnrichedMember[] = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayDate = new Date(todayStr);

    return members.map((member) => {
      const memberMemberships = memberships
        .filter((ms) => ms.member_id === member.id && !ms.deleted_at)
        .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

      const currentMembership = memberMemberships[0];
      const currentPlan = currentMembership
        ? plans.find((p) => p.id === currentMembership.plan_id)
        : undefined;

      const memberPayments = payments.filter(
        (p) => p.member_id === member.id && !p.deleted_at
      );
      const memberReceipts = receipts.filter((r) =>
        memberPayments.some((p) => p.id === r.payment_id) && !r.deleted_at
      );

      let timing_status: EnrichedMember['timing_status'] = 'active';
      let days_remaining = 0;
      let total_paid_for_current_membership = 0;
      let balance_due = 0;
      let is_unpaid = false;

      if (currentMembership) {
        const endDate = new Date(currentMembership.end_date);
        days_remaining = differenceInDays(endDate, todayDate);

        if (days_remaining < 0) {
          timing_status = 'expired';
        } else if (days_remaining <= 7) {
          timing_status = 'expiring_soon';
        } else {
          timing_status = 'active';
        }

        const paymentsForCurrent = payments.filter(
          (p) => p.membership_id === currentMembership.id && !p.deleted_at
        );
        total_paid_for_current_membership = paymentsForCurrent.reduce((acc, p) => acc + p.amount, 0);
        balance_due = Math.max(0, currentMembership.amount - total_paid_for_current_membership);
        is_unpaid = balance_due > 0;
      } else {
        timing_status = 'expired';
        is_unpaid = true;
      }

      const lastPayment = memberPayments.sort(
        (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      )[0];

      return {
        ...member,
        current_membership: currentMembership,
        current_plan: currentPlan,
        timing_status,
        days_remaining,
        total_paid_for_current_membership,
        balance_due,
        is_unpaid,
        last_payment_date: lastPayment ? lastPayment.payment_date : undefined,
        all_memberships: memberMemberships,
        all_payments: memberPayments,
        all_receipts: memberReceipts,
      };
    });
  }, [members, memberships, plans, payments, receipts]);

  const unpaidMembers: UnpaidMemberDetail[] = useMemo(() => {
    const today = new Date();
    const details: UnpaidMemberDetail[] = [];

    enrichedMembers.forEach((em) => {
      if (em.is_unpaid && em.current_membership && em.current_plan) {
        const dueDate = em.current_membership.start_date;
        const daysOverdue = Math.max(0, differenceInDays(today, new Date(dueDate)));

        details.push({
          member: em,
          membership: em.current_membership,
          plan: em.current_plan,
          amount_due: em.balance_due,
          due_date: dueDate,
          days_overdue: daysOverdue,
          total_paid: em.total_paid_for_current_membership,
          last_payment_date: em.last_payment_date,
        });
      }
    });

    return details.sort((a, b) => b.days_overdue - a.days_overdue);
  }, [enrichedMembers]);

  const expiringMembers: ExpiringMemberDetail[] = useMemo(() => {
    const details: ExpiringMemberDetail[] = [];

    enrichedMembers.forEach((em) => {
      if (
        em.current_membership &&
        em.current_plan &&
        em.days_remaining >= 0 &&
        em.days_remaining <= 7
      ) {
        const memberReminders = reminders.filter(
          (r) => r.membership_id === em.current_membership!.id
        );

        details.push({
          member: em,
          membership: em.current_membership,
          plan: em.current_plan,
          end_date: em.current_membership.end_date,
          days_remaining: em.days_remaining,
          has_reminder_sent_7d: memberReminders.some((r) => r.reminder_type === '7_days_before'),
          has_reminder_sent_3d: memberReminders.some((r) => r.reminder_type === '3_days_before'),
          has_reminder_sent_1d: memberReminders.some((r) => r.reminder_type === '1_day_before'),
          has_reminder_sent_0d: memberReminders.some((r) => r.reminder_type === 'on_expiry'),
        });
      }
    });

    return details.sort((a, b) => a.days_remaining - b.days_remaining);
  }, [enrichedMembers, reminders]);

  const expiredMembers: EnrichedMember[] = useMemo(() => {
    return enrichedMembers.filter((m) => m.timing_status === 'expired');
  }, [enrichedMembers]);

  const enrichedPayments: EnrichedPayment[] = useMemo(() => {
    return payments
      .filter((p) => !p.deleted_at)
      .map((payment) => {
        const member = members.find((m) => m.id === payment.member_id);
        const membership = memberships.find((ms) => ms.id === payment.membership_id);
        const plan = membership ? plans.find((p) => p.id === membership.plan_id) : undefined;
        const receipt = receipts.find((r) => r.payment_id === payment.id && !r.deleted_at);

        return {
          ...payment,
          member,
          membership,
          plan,
          receipt,
        };
      })
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  }, [payments, members, memberships, plans, receipts]);

  const enrichedReceipts: EnrichedReceipt[] = useMemo(() => {
    return receipts
      .filter((r) => !r.deleted_at)
      .map((receipt) => {
        const payment = payments.find((p) => p.id === receipt.payment_id);
        const member = payment ? members.find((m) => m.id === payment.member_id) : undefined;
        const membership = payment ? memberships.find((ms) => ms.id === payment.membership_id) : undefined;
        const plan = membership ? plans.find((p) => p.id === membership.plan_id) : undefined;

        if (!payment || !member || !membership || !plan) return null;

        return {
          ...receipt,
          payment,
          member,
          membership,
          plan,
        };
      })
      .filter(Boolean) as EnrichedReceipt[];
  }, [receipts, payments, members, memberships, plans]);

  const getEnrichedReceipt = (receiptOrId: string | Receipt): EnrichedReceipt | null => {
    const rId = typeof receiptOrId === 'string' ? receiptOrId : receiptOrId.id;
    const found = receipts.find((r) => r.id === rId || r.receipt_number === rId);
    if (!found) return null;

    const payment = payments.find((p) => p.id === found.payment_id);
    if (!payment) return null;

    const member = members.find((m) => m.id === payment.member_id);
    const membership = memberships.find((ms) => ms.id === payment.membership_id);
    const plan = membership ? plans.find((p) => p.id === membership.plan_id) : undefined;

    if (!member || !membership || !plan) return null;

    return {
      ...found,
      payment,
      member,
      membership,
      plan,
    };
  };

  const stats = useMemo(() => {
    const validActive = enrichedMembers.filter(
      (m) =>
        m.status === 'active' &&
        !m.deleted_at &&
        (m.timing_status === 'active' || m.timing_status === 'expiring_soon')
    ).length;
    const allRegistered = members.filter((m) => m.status === 'active' && !m.deleted_at).length;
    const expiring7 = expiringMembers.length;
    const expired = expiredMembers.length;
    const unpaid = unpaidMembers.length;

    let todayRev = 0;
    let thisMonthRev = 0;
    let totalRev = 0;

    payments.filter((p) => !p.deleted_at).forEach((p) => {
      const pDate = new Date(p.payment_date);
      totalRev += p.amount;
      if (isToday(pDate)) {
        todayRev += p.amount;
      }
      if (isThisMonth(pDate)) {
        thisMonthRev += p.amount;
      }
    });

    return {
      totalActiveMembers: validActive,
      validActiveMembers: validActive,
      allRegisteredMembers: allRegistered,
      expiringIn7Days: expiring7,
      expiredCount: expired,
      unpaidCount: unpaid,
      todayRevenue: todayRev,
      thisMonthRevenue: thisMonthRev,
      totalRevenueAllTime: totalRev,
    };
  }, [members, enrichedMembers, expiringMembers, expiredMembers, unpaidMembers, payments]);

  // ----------------------------------------------------
  // Context Actions & Business Logic
  // ----------------------------------------------------

  const addMember = async (
    memberData: Omit<Member, 'id' | 'member_code' | 'created_at' | 'updated_at'>,
    initialPlanId: string,
    customStartDate?: string,
    customEndDate?: string,
    initialPayment?: { amount: number; method: PaymentMethod; ref?: string; notes?: string }
  ) => {
    const plan = plans.find((p) => p.id === initialPlanId) || plans[0] || SEED_MEMBERSHIP_PLANS[0];
    const duration = plan?.duration_days || 30;
    const planId = plan?.id || SEED_MEMBERSHIP_PLANS[0].id;
    const planName = plan?.name || 'Standard Monthly Plan';
    const planPrice = plan?.price || 3000;
    const startDate = customStartDate || format(new Date(), 'yyyy-MM-dd');
    const endDate =
      customEndDate || format(addDays(new Date(startDate), duration), 'yyyy-MM-dd');
    const nowIso = new Date().toISOString();
    const deviceId = getDeviceId();

    const memberId = generateUUID();
    const memberCode = generateNextMemberCode(members);

    const newMember: Member = {
      ...memberData,
      id: memberId,
      gym_id: activeGymId,
      member_code: memberCode,
      updated_by: deviceId,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const membershipId = generateUUID();
    const newMembership: Membership = {
      id: membershipId,
      gym_id: activeGymId,
      member_id: memberId,
      plan_id: planId,
      start_date: startDate,
      end_date: endDate,
      amount: planPrice,
      status: 'active',
      notes: `Registered with initial plan ${planName}`,
      updated_by: deviceId,
      created_at: nowIso,
      updated_at: nowIso,
    };

    await putInStore('members', newMember);
    await putInStore('memberships', newMembership);
    await enqueueSync('members', newMember.id, 'INSERT', newMember);
    await enqueueSync('memberships', newMembership.id, 'INSERT', newMembership);

    let createdReceipt: Receipt | undefined = undefined;
    let enrichedReceipt: EnrichedReceipt | undefined = undefined;

    // Record initial payment if requested
    if (initialPayment && initialPayment.amount > 0) {
      const paymentId = generateUUID();
      const newPayment: Payment = {
        id: paymentId,
        gym_id: activeGymId,
        member_id: memberId,
        membership_id: membershipId,
        amount: initialPayment.amount,
        payment_method: initialPayment.method,
        payment_date: startDate,
        transaction_reference: initialPayment.ref,
        notes: initialPayment.notes || 'Initial registration payment',
        updated_by: deviceId,
        created_at: nowIso,
      };

      const receiptNumber = generateNextReceiptNumber(receipts);
      const newReceipt: Receipt = {
        id: generateUUID(),
        gym_id: activeGymId,
        payment_id: paymentId,
        receipt_number: receiptNumber,
        generated_at: nowIso,
        created_at: nowIso,
      };

      await putInStore('payments', newPayment);
      await putInStore('receipts', newReceipt);
      await enqueueSync('payments', newPayment.id, 'INSERT', newPayment);
      await enqueueSync('receipts', newReceipt.id, 'INSERT', newReceipt);

      setPayments((prev) => [newPayment, ...prev]);
      setReceipts((prev) => [newReceipt, ...prev]);
      createdReceipt = newReceipt;

      enrichedReceipt = {
        ...newReceipt,
        payment: newPayment,
        member: newMember,
        membership: newMembership,
        plan,
      };
    }

    setMembers((prev) => [newMember, ...prev]);
    setMemberships((prev) => [newMembership, ...prev]);

    return { member: newMember, membership: newMembership, receipt: createdReceipt, enrichedReceipt };
  };

  const updateMember = async (id: string, updates: Partial<Member>) => {
    const existing = members.find((m) => m.id === id);
    if (!existing) return;

    const deviceId = getDeviceId();
    const updated: Member = {
      ...existing,
      ...updates,
      updated_by: deviceId,
      updated_at: new Date().toISOString(),
    };

    await putInStore('members', updated);
    await enqueueSync('members', id, 'UPDATE', updated);
    setMembers((prev) => prev.map((m) => (m.id === id ? updated : m)));
  };

  const deleteMember = async (id: string) => {
    const nowIso = new Date().toISOString();
    const deviceId = getDeviceId();

    // 1. Tombstone member in IndexedDB
    const member = members.find((m) => m.id === id);
    if (member) {
      const tombstoned: Member = {
        ...member,
        deleted_at: nowIso,
        deleted_by: deviceId,
        updated_at: nowIso,
      };
      await putInStore('members', tombstoned);
      await enqueueSync('members', id, 'DELETE', tombstoned);
    }

    // 2. Tombstone memberships
    const memberMemberships = memberships.filter((m) => m.member_id === id);
    for (const ms of memberMemberships) {
      const msTombstone: Membership = {
        ...ms,
        deleted_at: nowIso,
        deleted_by: deviceId,
        updated_at: nowIso,
      };
      await putInStore('memberships', msTombstone);
      await enqueueSync('memberships', ms.id, 'DELETE', msTombstone);
    }

    // 3. Tombstone payments (Cascade delete revenue from deleted member)
    const memberPayments = payments.filter((p) => p.member_id === id);
    const memberPaymentIds = new Set(memberPayments.map((p) => p.id));
    for (const pay of memberPayments) {
      const payTombstone: Payment = {
        ...pay,
        deleted_at: nowIso,
        deleted_by: deviceId,
        updated_by: deviceId,
      };
      await putInStore('payments', payTombstone);
      await enqueueSync('payments', pay.id, 'DELETE', payTombstone);
    }

    // 4. Tombstone receipts
    const memberReceipts = receipts.filter((r) => memberPaymentIds.has(r.payment_id));
    for (const rec of memberReceipts) {
      const recTombstone: Receipt = {
        ...rec,
        deleted_at: nowIso,
        deleted_by: deviceId,
      };
      await putInStore('receipts', recTombstone);
      await enqueueSync('receipts', rec.id, 'DELETE', recTombstone);
    }

    // 5. Update in-memory state
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setMemberships((prev) => prev.filter((ms) => ms.member_id !== id));
    setPayments((prev) => prev.filter((p) => p.member_id !== id));
    setReceipts((prev) => prev.filter((r) => !memberPaymentIds.has(r.payment_id)));

    // 6. Trigger sync
    processSyncQueue();
  };

  const toggleMemberStatus = async (id: string) => {
    const member = members.find((m) => m.id === id);
    if (!member) return;

    const newStatus = member.status === 'active' ? 'inactive' : 'active';
    await updateMember(id, { status: newStatus });
  };

  const renewMembership = async (
    memberId: string,
    planId: string,
    startDate: string,
    customEndDate?: string,
    amountOverride?: number,
    immediatePayment?: { method: PaymentMethod; amount?: number; ref?: string; notes?: string }
  ) => {
    const plan = plans.find((p) => p.id === planId) || plans[0] || SEED_MEMBERSHIP_PLANS[0];
    const duration = plan?.duration_days || 30;
    const planIdToUse = plan?.id || SEED_MEMBERSHIP_PLANS[0].id;
    const planNameToUse = plan?.name || 'Standard Monthly Plan';
    const planPriceToUse = plan?.price || 3000;
    const endDate =
      customEndDate || format(addDays(new Date(startDate), duration), 'yyyy-MM-dd');
    const amount = amountOverride !== undefined ? amountOverride : planPriceToUse;
    const nowIso = new Date().toISOString();
    const deviceId = getDeviceId();

    const membershipId = generateUUID();
    const newMembership: Membership = {
      id: membershipId,
      gym_id: activeGymId,
      member_id: memberId,
      plan_id: planIdToUse,
      start_date: startDate,
      end_date: endDate,
      amount,
      status: 'active',
      notes: `Renewed with plan ${planNameToUse}`,
      updated_by: deviceId,
      created_at: nowIso,
      updated_at: nowIso,
    };

    await putInStore('memberships', newMembership);
    await enqueueSync('memberships', newMembership.id, 'INSERT', newMembership);
    setMemberships((prev) => [newMembership, ...prev]);

    let createdReceipt: Receipt | undefined = undefined;
    let enrichedReceipt: EnrichedReceipt | undefined = undefined;

    if (immediatePayment && (immediatePayment.amount === undefined || immediatePayment.amount > 0)) {
      const payAmount = immediatePayment.amount !== undefined ? immediatePayment.amount : amount;
      const paymentId = generateUUID();
      const newPayment: Payment = {
        id: paymentId,
        gym_id: activeGymId,
        member_id: memberId,
        membership_id: membershipId,
        amount: payAmount,
        payment_method: immediatePayment.method,
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        transaction_reference: immediatePayment.ref,
        notes: immediatePayment.notes || `Renewal payment for ${plan.name}`,
        updated_by: deviceId,
        created_at: nowIso,
      };

      const receiptNumber = generateNextReceiptNumber(receipts);
      const newReceipt: Receipt = {
        id: generateUUID(),
        gym_id: activeGymId,
        payment_id: paymentId,
        receipt_number: receiptNumber,
        generated_at: nowIso,
        created_at: nowIso,
      };

      await putInStore('payments', newPayment);
      await putInStore('receipts', newReceipt);
      await enqueueSync('payments', newPayment.id, 'INSERT', newPayment);
      await enqueueSync('receipts', newReceipt.id, 'INSERT', newReceipt);

      setPayments((prev) => [newPayment, ...prev]);
      setReceipts((prev) => [newReceipt, ...prev]);
      createdReceipt = newReceipt;

      const member = members.find((m) => m.id === memberId);
      if (member) {
        enrichedReceipt = {
          ...newReceipt,
          payment: newPayment,
          member,
          membership: newMembership,
          plan,
        };
      }
    }

    processSyncQueue();
    return { membership: newMembership, receipt: createdReceipt, enrichedReceipt };
  };

  const recordPayment = async (
    memberId: string,
    membershipId: string,
    amount: number,
    method: PaymentMethod,
    paymentDate?: string,
    reference?: string,
    notes?: string
  ) => {
    const nowIso = new Date().toISOString();
    const pDate = paymentDate || format(new Date(), 'yyyy-MM-dd');
    const deviceId = getDeviceId();

    const paymentId = generateUUID();
    const newPayment: Payment = {
      id: paymentId,
      gym_id: activeGymId,
      member_id: memberId,
      membership_id: membershipId,
      amount,
      payment_method: method,
      payment_date: pDate,
      transaction_reference: reference,
      notes,
      updated_by: deviceId,
      created_at: nowIso,
    };

    const receiptNumber = generateNextReceiptNumber(receipts);
    const newReceipt: Receipt = {
      id: generateUUID(),
      gym_id: activeGymId,
      payment_id: paymentId,
      receipt_number: receiptNumber,
      generated_at: nowIso,
      created_at: nowIso,
    };

    await putInStore('payments', newPayment);
    await putInStore('receipts', newReceipt);
    await enqueueSync('payments', newPayment.id, 'INSERT', newPayment);
    await enqueueSync('receipts', newReceipt.id, 'INSERT', newReceipt);

    setPayments((prev) => [newPayment, ...prev]);
    setReceipts((prev) => [newReceipt, ...prev]);

    const member = members.find((m) => m.id === memberId);
    const membership = memberships.find((ms) => ms.id === membershipId);
    const plan = membership ? plans.find((p) => p.id === membership.plan_id) : undefined;

    const enrichedReceipt: EnrichedReceipt = {
      ...newReceipt,
      payment: newPayment,
      member: member || {
        id: memberId,
        member_code: 'FT-TEMP',
        full_name: 'Member',
        phone: '',
        status: 'active',
        created_at: nowIso,
        updated_at: nowIso,
      },
      membership: membership || {
        id: membershipId,
        member_id: memberId,
        plan_id: plan?.id || 'plan-01',
        start_date: pDate,
        end_date: pDate,
        amount,
        status: 'active',
        created_at: nowIso,
        updated_at: nowIso,
      },
      plan: plan || {
        id: 'plan-01',
        name: 'Standard Plan',
        price: amount,
        duration_days: 30,
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso,
      },
    };

    return { payment: newPayment, receipt: newReceipt, enrichedReceipt };
  };

  const addPlan = async (planData: Omit<MembershipPlan, 'id' | 'created_at' | 'updated_at'>) => {
    const nowIso = new Date().toISOString();
    const deviceId = getDeviceId();
    const newPlan: MembershipPlan = {
      ...planData,
      id: generateUUID(),
      gym_id: activeGymId,
      updated_by: deviceId,
      created_at: nowIso,
      updated_at: nowIso,
    };

    await putInStore('membership_plans', newPlan);
    await enqueueSync('membership_plans', newPlan.id, 'INSERT', newPlan);
    setPlans((prev) => [...prev, newPlan]);
    return newPlan;
  };

  const updatePlan = async (id: string, updates: Partial<MembershipPlan>) => {
    const plan = plans.find((p) => p.id === id);
    if (!plan) return;

    const deviceId = getDeviceId();
    const updated: MembershipPlan = {
      ...plan,
      ...updates,
      updated_by: deviceId,
      updated_at: new Date().toISOString(),
    };

    await putInStore('membership_plans', updated);
    await enqueueSync('membership_plans', id, 'UPDATE', updated);
    setPlans((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };

  const deletePlan = async (id: string) => {
    const nowIso = new Date().toISOString();
    const deviceId = getDeviceId();
    const plan = plans.find((p) => p.id === id);
    if (plan) {
      const tombstoned: MembershipPlan = {
        ...plan,
        deleted_at: nowIso,
        deleted_by: deviceId,
        updated_at: nowIso,
      };
      await putInStore('membership_plans', tombstoned);
      await enqueueSync('membership_plans', id, 'DELETE', tombstoned);
    }
    setPlans((prev) => prev.filter((p) => p.id !== id));
  };

  const generateReminder = async (
    memberId: string,
    membershipId: string,
    reminderType: ReminderType
  ) => {
    const member = members.find((m) => m.id === memberId);
    const membership = memberships.find((ms) => ms.id === membershipId);
    if (!member || !membership) {
      throw new Error('Member or Membership not found');
    }

    const existing = reminders.find(
      (r) =>
        r.member_id === memberId &&
        r.membership_id === membershipId &&
        r.reminder_type === reminderType
    );

    if (existing) {
      return { reminder: existing, alreadyExisted: true };
    }

    const gymName = settings.gym_name || 'Fit-thetic Gym';
    const nowIso = new Date().toISOString();

    const daysLeft = differenceInDays(new Date(membership.end_date), new Date());
    let message = '';

    if (reminderType === '7_days_before') {
      message = `Hi ${member.full_name}, your gym membership at ${gymName} is expiring in 7 days (on ${membership.end_date}). Renew now to stay on track!`;
    } else if (reminderType === '3_days_before') {
      message = `Reminder: Hi ${member.full_name}, 3 days left on your ${gymName} membership. Visit front desk to renew!`;
    } else if (reminderType === '1_day_before') {
      message = `Urgent: Hi ${member.full_name}, your membership at ${gymName} expires tomorrow (${membership.end_date}).`;
    } else if (reminderType === 'on_expiry') {
      message = `Hi ${member.full_name}, your membership at ${gymName} expired today. Please renew your membership to continue working out.`;
    } else {
      message = `Hi ${member.full_name}, this is a notification from ${gymName} regarding your membership.`;
    }

    const newReminder: WhatsAppReminder = {
      id: generateUUID(),
      gym_id: activeGymId,
      member_id: memberId,
      membership_id: membershipId,
      reminder_type: reminderType,
      scheduled_at: nowIso,
      sent_at: nowIso,
      status: 'demo_generated',
      direct_opened: false,
      message_text: message,
      created_at: nowIso,
    };

    await putInStore('whatsapp_reminders', newReminder);
    await enqueueSync('whatsapp_reminders', newReminder.id, 'INSERT', newReminder);
    setReminders((prev) => [newReminder, ...prev]);

    return { reminder: newReminder, alreadyExisted: false };
  };

  const getWhatsAppShareUrl = (
    memberId: string,
    membershipId?: string,
    _reminderType?: ReminderType
  ) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return '#';

    const membership = membershipId
      ? memberships.find((ms) => ms.id === membershipId)
      : memberships.find((ms) => ms.member_id === memberId && !ms.deleted_at);

    const gymName = settings.gym_name || 'Fit-thetic Fitness Club';
    const ownerName = settings.owner_name || 'Dawood Janjua';
    const currency = settings.currency || 'Rs.';

    const cleanPhone = member.phone.replace(/[^0-9]/g, '');
    const phoneFormatted = cleanPhone.startsWith('92')
      ? cleanPhone
      : cleanPhone.startsWith('0')
      ? `92${cleanPhone.slice(1)}`
      : `92${cleanPhone}`;

    const enriched = enrichedMembers.find((m) => m.id === memberId);

    let message = '';
    if (enriched?.timing_status === 'expired') {
      message = `Hi ${member.full_name},\n\nYour gym membership at *${gymName}* expired on *${membership?.end_date || 'recently'}*.\n\nPlease renew your membership fee (${currency} ${(enriched.current_plan?.price || 3000).toLocaleString()}) to continue your workout sessions.\n\nThank you,\n*${ownerName}*\n${gymName}`;
    } else if (enriched?.timing_status === 'expiring_soon') {
      message = `Hi ${member.full_name},\n\nYour gym membership at *${gymName}* is expiring on *${membership?.end_date}* (${enriched.days_remaining} day${enriched.days_remaining === 1 ? '' : 's'} remaining).\n\nPlease renew in advance to maintain your fitness streak!\n\nThank you,\n*${ownerName}*\n${gymName}`;
    } else if (enriched?.is_unpaid) {
      message = `Hi ${member.full_name},\n\nThis is a reminder from *${gymName}* regarding an outstanding fee balance of *${currency} ${enriched.balance_due.toLocaleString()}*.\n\nPlease clear the balance at your earliest convenience.\n\nThank you,\n*${ownerName}*\n${gymName}`;
    } else {
      message = `Hi ${member.full_name},\n\nGreetings from *${gymName}*! Your membership is active until *${membership?.end_date || 'end of cycle'}*.\n\nKeep up the great workouts!\n\nBest regards,\n*${ownerName}*\n${gymName}`;
    }

    return `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(message)}`;
  };

  const importMembersBatch = async (
    batchMembers: Member[],
    batchMemberships: Membership[]
  ) => {
    for (const m of batchMembers) {
      await putInStore('members', m);
      await enqueueSync('members', m.id, 'INSERT', m);
    }
    for (const ms of batchMemberships) {
      await putInStore('memberships', ms);
      await enqueueSync('memberships', ms.id, 'INSERT', ms);
    }

    setMembers((prev) => [...batchMembers, ...prev]);
    setMemberships((prev) => [...batchMemberships, ...prev]);
  };

  /**
   * Idempotent Initial Cloud Migration
   * Safely uploads all local members, plans, payments, and receipts into Supabase
   */
  const uploadLocalDataToCloud = async (targetGymId?: string) => {
    const gymId = targetGymId || activeGymId;
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, membersUploaded: 0, plansUploaded: 0, paymentsUploaded: 0, receiptsUploaded: 0, error: 'Supabase cloud is not configured' };
    }

    try {
      // 1. Upload Plans
      let plansCount = 0;
      for (const p of plans) {
        const payload = { ...p, gym_id: gymId };
        const { error } = await supabase.from('membership_plans').upsert(payload, { onConflict: 'id' });
        if (!error) plansCount++;
      }

      // 2. Upload Members
      let membersCount = 0;
      for (const m of members) {
        const payload = { ...m, gym_id: gymId };
        const { error } = await supabase.from('members').upsert(payload, { onConflict: 'id' });
        if (!error) membersCount++;
      }

      // 3. Upload Memberships
      for (const ms of memberships) {
        const payload = { ...ms, gym_id: gymId };
        await supabase.from('memberships').upsert(payload, { onConflict: 'id' });
      }

      // 4. Upload Payments
      let paymentsCount = 0;
      for (const pay of payments) {
        const payload = { ...pay, gym_id: gymId };
        const { error } = await supabase.from('payments').upsert(payload, { onConflict: 'id' });
        if (!error) paymentsCount++;
      }

      // 5. Upload Receipts
      let receiptsCount = 0;
      for (const rec of receipts) {
        const payload = { ...rec, gym_id: gymId };
        const { error } = await supabase.from('receipts').upsert(payload, { onConflict: 'id' });
        if (!error) receiptsCount++;
      }

      return {
        success: true,
        membersUploaded: membersCount,
        plansUploaded: plansCount,
        paymentsUploaded: paymentsCount,
        receiptsUploaded: receiptsCount,
      };
    } catch (err: any) {
      return {
        success: false,
        membersUploaded: 0,
        plansUploaded: 0,
        paymentsUploaded: 0,
        receiptsUploaded: 0,
        error: err.message || 'Initial cloud upload failed',
      };
    }
  };

  const updateSettings = async (updates: Partial<GymSettings>) => {
    const updated: GymSettings = {
      ...settings,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await putInStore('gym_settings', updated);
    await enqueueSync('gym_settings', updated.id || 'sett-001', 'UPDATE', updated);
    setSettings(updated);
    processSyncQueue();
  };

  const resetToDemoData = async () => {
    setIsLoading(true);
    localStorage.removeItem('fit_thetic_last_synced');
    await clearAllStores();
    await processSyncQueue();
    await loadDataFromIDB();
    setIsLoading(false);
  };

  const forceSyncNow = async () => {
    const res = await processSyncQueue();
    await loadDataFromIDB();
    return res;
  };

  const exportFullDatabaseBackup = () => {
    const backupData = {
      version: '2.0.0',
      exported_at: new Date().toISOString(),
      gym_name: settings.gym_name || 'Fit-Thetic Fitness Club',
      gym_id: activeGymId,
      device_id: getDeviceId(),
      members,
      memberships,
      plans,
      payments,
      receipts,
      reminders,
      settings,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    const dateStr = format(new Date(), 'yyyy-MM-dd_HHmm');
    downloadAnchor.setAttribute('download', `fit-thetic-backup-${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importFullDatabaseBackup = async (
    jsonContent: string
  ): Promise<{ success: boolean; memberCount: number; paymentCount: number; receiptCount: number }> => {
    try {
      const parsed = JSON.parse(jsonContent);

      if (!parsed || (!Array.isArray(parsed.members) && !Array.isArray(parsed.plans))) {
        throw new Error('Invalid backup file format: Missing members or plans.');
      }

      setIsLoading(true);
      await clearAllStores();

      // Restore Plans
      if (Array.isArray(parsed.plans)) {
        for (const p of parsed.plans) {
          await putInStore('membership_plans', p);
        }
        setPlans(parsed.plans);
      }

      // Restore Members
      if (Array.isArray(parsed.members)) {
        for (const m of parsed.members) {
          await putInStore('members', m);
        }
        setMembers(parsed.members);
      }

      // Restore Memberships
      if (Array.isArray(parsed.memberships)) {
        for (const ms of parsed.memberships) {
          await putInStore('memberships', ms);
        }
        setMemberships(parsed.memberships);
      }

      // Restore Payments
      if (Array.isArray(parsed.payments)) {
        for (const p of parsed.payments) {
          await putInStore('payments', p);
        }
        setPayments(parsed.payments);
      }

      // Restore Receipts
      if (Array.isArray(parsed.receipts)) {
        for (const r of parsed.receipts) {
          await putInStore('receipts', r);
        }
        setReceipts(parsed.receipts);
      }

      // Restore Reminders
      if (Array.isArray(parsed.reminders)) {
        for (const rem of parsed.reminders) {
          await putInStore('whatsapp_reminders', rem);
        }
        setReminders(parsed.reminders);
      }

      // Restore Settings
      if (parsed.settings && typeof parsed.settings === 'object') {
        await putInStore('gym_settings', parsed.settings);
        setSettings(parsed.settings);
      }

      setIsLoading(false);
      return {
        success: true,
        memberCount: Array.isArray(parsed.members) ? parsed.members.length : 0,
        paymentCount: Array.isArray(parsed.payments) ? parsed.payments.length : 0,
        receiptCount: Array.isArray(parsed.receipts) ? parsed.receipts.length : 0,
      };
    } catch (err: any) {
      setIsLoading(false);
      throw new Error(err.message || 'Failed to parse and import backup file.');
    }
  };

  return (
    <GymContext.Provider
      value={{
        members,
        plans,
        memberships,
        payments,
        receipts,
        reminders,
        settings,
        syncState,
        isLoading,

        enrichedMembers,
        unpaidMembers,
        expiringMembers,
        expiredMembers,
        enrichedPayments,
        enrichedReceipts,
        getEnrichedReceipt,
        stats,

        addMember,
        updateMember,
        deleteMember,
        toggleMemberStatus,
        renewMembership,
        recordPayment,
        addPlan,
        updatePlan,
        deletePlan,
        generateReminder,
        getWhatsAppShareUrl,
        importMembersBatch,
        uploadLocalDataToCloud,
        updateSettings,
        resetToDemoData,
        forceSyncNow,
        exportFullDatabaseBackup,
        importFullDatabaseBackup,
      }}
    >
      {children}
    </GymContext.Provider>
  );
};

export const useGym = () => {
  const context = useContext(GymContext);
  if (!context) {
    throw new Error('useGym must be used within a GymProvider');
  }
  return context;
};
