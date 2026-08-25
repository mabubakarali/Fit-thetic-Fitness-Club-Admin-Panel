export type Gender = 'male' | 'female' | 'other';
export type MemberStatus = 'active' | 'inactive';
export type MembershipStatus = 'active' | 'expired' | 'cancelled';
export type PaymentMethod = 'cash' | 'easypaisa' | 'jazzcash' | 'bank_transfer' | 'other';
export type ReminderType = '7_days_before' | '3_days_before' | '1_day_before' | 'on_expiry' | 'custom';
export type ReminderStatus = 'demo_generated' | 'sent' | 'failed';
export type UserRole = 'owner' | 'admin' | 'staff';

// ----------------------------------------------------
// Multi-Tenant Core Models
// ----------------------------------------------------

export interface Gym {
  id: string;
  name: string;
  slug?: string;
  phone: string;
  email?: string;
  address: string;
  currency: string;
  receipt_footer: string;
  whatsapp_reminders_enabled: boolean;
  reminder_settings: ReminderSettings;
  created_at: string;
  updated_at: string;
}

export interface GymUser {
  id: string;
  user_id: string;
  gym_id: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  auth_user_id?: string;
  gym_id?: string;
  full_name: string;
  phone?: string;
  email: string;
  gender?: Gender;
  date_of_birth?: string;
  address?: string;
  emergency_contact?: string;
  notes?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface MembershipPlan {
  id: string;
  gym_id?: string;
  name: string;
  price: number;
  duration_days: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface Member {
  id: string;
  gym_id?: string;
  member_code: string; // e.g. FT-0001
  full_name: string;
  phone: string;
  email?: string;
  gender?: Gender;
  date_of_birth?: string;
  address?: string;
  emergency_contact?: string;
  notes?: string;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
  updated_by?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface Membership {
  id: string;
  gym_id?: string;
  member_id: string;
  plan_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  amount: number;
  status: MembershipStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface Payment {
  id: string;
  gym_id?: string;
  member_id: string;
  membership_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string; // YYYY-MM-DD
  transaction_reference?: string;
  notes?: string;
  created_at: string;
  updated_by?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface Receipt {
  id: string;
  gym_id?: string;
  payment_id: string;
  receipt_number: string; // e.g. FT-2026-00001
  generated_at: string;
  created_at?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface WhatsAppReminder {
  id: string;
  gym_id?: string;
  member_id: string;
  membership_id: string;
  reminder_type: ReminderType;
  scheduled_at: string;
  sent_at: string;
  status: ReminderStatus;
  direct_opened: boolean;
  message_text: string;
  whatsapp_message_id?: string;
  error_message?: string;
  created_at: string;
  deleted_at?: string | null;
}

export interface ReminderSettings {
  d7: boolean;
  d3: boolean;
  d1: boolean;
  d0: boolean;
  custom_template?: string;
}

export interface GymSettings {
  id: string;
  gym_id?: string;
  gym_name: string;
  owner_name?: string;
  logo_url?: string;
  phone: string;
  email?: string;
  address: string;
  currency: string;
  receipt_footer: string;
  whatsapp_reminders_enabled: boolean;
  reminder_settings: ReminderSettings;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------
// Computed & Enriched View Types
// ----------------------------------------------------

export type MembershipTimingStatus = 'active' | 'expiring_soon' | 'expired';

export interface EnrichedMember extends Member {
  current_membership?: Membership;
  current_plan?: MembershipPlan;
  timing_status: MembershipTimingStatus;
  days_remaining: number;
  total_paid_for_current_membership: number;
  balance_due: number;
  is_unpaid: boolean;
  last_payment_date?: string;
  all_memberships: Membership[];
  all_payments: Payment[];
  all_receipts: Receipt[];
}

export interface UnpaidMemberDetail {
  member: Member;
  membership: Membership;
  plan: MembershipPlan;
  amount_due: number;
  due_date: string;
  days_overdue: number;
  total_paid: number;
  last_payment_date?: string;
}

export interface ExpiringMemberDetail {
  member: Member;
  membership: Membership;
  plan: MembershipPlan;
  end_date: string;
  days_remaining: number;
  has_reminder_sent_7d: boolean;
  has_reminder_sent_3d: boolean;
  has_reminder_sent_1d: boolean;
  has_reminder_sent_0d: boolean;
}

export interface EnrichedPayment extends Payment {
  member?: Member;
  membership?: Membership;
  plan?: MembershipPlan;
  receipt?: Receipt;
}

export interface EnrichedReceipt extends Receipt {
  payment: Payment;
  member: Member;
  membership: Membership;
  plan: MembershipPlan;
}

export interface EnrichedReminder extends WhatsAppReminder {
  member?: Member;
  membership?: Membership;
  plan?: MembershipPlan;
}

// ----------------------------------------------------
// Offline Sync Types & Multi-Tenant Sync Operations
// ----------------------------------------------------

export type SyncOperationType = 'INSERT' | 'UPDATE' | 'DELETE';
export type SyncEntity =
  | 'members'
  | 'memberships'
  | 'payments'
  | 'receipts'
  | 'membership_plans'
  | 'whatsapp_reminders'
  | 'gyms'
  | 'gym_users';

export type SyncStatus = 'pending' | 'syncing' | 'failed' | 'synced';

export interface SyncQueueItem {
  id: string; // Operation UUID
  gym_id: string;
  device_id: string;
  entity: SyncEntity;
  entity_id: string;
  operation: SyncOperationType;
  payload: Record<string, any>;
  timestamp: number;
  status: SyncStatus;
  retry_count: number;
  error_message?: string;
}

export interface SyncState {
  mode: 'offline_standalone' | 'cloud_synced';
  is_online: boolean;
  is_syncing: boolean;
  last_synced_at: string | null;
  pending_count: number;
  failed_count: number;
  active_gym_id?: string;
  active_gym_name?: string;
  device_id: string;
  error?: string | null;
}
