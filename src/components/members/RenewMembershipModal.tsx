import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useGym } from '@/context/GymContext';
import { useToast } from '@/components/ui/Toast';
import { EnrichedMember, PaymentMethod, Receipt, EnrichedReceipt } from '@/types/database';
import { format, addDays } from 'date-fns';
import { RotateCw, CreditCard, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';

export interface RenewMembershipModalProps {
  member: EnrichedMember | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdReceipt?: Receipt, enrichedReceipt?: EnrichedReceipt) => void;
}

export const RenewMembershipModal: React.FC<RenewMembershipModalProps> = ({
  member,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { plans, renewMembership, settings } = useGym();
  const { showToast } = useToast();

  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isEndDateOverridden, setIsEndDateOverridden] = useState(false);
  const [amountOverride, setAmountOverride] = useState<number>(0);

  // Payment
  const [collectPaymentNow, setCollectPaymentNow] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (member) {
      const plan = member.current_plan || plans[0];
      if (plan) {
        setSelectedPlanId(plan.id);
        setAmountOverride(plan.price);

        // Strict consecutive renewal date
        let start = format(new Date(), 'yyyy-MM-dd');
        if (member.current_membership) {
          const prevEnd = new Date(member.current_membership.end_date);
          start = format(addDays(prevEnd, 1), 'yyyy-MM-dd');
        }

        setStartDate(start);
        setEndDate(format(addDays(new Date(start), plan.duration_days), 'yyyy-MM-dd'));
      }
    }
  }, [member, plans, isOpen]);

  // Recalculate end date on plan or start date change
  useEffect(() => {
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (plan && startDate && !isEndDateOverridden) {
      setEndDate(format(addDays(new Date(startDate), plan.duration_days), 'yyyy-MM-dd'));
      setAmountOverride(plan.price);
    }
  }, [selectedPlanId, startDate, plans, isEndDateOverridden]);

  if (!member) return null;

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setAmountOverride(plan.price);
      if (startDate) {
        setEndDate(format(addDays(new Date(startDate), plan.duration_days), 'yyyy-MM-dd'));
      }
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (plan && val) {
      setEndDate(format(addDays(new Date(val), plan.duration_days), 'yyyy-MM-dd'));
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!startDate || !endDate) return;

    setIsSubmitting(true);
    try {
      const { receipt, enrichedReceipt } = await renewMembership(
        member.id,
        selectedPlanId,
        startDate,
        endDate,
        amountOverride,
        collectPaymentNow
          ? {
              method: paymentMethod,
              amount: amountOverride,
              ref: paymentRef.trim() || undefined,
              notes: paymentNotes.trim() || undefined,
            }
          : undefined
      );

      try {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      } catch (e) {}

      showToast('Membership Renewed', `New period activated for ${member.full_name}`);
      onClose();
      if (onSuccess) onSuccess(receipt, enrichedReceipt);
    } catch (err: any) {
      showToast('Renewal Failed', err.message || 'Error renewing membership', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currency = settings.currency || 'Rs.';

  const modalFooter = (
    <>
      <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button
        type="button"
        variant="primary"
        size="sm"
        leftIcon={<RotateCw className="h-4 w-4" />}
        isLoading={isSubmitting}
        onClick={() => handleSubmit()}
      >
        Confirm & Activate Renewal
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Renew Member Membership"
      description={`Creating new membership period for ${member.full_name} (${member.member_code})`}
      maxWidth="xl"
      footer={modalFooter}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Previous Plan Snapshot */}
        <div className="bg-secondary/40 p-3 rounded-xl border border-border/80 text-xs flex items-center justify-between">
          <div>
            <span className="text-muted-foreground">Previous Plan: </span>
            <span className="font-semibold text-foreground">{member.current_plan?.name || 'N/A'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Expiry Date: </span>
            <span className="font-semibold text-foreground font-mono">{member.current_membership?.end_date || 'N/A'}</span>
          </div>
        </div>

        {/* Plan & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Select
            label="Renewal Plan *"
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
            options={plans.map((p) => ({
              value: p.id,
              label: `${p.name} — ${currency} ${p.price.toLocaleString()} (${p.duration_days}d)`,
            }))}
          />

          <Input
            label={`Plan Amount (${currency}) *`}
            type="number"
            value={amountOverride}
            onChange={(e) => setAmountOverride(Number(e.target.value))}
          />

          <Input
            label="Renewal Start Date *"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <Input
            label="Renewal Expiry Date *"
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setIsEndDateOverridden(true);
            }}
            helperText={isEndDateOverridden ? 'Manual override applied' : 'Auto-calculated'}
          />
        </div>

        {/* Immediate Payment collection */}
        <div className="pt-2 border-t border-border/60 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" /> Collect Renewal Fee Now
            </h4>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
              <input
                type="checkbox"
                checked={collectPaymentNow}
                onChange={(e) => setCollectPaymentNow(e.target.checked)}
                className="rounded border-border text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              Record Payment
            </label>
          </div>

          {collectPaymentNow && (
            <div className="bg-secondary/40 p-3.5 rounded-xl border border-border/80 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
              <Select
                label="Payment Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                options={[
                  { value: 'cash', label: 'Cash Payment' },
                  { value: 'easypaisa', label: 'Easypaisa Transfer' },
                  { value: 'jazzcash', label: 'JazzCash Transfer' },
                  { value: 'bank_transfer', label: 'Bank Account Transfer' },
                  { value: 'other', label: 'Other Method' },
                ]}
              />

              <Input
                label="Transaction Ref / Slip #"
                placeholder="e.g. EP-881920 (optional)"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />

              <div className="sm:col-span-2">
                <Input
                  label="Notes"
                  placeholder="e.g. Paid in full for renewal period."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};
