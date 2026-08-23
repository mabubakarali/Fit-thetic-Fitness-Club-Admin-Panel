import { Member } from '@/types/database';

/**
 * Generates the next sequential Member Code (e.g. GYM-0001, GYM-0002, etc.)
 * based on all existing members to prevent duplicate assignment.
 */
export function generateNextMemberCode(existingMembers: Member[]): string {
  let highestSeq = 0;

  for (const m of existingMembers) {
    if (m.member_code) {
      // Matches pattern GYM-XXXX or GYMXXXX
      const match = m.member_code.match(/GYM-?(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > highestSeq) {
          highestSeq = num;
        }
      }
    }
  }

  const nextSeq = highestSeq + 1;
  return `GYM-${String(nextSeq).padStart(4, '0')}`;
}
