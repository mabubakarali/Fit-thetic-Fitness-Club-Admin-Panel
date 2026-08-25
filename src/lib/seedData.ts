import {
  Member,
  MembershipPlan,
  Membership,
  Payment,
  Receipt,
  WhatsAppReminder,
  GymSettings
} from '@/types/database';
import { format, subDays } from 'date-fns';

const today = new Date();
const fmtIso = (d: Date) => d.toISOString();

export const SEED_GYM_SETTINGS: GymSettings = {
  id: 'sett-001',
  gym_name: 'Fit-Thetic Fitness Club',
  owner_name: 'Dawood Janjua',
  logo_url: '',
  phone: '03216422429',
  email: 'dawood@fit-thetic.pk',
  address: 'Royal Avenue, Meherban Colony, Chak Shahzad, Isb',
  currency: 'Rs.',
  receipt_footer: 'Thank you for training with Fit-Thetic Fitness Club! Membership fees are strictly non-refundable.',
  whatsapp_reminders_enabled: true,
  reminder_settings: {
    d7: true,
    d3: true,
    d1: true,
    d0: true,
    custom_template: 'Hi {{name}}, your membership at {{gym_name}} expires on {{expiry_date}}. Renew today to keep your training streak! - Dawood Janjua'
  },
  created_at: fmtIso(subDays(today, 120)),
  updated_at: fmtIso(subDays(today, 5)),
};

export const SEED_MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: 'plan-01',
    name: 'Monthly Standard',
    price: 2500,
    duration_days: 30,
    description: 'Full gym access, cardio & strength zone, locker access.',
    is_active: true,
    created_at: fmtIso(subDays(today, 120)),
    updated_at: fmtIso(subDays(today, 120)),
  },
  {
    id: 'plan-02',
    name: 'Student Monthly Special',
    price: 1800,
    duration_days: 30,
    description: 'Discounted access for students with valid institute ID.',
    is_active: true,
    created_at: fmtIso(subDays(today, 120)),
    updated_at: fmtIso(subDays(today, 120)),
  },
  {
    id: 'plan-03',
    name: 'Quarterly Fitness (3 Months)',
    price: 6800,
    duration_days: 90,
    description: '3 months full access + 1 free fitness assessment.',
    is_active: true,
    created_at: fmtIso(subDays(today, 120)),
    updated_at: fmtIso(subDays(today, 120)),
  },
  {
    id: 'plan-04',
    name: 'Half-Yearly Pro (6 Months)',
    price: 12500,
    duration_days: 180,
    description: '6 months full access + free gym shaker & diet chart.',
    is_active: true,
    created_at: fmtIso(subDays(today, 120)),
    updated_at: fmtIso(subDays(today, 120)),
  },
  {
    id: 'plan-05',
    name: 'Annual VIP All-Access (12 Months)',
    price: 22000,
    duration_days: 365,
    description: '1 full year access + free guest passes & personalized locker.',
    is_active: true,
    created_at: fmtIso(subDays(today, 120)),
    updated_at: fmtIso(subDays(today, 120)),
  },
];

/**
 * Clean initial factory state for live production deployment
 */
export function generateSeedData() {
  return {
    gymSettings: SEED_GYM_SETTINGS,
    membershipPlans: SEED_MEMBERSHIP_PLANS,
    members: [] as Member[],
    memberships: [] as Membership[],
    payments: [] as Payment[],
    receipts: [] as Receipt[],
    reminders: [] as WhatsAppReminder[],
  };
}
