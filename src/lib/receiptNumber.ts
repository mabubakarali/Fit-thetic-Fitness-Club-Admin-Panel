import { Receipt } from '@/types/database';

/**
 * Generates the next unique Receipt Number in format GYM-YYYY-00001
 */
export function generateNextReceiptNumber(existingReceipts: Receipt[], year: number = new Date().getFullYear()): string {
  const prefix = `GYM-${year}-`;
  let highestSeq = 0;

  for (const r of existingReceipts) {
    if (r.receipt_number && r.receipt_number.startsWith(prefix)) {
      const part = r.receipt_number.replace(prefix, '');
      const num = parseInt(part, 10);
      if (!isNaN(num) && num > highestSeq) {
        highestSeq = num;
      }
    }
  }

  const nextSeq = highestSeq + 1;
  return `${prefix}${String(nextSeq).padStart(5, '0')}`;
}
