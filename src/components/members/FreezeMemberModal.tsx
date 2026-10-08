import React, { useState } from 'react';
import { useGym } from '@/context/GymContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EnrichedMember } from '@/types/database';
import { Snowflake, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export interface FreezeMemberModalProps {
  member: EnrichedMember | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const FreezeMemberModal: React.FC<FreezeMemberModalProps> = ({
  member,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { freezeMember } = useGym();
  const { showToast } = useToast();

  const [reason, setReason] = useState('Member requested temporary hold / freeze');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!member) return null;

  const handleConfirmFreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await freezeMember(member.id, reason.trim());
      showToast('Membership Frozen', `${member.full_name} is now on hold. Expiry alerts and dues are paused.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      showToast('Freeze Failed', err.message || 'Could not freeze membership', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Freeze Member Account"
      description={`Put ${member.full_name} (${member.member_code}) on temporary hold.`}
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Snowflake className="h-4 w-4 text-cyan-300" />}
            isLoading={isSubmitting}
            onClick={handleConfirmFreeze}
            className="bg-[#00B0F4] hover:bg-[#009CDA] text-white"
          >
            Freeze Membership
          </Button>
        </>
      }
    >
      <form onSubmit={handleConfirmFreeze} className="space-y-4 pt-1 text-xs">
        {/* Info Banner */}
        <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 space-y-2 text-cyan-300">
          <div className="flex items-center gap-2 font-bold text-cyan-400">
            <Snowflake className="h-4 w-4 shrink-0" />
            <span>What happens when frozen:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-cyan-200/90 leading-relaxed">
            <li>Member will <strong>NOT</strong> appear in Expired Members or Unpaid Dues.</li>
            <li>Automatic WhatsApp renewal reminders will be paused.</li>
            <li>When the member returns, you can <strong>Unfreeze</strong> them — the frozen period is skipped and their new cycle starts from the day they resume.</li>
          </ul>
        </div>

        {/* Freeze Reason */}
        <Input
          label="Reason for Freeze / Hold"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Out of city for 1 month, Medical leave, Exam break..."
          helperText="Saved in member history and activity log"
        />
      </form>
    </Modal>
  );
};
