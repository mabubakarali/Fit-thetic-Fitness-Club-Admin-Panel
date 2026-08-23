import { EnrichedMember, EnrichedPayment, Payment, GymSettings } from '@/types/database';
import { format } from 'date-fns';
import Papa from 'papaparse';

/**
 * Exports members list to Excel-compatible CSV with:
 * - Last payment amount
 * - Last payment date & method
 * - Membership validity range (start date & valid till date)
 * - Total revenue collected and outstanding dues summary rows at the end
 */
export function exportMembersToExcelCSV(
  enrichedMembers: EnrichedMember[],
  allPayments: Payment[],
  settings: GymSettings
) {
  const currency = settings.currency || 'Rs.';
  const nowStr = format(new Date(), 'dd MMM yyyy, hh:mm a');

  // 1. Format each member's data row
  const memberRows = enrichedMembers.map((m) => {
    // Find member payments sorted newest first
    const memberPayments = allPayments
      .filter((p) => p.member_id === m.id)
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

    const lastPayment = memberPayments[0];
    const totalPaidByMember = memberPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      'Member Code': m.member_code,
      'Full Name': m.full_name,
      'Phone Number': m.phone,
      'Email': m.email || 'N/A',
      'Plan Name': m.current_plan?.name || 'No Active Plan',
      'Plan Price': m.current_plan?.price ? `${currency} ${m.current_plan.price.toLocaleString()}` : 'N/A',
      'Membership Valid From': m.current_membership?.start_date || 'N/A',
      'Membership Valid Till': m.current_membership?.end_date || 'N/A',
      'Status':
        m.timing_status === 'active'
          ? 'Active'
          : m.timing_status === 'expiring_soon'
          ? 'Expiring Soon'
          : m.timing_status === 'expired'
          ? 'Expired'
          : 'Inactive',
      'Days Remaining':
        m.days_remaining > 0
          ? `${m.days_remaining} Days Left`
          : m.days_remaining === 0
          ? 'Expires Today'
          : `${Math.abs(m.days_remaining)} Days Overdue`,
      'Last Payment Amount': lastPayment ? `${currency} ${lastPayment.amount.toLocaleString()}` : `${currency} 0`,
      'Last Payment Date': lastPayment ? lastPayment.payment_date : 'No Payments Recorded',
      'Last Payment Method': lastPayment ? lastPayment.payment_method.toUpperCase() : 'N/A',
      'Total Paid': `${currency} ${totalPaidByMember.toLocaleString()}`,
      'Balance Due': `${currency} ${(m.balance_due || 0).toLocaleString()}`,
      'Registration Date': format(new Date(m.created_at), 'yyyy-MM-dd'),
    };
  });

  // Calculate Aggregates
  const totalRevenue = allPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalDues = enrichedMembers.reduce((acc, m) => acc + (m.balance_due || 0), 0);
  const activeCount = enrichedMembers.filter((m) => m.timing_status === 'active').length;
  const expiredCount = enrichedMembers.filter((m) => m.timing_status === 'expired').length;
  const expiringSoonCount = enrichedMembers.filter((m) => m.timing_status === 'expiring_soon').length;

  // Convert members to CSV lines
  const csvContent = Papa.unparse(memberRows);

  // Append comprehensive summary block at the bottom
  const summaryBlock = [
    '',
    '',
    '======================= SUMMARY & REVENUE REPORT =======================',
    `"Gym Name","${settings.gym_name || 'Fit-Thetic Fitness Club'}"`,
    `"Address","${settings.address || 'Royal Avenue, Islamabad'}"`,
    `"Contact Phone","${settings.phone || '03216422429'}"`,
    `"Report Generated Date","${nowStr}"`,
    `"Total Registered Athletes",${enrichedMembers.length}`,
    `"Active Members Count",${activeCount}`,
    `"Expiring Soon Members",${expiringSoonCount}`,
    `"Expired / Overdue Members",${expiredCount}`,
    `"TOTAL REVENUE COLLECTED","${currency} ${totalRevenue.toLocaleString()}"`,
    `"TOTAL OUTSTANDING DUES","${currency} ${totalDues.toLocaleString()}"`,
    '========================================================================',
  ].join('\r\n');

  const finalCsv = `${csvContent}\r\n${summaryBlock}`;

  // Trigger download with UTF-8 BOM for Microsoft Excel compatibility
  const blob = new Blob(['\uFEFF' + finalCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateTag = format(new Date(), 'yyyy-MM-dd');
  link.setAttribute('download', `fit-thetic-members-report-${dateTag}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports payments ledger to Excel-compatible CSV with:
 * - Member details & plan
 * - Amount, payment method, reference, notes
 * - Total revenue aggregate at the bottom
 */
export function exportPaymentsToExcelCSV(
  enrichedPayments: EnrichedPayment[],
  settings: GymSettings
) {
  const currency = settings.currency || 'Rs.';
  const nowStr = format(new Date(), 'dd MMM yyyy, hh:mm a');

  const paymentRows = enrichedPayments.map((p) => ({
    'Payment ID': p.id,
    'Member Code': p.member?.member_code || 'N/A',
    'Member Name': p.member?.full_name || 'N/A',
    'Member Phone': p.member?.phone || 'N/A',
    'Plan Name': p.membership?.plan_id || 'N/A',
    'Payment Date': p.payment_date,
    'Amount Paid': `${currency} ${p.amount.toLocaleString()}`,
    'Payment Method': p.payment_method.toUpperCase(),
    'Transaction Reference': p.transaction_reference || 'N/A',
    'Notes': p.notes || '',
  }));

  const totalRevenue = enrichedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

  const csvContent = Papa.unparse(paymentRows);

  const summaryBlock = [
    '',
    '',
    '======================= PAYMENTS REVENUE SUMMARY =======================',
    `"Gym Name","${settings.gym_name || 'Fit-Thetic Fitness Club'}"`,
    `"Report Generated Date","${nowStr}"`,
    `"Total Transactions Recorded",${enrichedPayments.length}`,
    `"TOTAL REVENUE COLLECTED","${currency} ${totalRevenue.toLocaleString()}"`,
    '========================================================================',
  ].join('\r\n');

  const finalCsv = `${csvContent}\r\n${summaryBlock}`;

  const blob = new Blob(['\uFEFF' + finalCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateTag = format(new Date(), 'yyyy-MM-dd');
  link.setAttribute('download', `fit-thetic-payments-report-${dateTag}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
