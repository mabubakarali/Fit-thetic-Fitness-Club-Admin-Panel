import React, { useState, useEffect } from 'react';
import { useGym } from '@/context/GymContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Member, PaymentMethod, Receipt, EnrichedReceipt } from '@/types/database';
import { SEED_MEMBERSHIP_PLANS } from '@/lib/seedData';
import { format, addDays } from 'date-fns';
import confetti from 'canvas-confetti';
import {
  UserPlus,
  CreditCard,
  Phone,
  User,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (receipt?: Receipt, enrichedReceipt?: EnrichedReceipt) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { plans, addMember, settings, members } = useGym();
  const { showToast } = useToast();

  const availablePlans = plans.length > 0 ? plans : SEED_MEMBERSHIP_PLANS;
  const defaultPlan = availablePlans[0];

  // Member details fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');

  // Membership fields
  const [selectedPlanId, setSelectedPlanId] = useState(defaultPlan.id);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [isEndDateOverridden, setIsEndDateOverridden] = useState(false);

  // Payment fields
  const [collectPaymentNow, setCollectPaymentNow] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentAmount, setPaymentAmount] = useState<number>(defaultPlan.price);
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto calculate end date and amount when plan or start date changes
  useEffect(() => {
    const plan = availablePlans.find((p) => p.id === selectedPlanId) || defaultPlan;
    if (plan && startDate && !isEndDateOverridden) {
      const calculatedEnd = format(addDays(new Date(startDate), plan.duration_days), 'yyyy-MM-dd');
      setEndDate(calculatedEnd);
      setPaymentAmount(plan.price);
    }
  }, [selectedPlanId, startDate, availablePlans, defaultPlan, isEndDateOverridden]);

  // Check phone duplicate
  const isDuplicatePhone =
    phone.trim().length >= 10 &&
    members.some(
      (m) =>
        m.phone.replace(/\D/g, '') === phone.replace(/\D/g, '') ||
        m.phone === phone.trim()
    );

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setEmail('');
    setGender('male');
    setAddress('');
    setEmergencyContact('');
    setNotes('');
    setSelectedPlanId(defaultPlan.id);
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setIsEndDateOverridden(false);
    setCollectPaymentNow(true);
    setPaymentMethod('cash');
    setPaymentAmount(defaultPlan.price);
    setPaymentRef('');
    setPaymentNotes('');
    setErrors({});
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!phone.trim()) newErrors.phone = 'Phone number is required';
    if (!startDate) newErrors.startDate = 'Start date is required';
    if (!endDate) newErrors.endDate = 'End date is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const plan = availablePlans.find((p) => p.id === selectedPlanId) || defaultPlan;

      const { member, receipt, enrichedReceipt } = await addMember(
        {
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          gender: 'male',
          address: address.trim() || undefined,
          emergency_contact: emergencyContact.trim() || undefined,
          notes: notes.trim() || undefined,
          status: 'active',
        },
        plan.id,
        startDate,
        endDate,
        collectPaymentNow && paymentAmount > 0
          ? {
              amount: paymentAmount,
              method: paymentMethod,
              ref: paymentRef.trim() || undefined,
              notes: paymentNotes.trim() || undefined,
            }
          : undefined
      );

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {}

      showToast('Member Registered Successfully', `${member.full_name} assigned Member Code ${member.member_code}`);
      resetForm();
      onClose();
      if (onSuccess) onSuccess(receipt, enrichedReceipt);
    } catch (err: any) {
      showToast('Registration Error', err.message || 'Failed to add member', 'error');
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
        isLoading={isSubmitting}
        onClick={() => handleSubmit()}
      >
        Register &amp; Activate Member
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Member"
      description="Register a new gym athlete, assign a membership plan, and generate initial receipt."
      footer={modalFooter}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Athlete Details */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 border-b border-border/80 pb-2">
            <User className="h-4 w-4 text-[#5865F2]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Athlete Profile
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Full Name *"
              placeholder="e.g. Dawood Janjua"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={errors.fullName}
              required
            />

            <div>
              <Input
                label="WhatsApp / Mobile Phone *"
                placeholder="03001234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={errors.phone}
                required
              />
              {isDuplicatePhone && (
                <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3 w-3 inline" /> Warning: A member with this phone number is already registered.
                </p>
              )}
            </div>

            <Input
              label="Email Address (Optional)"
              type="email"
              placeholder="athlete@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Emergency Contact Phone"
              placeholder="e.g. 03211234567 (Brother)"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
            />

            <div className="sm:col-span-2">
              <Input
                label="Residential Address (Optional)"
                placeholder="e.g. Royal Avenue, Meherban Colony"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Membership Assignment */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 border-b border-border/80 pb-2">
            <Calendar className="h-4 w-4 text-[#5865F2]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Membership Period &amp; Plan
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-1">
              <Select
                label="Select Plan *"
                value={selectedPlanId}
                onChange={(e) => {
                  setSelectedPlanId(e.target.value);
                  setIsEndDateOverridden(false);
                }}
                options={availablePlans
                  .filter((p) => p.is_active)
                  .map((p) => ({
                    value: p.id,
                    label: `${p.name} - ${currency} ${p.price.toLocaleString()}`,
                  }))}
              />
            </div>

            <Input
              label="Start Date *"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setIsEndDateOverridden(false);
              }}
              error={errors.startDate}
              required
            />

            <Input
              label="Expiry / End Date *"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setIsEndDateOverridden(true);
              }}
              error={errors.endDate}
              helperText={isEndDateOverridden ? 'Custom end date set' : 'Auto calculated from plan duration'}
              required
            />
          </div>
        </div>

        {/* Section 3: Initial Payment Collection */}
        <div className="space-y-3.5 rounded-xl bg-[#2B2D31]/40 p-4 border border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-foreground">Initial Payment Collection</h4>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={collectPaymentNow}
                onChange={(e) => setCollectPaymentNow(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-secondary text-[#5865F2] focus:ring-[#5865F2]"
              />
              <span className="font-semibold text-foreground">Collect fee at registration</span>
            </label>
          </div>

          {collectPaymentNow && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 animate-fade-in">
              <Input
                label="Amount Paid *"
                type="number"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                helperText={`Plan Fee: ${currency} ${paymentAmount.toLocaleString()}`}
                required
              />

              <Select
                label="Payment Method *"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'easypaisa', label: 'Easypaisa' },
                  { value: 'jazzcash', label: 'JazzCash' },
                  { value: 'bank_transfer', label: 'Bank Transfer' },
                  { value: 'other', label: 'Other' },
                ]}
              />

              <Input
                label="Ref / Transaction ID (Optional)"
                placeholder="e.g. EP-984392"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />

              <div className="sm:col-span-3">
                <Input
                  label="Payment Notes (Optional)"
                  placeholder="e.g. Paid in full for 1 month"
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
