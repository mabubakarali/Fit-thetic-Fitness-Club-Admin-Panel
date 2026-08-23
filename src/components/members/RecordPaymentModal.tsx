import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useGym } from '@/context/GymContext';
import { useToast } from '@/components/ui/Toast';
import { EnrichedMember, PaymentMethod, Receipt, EnrichedReceipt } from '@/types/database';
import { format, addDays } from 'date-fns';
import { DollarSign, Search, UserCheck, RotateCw } from 'lucide-react';
import confetti from 'canvas-confetti';

export interface RecordPaymentModalProps {
  initialMember?: EnrichedMember | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdReceipt: Receipt, enrichedReceipt?: EnrichedReceipt) => void;
  initialMode?: 'pay_due' | 'extend';
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  initialMember,
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'pay_due',
}) => {
  const { enrichedMembers, plans, recordPayment, renewMembership, settings } = useGym();
  const { showToast } = useToast();

  const [selectedMemberId, setSelectedMemberId] = useState(initialMember?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [memberListTab, setMemberListTab] = useState<'unpaid' | 'all'>('unpaid');
  const [paymentMode, setPaymentMode] = useState<'pay_due' | 'extend'>(initialMode);

  // Plan & Period Details
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');

  // Payment Details
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingMember, setIsChangingMember] = useState(false);

  // Selected member resolution
  const currentMember = enrichedMembers.find((m) => m.id === selectedMemberId) || null;
  const isMemberExpired = currentMember?.timing_status === 'expired';

  // Reset/sync when modal opens or initialMember changes
  useEffect(() => {
    if (isOpen) {
      if (initialMember) {
        setSelectedMemberId(initialMember.id);
        setIsChangingMember(false);
      } else {
        setSelectedMemberId('');
        setIsChangingMember(true);
      }
      setSearchQuery('');
    }
  }, [isOpen, initialMember]);

  // When a member is selected, configure plan, consecutive cycle dates, and amount
  useEffect(() => {
    if (currentMember) {
      const defaultPlan = currentMember.current_plan || plans[0];
      const planToUse = plans.find((p) => p.id === selectedPlanId) || defaultPlan;
      if (planToUse && (!selectedPlanId || !plans.some((p) => p.id === selectedPlanId))) {
        setSelectedPlanId(planToUse.id);
      }

      // Calculate consecutive start date from previous expiry
      let calcStart = format(new Date(), 'yyyy-MM-dd');
      if (currentMember.current_membership) {
        const prevEnd = new Date(currentMember.current_membership.end_date);
        calcStart = format(addDays(prevEnd, 1), 'yyyy-MM-dd');
      }
      setStartDate(calcStart);

      if (planToUse) {
        setEndDate(format(addDays(new Date(calcStart), planToUse.duration_days), 'yyyy-MM-dd'));
      }

      // If member is expired, they must renew for the consecutive period
      if (currentMember.timing_status === 'expired') {
        setPaymentMode('extend');
        setAmount(planToUse?.price || 2500);
      } else if (currentMember.is_unpaid && currentMember.balance_due > 0) {
        setPaymentMode('pay_due');
        setAmount(currentMember.balance_due);
      } else {
        setPaymentMode('extend');
        setAmount(planToUse?.price || 2500);
      }
    }
  }, [selectedMemberId, currentMember, plans]);

  // When selected plan changes, recalculate end date and amount
  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setEndDate(format(addDays(new Date(startDate), plan.duration_days), 'yyyy-MM-dd'));
      setAmount(plan.price);
    }
  };

  // Filter members for selection
  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return enrichedMembers.filter((m) => {
      const matchesSearch =
        m.full_name.toLowerCase().includes(q) ||
        m.member_code.toLowerCase().includes(q) ||
        m.phone.includes(q);

      if (!matchesSearch) return false;
      if (memberListTab === 'unpaid') {
        return m.is_unpaid || m.timing_status === 'expired';
      }
      return true;
    });
  }, [enrichedMembers, searchQuery, memberListTab]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!currentMember) {
      showToast('Error', 'Please select a member first.', 'error');
      return;
    }

    if (amount <= 0) {
      showToast('Invalid Amount', 'Payment amount must be greater than 0', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let createdReceipt: Receipt | undefined;
      let enrichedReceipt: EnrichedReceipt | undefined;
      const plan = plans.find((p) => p.id === selectedPlanId) || plans[0];

      if (isMemberExpired || paymentMode === 'extend') {
        const res = await renewMembership(
          currentMember.id,
          plan.id,
          startDate,
          endDate,
          amount,
          {
            method: paymentMethod,
            amount,
            ref: reference.trim() || undefined,
            notes: notes.trim() || `Renewal for ${plan.name} (${startDate} to ${endDate})`,
          }
        );
        createdReceipt = res.receipt;
        enrichedReceipt = res.enrichedReceipt;
        showToast(
          'Membership Renewed & Paid',
          `New cycle active from ${startDate} to ${endDate}. Receipt #${createdReceipt?.receipt_number || ''}`
        );
      } else {
        if (!currentMember.current_membership) {
          showToast('Error', 'Member has no membership record to record payment against', 'error');
          setIsSubmitting(false);
          return;
        }

        const res = await recordPayment(
          currentMember.id,
          currentMember.current_membership.id,
          amount,
          paymentMethod,
          paymentDate,
          reference.trim() || undefined,
          notes.trim() || undefined
        );
        createdReceipt = res.receipt;
        enrichedReceipt = res.enrichedReceipt;
        showToast('Payment Recorded', `Receipt #${createdReceipt.receipt_number} issued for ${currentMember.full_name}`);
      }

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch (e) {}

      onClose();
      if (onSuccess && createdReceipt) onSuccess(createdReceipt, enrichedReceipt);
    } catch (err: any) {
      showToast('Payment Failed', err.message || 'Error recording payment', 'error');
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
        leftIcon={<DollarSign className="h-4 w-4 text-white" />}
        isLoading={isSubmitting}
        disabled={!currentMember}
        onClick={() => handleSubmit()}
      >
        {isMemberExpired
          ? 'Confirm Renewal & Issue Receipt'
          : paymentMode === 'extend'
          ? 'Extend Plan & Issue Receipt'
          : 'Confirm Payment & Issue Receipt'}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isMemberExpired
          ? 'Renew Expired Membership'
          : paymentMode === 'extend'
          ? 'Extend Membership for Next Cycle'
          : 'Record Member Payment'
      }
      description={
        isMemberExpired
          ? `Reactivating ${currentMember?.full_name || 'member'}. Starts consecutively from day after expiry.`
          : 'Record fee payment, select membership plans, and generate official receipt.'
      }
      maxWidth="lg"
      footer={modalFooter}
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* ================= STEP 1: MEMBER SELECTION ================= */}
        {(!currentMember || isChangingMember) ? (
          <div className="space-y-2.5 bg-[#2B2D31] p-3 rounded-md border border-[#1E1F22]">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#B5BAC1]">
                Select Member *
              </label>
              {currentMember && (
                <button
                  type="button"
                  onClick={() => setIsChangingMember(false)}
                  className="text-xs text-[#949BA4] hover:text-[#DBDEE1]"
                >
                  Keep Selected
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setMemberListTab('unpaid')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  memberListTab === 'unpaid'
                    ? 'bg-[#DA373C] text-white'
                    : 'bg-[#1E1F22] text-[#949BA4] hover:text-[#DBDEE1]'
                }`}
              >
                Unpaid / Expired Due ({enrichedMembers.filter((m) => m.is_unpaid || m.timing_status === 'expired').length})
              </button>
              <button
                type="button"
                onClick={() => setMemberListTab('all')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  memberListTab === 'all'
                    ? 'bg-[#5865F2] text-white'
                    : 'bg-[#1E1F22] text-[#949BA4] hover:text-[#DBDEE1]'
                }`}
              >
                All Members ({enrichedMembers.length})
              </button>
            </div>

            <div className="relative">
              <Input
                placeholder="Search member name, GYM code, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>

            {/* Member List */}
            <div className="max-h-36 overflow-y-auto rounded border border-[#1E1F22] divide-y divide-[#1E1F22] bg-[#1E1F22]">
              {filteredMembers.length === 0 ? (
                <div className="p-3 text-center text-xs text-[#949BA4]">
                  No members found.
                </div>
              ) : (
                filteredMembers.slice(0, 8).map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => {
                      setSelectedMemberId(m.id);
                      setSearchQuery('');
                      setIsChangingMember(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors hover:bg-[#35373C] cursor-pointer ${
                      selectedMemberId === m.id ? 'bg-[#404249] font-bold text-white' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#F2F3F5]">{m.full_name}</span>
                        <span className="font-mono text-[11px] text-[#5865F2]">({m.member_code})</span>
                      </div>
                      <p className="text-[11px] text-[#949BA4] font-mono">{m.phone} • {m.current_plan?.name || 'Standard'}</p>
                    </div>

                    <div className="text-right">
                      {m.timing_status === 'expired' ? (
                        <Badge variant="expired" size="sm">
                          Due: {currency} {m.balance_due.toLocaleString()}
                        </Badge>
                      ) : m.is_unpaid ? (
                        <Badge variant="unpaid" size="sm">
                          Due: {currency} {m.balance_due.toLocaleString()}
                        </Badge>
                      ) : (
                        <Badge variant="paid" size="sm">
                          Paid
                        </Badge>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Selected Member Summary Card */
          <div className="bg-[#2B2D31] p-3 rounded-md border border-[#1E1F22] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#5865F2] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-white">{currentMember.full_name}</p>
                    <span className="font-mono text-[11px] font-bold text-[#5865F2]">{currentMember.member_code}</span>
                  </div>
                  <p className="text-[11px] text-[#949BA4] font-mono">
                    {currentMember.phone}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setIsChangingMember(true)}
                className="text-xs text-[#949BA4] hover:text-white"
              >
                Change Member
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1E1F22] text-xs">
              <div>
                <span className="text-[#949BA4] block text-[10px] uppercase font-bold">Plan</span>
                <span className="font-semibold text-white truncate block">{currentMember.current_plan?.name || 'Standard'}</span>
              </div>
              <div>
                <span className="text-[#949BA4] block text-[10px] uppercase font-bold">Expiry Date</span>
                <span className="font-mono font-medium text-white">{currentMember.current_membership?.end_date || 'N/A'}</span>
              </div>
              <div className="text-right">
                <span className="text-[#949BA4] block text-[10px] uppercase font-bold">Status</span>
                <span className={`font-bold ${isMemberExpired ? 'text-[#DA373C]' : currentMember.is_unpaid ? 'text-[#F0B232]' : 'text-[#23A55A]'}`}>
                  {isMemberExpired
                    ? 'Expired'
                    : currentMember.is_unpaid
                    ? `Due: ${currency} ${currentMember.balance_due.toLocaleString()}`
                    : 'Paid Active'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: MEMBERSHIP PLAN & DATES ================= */}
        {currentMember && (
          <>
            {/* If member is NOT expired, let admin choose Pay Due vs Extend Next Cycle */}
            {!isMemberExpired && (
              <div className="flex bg-[#2B2D31] p-1 rounded-md border border-[#1E1F22] text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMode('pay_due')}
                  className={`flex-1 py-1.5 rounded font-semibold transition-all flex items-center justify-center gap-1 text-xs cursor-pointer ${
                    paymentMode === 'pay_due'
                      ? 'bg-[#5865F2] text-white shadow-sm'
                      : 'text-[#949BA4] hover:text-white'
                  }`}
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  Pay Current Dues
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('extend')}
                  className={`flex-1 py-1.5 rounded font-semibold transition-all flex items-center justify-center gap-1 text-xs cursor-pointer ${
                    paymentMode === 'extend'
                      ? 'bg-[#5865F2] text-white shadow-sm'
                      : 'text-[#949BA4] hover:text-white'
                  }`}
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Extend Next Cycle
                </button>
              </div>
            )}

            {/* Always Available: Membership Plan Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Select
                  label="Membership Plan *"
                  value={selectedPlanId}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  options={plans.map((p) => ({
                    value: p.id,
                    label: `${p.name} — ${currency} ${p.price.toLocaleString()} (${p.duration_days} days)`,
                  }))}
                />
              </div>

              {/* Consecutive Start & End Dates (For Expired or Extending Members) */}
              {(isMemberExpired || paymentMode === 'extend') && (
                <>
                  <Input
                    label="Cycle Start Date *"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      const p = plans.find((pl) => pl.id === selectedPlanId);
                      if (p) setEndDate(format(addDays(new Date(e.target.value), p.duration_days), 'yyyy-MM-dd'));
                    }}
                    helperText={
                      currentMember.current_membership
                        ? `Consecutive from ${currentMember.current_membership.end_date}`
                        : undefined
                    }
                  />

                  <Input
                    label="Cycle Expiry Date *"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    helperText="Calculated expiry"
                  />
                </>
              )}

              {/* Payment Details */}
              <Select
                label="Payment Method *"
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
                label={`Amount to Record (${currency}) *`}
                type="number"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="2500"
              />

              <Input
                label="Payment Date *"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />

              <Input
                label="Transaction Ref / Slip #"
                placeholder="e.g. EP-992019 (optional)"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />

              <div className="sm:col-span-2">
                <Input
                  label="Payment Notes"
                  placeholder="e.g. Paid in full at front desk."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};
