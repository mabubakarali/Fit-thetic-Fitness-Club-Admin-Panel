import React, { useState, useEffect } from 'react';
import { useGym } from '@/context/GymContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EnrichedMember, EnrichedReceipt, PaymentMethod, Receipt } from '@/types/database';
import { Play, DollarSign, Calendar, Sparkles, CheckCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useToast } from '@/components/ui/Toast';

export interface UnfreezeMemberModalProps {
  member: EnrichedMember | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (receipt?: Receipt, enriched?: EnrichedReceipt) => void;
}

export const UnfreezeMemberModal: React.FC<UnfreezeMemberModalProps> = ({
  member,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { plans, unfreezeMember, settings } = useGym();
  const { showToast } = useToast();

  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [recordPaymentNow, setRecordPaymentNow] = useState(true);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activePlans = plans.filter((p) => p.is_active && !p.deleted_at);
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || activePlans[0];
  const currency = settings.currency || 'Rs.';

  useEffect(() => {
    if (member) {
      const defaultPlan = member.current_plan || activePlans[0];
      if (defaultPlan) {
        setSelectedPlanId(defaultPlan.id);
        setPayAmount(defaultPlan.price);
      }
      setStartDate(format(new Date(), 'yyyy-MM-dd'));
      setRecordPaymentNow(true);
    }
  }, [member, isOpen]);

  useEffect(() => {
    if (selectedPlan) {
      setPayAmount(selectedPlan.price);
    }
  }, [selectedPlanId]);

  if (!member) return null;

  const durationDays = selectedPlan?.duration_days || 30;
  const calculatedEndDate = format(addDays(new Date(startDate), durationDays), 'yyyy-MM-dd');

  const handleUnfreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await unfreezeMember(member.id, {
        startFreshCycle: true,
        planId: selectedPlan?.id,
        startDate,
        customEndDate: calculatedEndDate,
        amountOverride: selectedPlan?.price,
        immediatePayment: recordPaymentNow && payAmount > 0
          ? {
              method: paymentMethod,
              amount: payAmount,
              ref: reference.trim() || undefined,
              notes: notes.trim() || `Unfreeze reactivation: ${selectedPlan?.name || 'Standard Plan'}`,
            }
          : undefined,
      });

      showToast(
        'Member Reactivated!',
        `${member.full_name} is now active from ${startDate} to ${calculatedEndDate}.`,
        'success'
      );

      if (onSuccess) onSuccess(res.receipt, res.enrichedReceipt);
      onClose();
    } catch (err: any) {
      showToast('Unfreeze Failed', err.message || 'Error reactivating member', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reactivate / Unfreeze Member"
      description={`Resume ${member.full_name} (${member.member_code}). The frozen gap is skipped.`}
      maxWidth="lg"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Play className="h-4 w-4 fill-white" />}
            isLoading={isSubmitting}
            onClick={handleUnfreeze}
          >
            Reactivate & Start New Month
          </Button>
        </>
      }
    >
      <form onSubmit={handleUnfreeze} className="space-y-4 pt-1 text-xs">
        {/* Info Banner */}
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1.5 text-emerald-300">
          <div className="flex items-center gap-2 font-bold text-emerald-400">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>Fresh Billing Cycle Activated</span>
          </div>
          <p className="text-[11px] text-emerald-200/90 leading-relaxed">
            The frozen period is completely skipped. <strong>{member.full_name}</strong>'s new plan starts fresh from today (<strong>{startDate}</strong>) and is valid until <strong>{calculatedEndDate}</strong>.
          </p>
        </div>

        {/* Plan & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Select
            label="Select Membership Plan *"
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            options={activePlans.map((p) => ({
              value: p.id,
              label: `${p.name} — ${currency} ${p.price.toLocaleString()} (${p.duration_days} days)`,
            }))}
          />

          <Input
            label="Reactivation Start Date *"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            helperText={`Calculated Expiry: ${calculatedEndDate}`}
            required
          />
        </div>

        {/* Payment Section */}
        <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="font-bold text-foreground">Record Payment for New Cycle</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recordPaymentNow}
                onChange={(e) => setRecordPaymentNow(e.target.checked)}
                className="rounded border-border text-[#5865F2] focus:ring-[#5865F2]"
              />
              <span className="text-[11px] text-muted-foreground font-medium">Pay Now</span>
            </label>
          </div>

          {recordPaymentNow && (
            <div className="space-y-3 pt-1 border-t border-border/60">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={`Payment Amount (${currency}) *`}
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  required
                />

                <Select
                  label="Payment Method *"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  options={[
                    { value: 'cash', label: 'Cash Payment' },
                    { value: 'easypaisa', label: 'Easypaisa Transfer' },
                    { value: 'jazzcash', label: 'JazzCash Transfer' },
                    { value: 'bank_transfer', label: 'Bank Transfer' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Transaction Ref # (Optional)"
                  placeholder="e.g. EP-99882233"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />

                <Input
                  label="Notes / Comments"
                  placeholder="e.g. Reactivated after 1 month freeze"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};
