import Papa from 'papaparse';
import { Member, Membership, MembershipPlan } from '@/types/database';
import { format, addDays, parse, isValid } from 'date-fns';

export interface ParsedMemberRow {
  row_index: number;
  full_name: string;
  phone: string;
  email?: string;
  address?: string;
  emergency_contact?: string;
  plan_name?: string;
  plan_price?: number;
  start_date?: string;
  end_date?: string;
  amount_paid?: number;
  payment_method?: string;
  payment_date?: string;
  is_valid: boolean;
  errors: string[];
  is_duplicate_phone: boolean;
  detected_fields: Record<string, string>;
}

export interface CSVImportResult {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  rows: ParsedMemberRow[];
  detected_headers: string[];
}

/**
 * Intelligent helper to parse diverse date formats into standard YYYY-MM-DD
 */
export function normalizeDateString(rawVal?: any): string {
  if (!rawVal) return format(new Date(), 'yyyy-MM-dd');
  const str = String(rawVal).trim();
  if (!str) return format(new Date(), 'yyyy-MM-dd');

  // If numeric Excel timestamp (e.g. 45123)
  const num = Number(str);
  if (!isNaN(num) && num > 25000 && num < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const targetDate = new Date(excelEpoch.getTime() + num * 86400000);
    if (isValid(targetDate)) return format(targetDate, 'yyyy-MM-dd');
  }

  // Common Date formats
  const candidateFormats = [
    'yyyy-MM-dd',
    'dd/MM/yyyy',
    'dd-MM-yyyy',
    'dd.MM.yyyy',
    'MM/dd/yyyy',
    'MM-dd-yyyy',
    'yyyy/MM/dd',
    'd/M/yyyy',
    'd-M-yyyy',
    'dd MMM yyyy',
    'd MMM yyyy',
    'yyyyMMdd',
  ];

  for (const fmt of candidateFormats) {
    try {
      const parsed = parse(str, fmt, new Date());
      if (isValid(parsed) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
        return format(parsed, 'yyyy-MM-dd');
      }
    } catch (_) {}
  }

  // Native Date fallback
  const native = new Date(str);
  if (isValid(native) && native.getFullYear() > 1990 && native.getFullYear() < 2100) {
    return format(native, 'yyyy-MM-dd');
  }

  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Intelligent Fuzzy Header Matcher:
 * Finds values from arbitrary user-designed Excel/CSV files with exact priority
 */
function findFieldValue(row: Record<string, any>, aliases: string[]): string {
  const keys = Object.keys(row);

  // 1. Exact normalized match first
  for (const alias of aliases) {
    const normalizedAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const key of keys) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedKey === normalizedAlias) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }
  }

  // 2. Substring match only for aliases of 4+ characters
  for (const alias of aliases) {
    const normalizedAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalizedAlias.length < 4) continue;
    for (const key of keys) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedKey.includes(normalizedAlias)) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }
  }

  return '';
}

/**
 * Helper to parse clean numeric currency/amounts from strings like "Rs. 3,000", "3000", "0.3", "0.18", "$3,000"
 */
function parseCleanAmount(rawVal?: string): number | undefined {
  if (rawVal === undefined || rawVal === null) return undefined;
  let str = String(rawVal).trim();
  if (!str) return undefined;

  // Remove currency symbols & labels (Rs, PKR, $, EUR, etc.)
  str = str.replace(/rs\.?|pkr|\$|eur|£/gi, '').trim();

  // If formatted as thousands (e.g. 3,000 or 1,800 or 3.000)
  if (/^\d{1,3}[,\.]\d{3}$/.test(str)) {
    str = str.replace(/[,\.]/g, '');
  } else {
    str = str.replace(/,/g, '');
  }

  let num = parseFloat(str);
  if (isNaN(num) || num <= 0) return undefined;

  // If Excel exported in tens of thousands / fractions (e.g. 0.3 -> 3000, 0.18 -> 1800)
  if (num < 1) {
    num = Math.round(num * 10000);
  }
  // If Excel exported in thousands (e.g. 3 -> 3000, 1.8 -> 1800, 3.5 -> 3500)
  else if (num < 50 && !Number.isInteger(num)) {
    num = Math.round(num * 1000);
  } else if (num <= 20 && Number.isInteger(num)) {
    num = num * 1000;
  }

  return num;
}

/**
 * Parses raw CSV/Excel content with intelligent fuzzy header recognition
 */
export function parseAndValidateCSV(
  csvText: string,
  existingMembers: Member[],
  availablePlans: MembershipPlan[]
): Promise<CSVImportResult> {
  return new Promise((resolve) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
      comments: '#', // Ignore summary lines starting with '#'
      complete: (results) => {
        const rows: ParsedMemberRow[] = [];
        const existingPhones = new Set(
          existingMembers.map((m) => m.phone.replace(/[^0-9]/g, '').slice(-10))
        );
        const seenInFile = new Set<string>();

        const detectedHeaders = results.meta.fields || [];

        results.data.forEach((rawRow: any, index: number) => {
          // If row is entirely empty or is a divider/summary line, ignore
          const values = Object.values(rawRow).filter((v) => v !== undefined && String(v).trim() !== '');
          if (values.length === 0) return;
          const firstVal = String(values[0]).trim();
          if (firstVal.startsWith('===') || firstVal.startsWith('---') || firstVal.toLowerCase().includes('summary')) {
            return;
          }

          const errors: string[] = [];

          // 1. Intelligent Name Detection
          const name = findFieldValue(rawRow, [
            'full_name',
            'fullname',
            'name',
            'member_name',
            'membername',
            'athlete',
            'customer_name',
            'student_name',
            'client_name',
            'member',
            'first_name',
          ]);

          // 2. Intelligent Phone Detection
          const rawPhone = findFieldValue(rawRow, [
            'phone',
            'phone_number',
            'phoneno',
            'mobile',
            'mobile_no',
            'cell',
            'cell_no',
            'contact',
            'contact_no',
            'whatsapp',
            'whatsapp_no',
            'number',
            'tel',
          ]);

          // 3. Email
          const email = findFieldValue(rawRow, ['email', 'email_address', 'e_mail', 'mail']);

          // 4. Address & Emergency
          const address = findFieldValue(rawRow, ['address', 'city', 'area', 'location', 'residence']);
          const emergency = findFieldValue(rawRow, ['emergency_contact', 'emergency', 'guardian', 'father_name']);

          // 5. Plan, Price & Payments
          const planName = findFieldValue(rawRow, ['plan_name', 'planname', 'plan', 'package', 'membership_plan', 'membership', 'tier']);
          const rawPlanPrice = findFieldValue(rawRow, ['plan_price', 'planprice', 'fee_amount', 'membership_fee', 'fees', 'charges']);
          const rawPaid = findFieldValue(rawRow, ['total_paid', 'totalpaid', 'last_payment_amount', 'paid_amount', 'amount_paid', 'paid', 'amount']);
          const rawMethod = findFieldValue(rawRow, ['last_payment_method', 'payment_method', 'paymentmethod', 'method', 'mode']) || 'CASH';
          const rawPayDate = findFieldValue(rawRow, ['last_payment_date', 'payment_date', 'paymentdate', 'paid_date']);

          const planPrice = parseCleanAmount(rawPlanPrice);
          const amountPaid = parseCleanAmount(rawPaid);

          // 6. Dates
          const startDateRaw = findFieldValue(rawRow, ['membership_valid_from', 'start_date', 'startdate', 'join_date', 'joining_date', 'admission_date', 'from']);
          const endDateRaw = findFieldValue(rawRow, ['membership_valid_till', 'end_date', 'enddate', 'expiry_date', 'expiry', 'valid_till', 'validity', 'to']);

          const startDate = normalizeDateString(startDateRaw);
          const endDate = endDateRaw ? normalizeDateString(endDateRaw) : undefined;

          // Validations
          if (!name.trim()) {
            errors.push('Full Name could not be identified');
          }

          if (!rawPhone.trim()) {
            errors.push('Phone number is missing');
          }

          // Clean phone for deduplication check
          const cleanPhoneDigits = rawPhone.replace(/[^0-9]/g, '').slice(-10);
          let isDuplicate = false;

          if (cleanPhoneDigits) {
            if (existingPhones.has(cleanPhoneDigits)) {
              errors.push('Phone already exists in gym database');
              isDuplicate = true;
            } else if (seenInFile.has(cleanPhoneDigits)) {
              errors.push('Duplicate phone in this file');
              isDuplicate = true;
            } else {
              seenInFile.add(cleanPhoneDigits);
            }
          }

          // Formatted Phone string
          let formattedPhone = rawPhone.trim();
          if (cleanPhoneDigits.length === 10) {
            formattedPhone = `+92 ${cleanPhoneDigits.slice(0, 3)} ${cleanPhoneDigits.slice(3)}`;
          }

          rows.push({
            row_index: index + 1,
            full_name: name.trim(),
            phone: formattedPhone,
            email: email.trim() || undefined,
            address: address.trim() || undefined,
            emergency_contact: emergency.trim() || undefined,
            plan_name: planName.trim() || undefined,
            plan_price: planPrice,
            start_date: startDate,
            end_date: endDate,
            amount_paid: amountPaid,
            payment_method: rawMethod,
            payment_date: rawPayDate ? normalizeDateString(rawPayDate) : undefined,
            is_valid: errors.length === 0,
            errors,
            is_duplicate_phone: isDuplicate,
            detected_fields: {
              Name: name,
              Phone: formattedPhone,
              Plan: planName || 'Monthly Standard',
              Fee: planPrice ? `Rs. ${planPrice.toLocaleString()}` : 'Default',
              Paid: amountPaid ? `Rs. ${amountPaid.toLocaleString()}` : 'Rs. 0',
              Start: startDate,
              End: endDate || 'Calculated',
            },
          });
        });

        const validCount = rows.filter((r) => r.is_valid).length;
        const dupCount = rows.filter((r) => r.is_duplicate_phone).length;

        resolve({
          total_rows: rows.length,
          valid_rows: validCount,
          invalid_rows: rows.length - validCount,
          duplicate_rows: dupCount,
          rows,
          detected_headers: detectedHeaders,
        });
      },
    });
  });
}

/**
 * Prepares imported batch of valid rows into DB models with Men-only defaults
 */
export function prepareImportBatch(
  validRows: ParsedMemberRow[],
  startingCodeNum: number,
  defaultPlan: MembershipPlan,
  allPlans: MembershipPlan[]
): {
  members: Member[];
  memberships: Membership[];
  payments: any[];
  receipts: any[];
} {
  const members: Member[] = [];
  const memberships: Membership[] = [];
  const payments: any[] = [];
  const receipts: any[] = [];
  const nowIso = new Date().toISOString();

  validRows.forEach((row, idx) => {
    const memberCode = `GYM-${String(startingCodeNum + idx).padStart(4, '0')}`;
    const memberId = `mem_imp_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`;

    // Match plan intelligently by name or default
    let assignedPlan = defaultPlan;
    if (row.plan_name) {
      const q = row.plan_name.toLowerCase();
      const matched = allPlans.find(
        (p) =>
          p.name.toLowerCase() === q ||
          p.name.toLowerCase().includes(q) ||
          q.includes(p.name.toLowerCase())
      );
      if (matched) assignedPlan = matched;
    }

    const startDate = row.start_date || format(new Date(), 'yyyy-MM-dd');
    const endDate =
      row.end_date ||
      format(addDays(new Date(startDate), assignedPlan.duration_days), 'yyyy-MM-dd');

    const planPrice = row.plan_price || row.amount_paid || assignedPlan.price || 3000;

    const member: Member = {
      id: memberId,
      member_code: memberCode,
      full_name: row.full_name,
      phone: row.phone,
      email: row.email,
      gender: 'male', // Always male for men-only gym
      address: row.address,
      emergency_contact: row.emergency_contact,
      status: 'active',
      created_at: nowIso,
      updated_at: nowIso,
    };

    const membershipId = `mship_imp_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`;

    const membership: Membership = {
      id: membershipId,
      member_id: memberId,
      plan_id: assignedPlan.id,
      start_date: startDate,
      end_date: endDate,
      amount: planPrice,
      status: new Date(endDate) < new Date() ? 'expired' : 'active',
      notes: `Imported via Smart Excel Import (${assignedPlan.name})`,
      created_at: nowIso,
      updated_at: nowIso,
    };

    // If amount_paid was provided (e.g. 3000), record payment and receipt
    if (row.amount_paid !== undefined && row.amount_paid > 0) {
      const paymentId = `pay_imp_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`;
      const validMethods = ['cash', 'easypaisa', 'jazzcash', 'bank_transfer'];
      const rawM = (row.payment_method || 'cash').toLowerCase().replace(/[^a-z_]/g, '');
      const method = validMethods.includes(rawM) ? rawM : 'cash';

      const payment = {
        id: paymentId,
        member_id: memberId,
        membership_id: membershipId,
        amount: row.amount_paid,
        payment_method: method,
        payment_date: row.payment_date || startDate,
        notes: `Imported payment record`,
        created_at: nowIso,
        updated_at: nowIso,
      };

      const receipt = {
        id: `rcpt_imp_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        payment_id: paymentId,
        receipt_number: `FT-${format(new Date(), 'yyyyMMdd')}-${String(startingCodeNum + idx).padStart(4, '0')}`,
        generated_at: nowIso,
        created_at: nowIso,
      };

      payments.push(payment);
      receipts.push(receipt);
    }

    members.push(member);
    memberships.push(membership);
  });

  return { members, memberships, payments, receipts };
}
