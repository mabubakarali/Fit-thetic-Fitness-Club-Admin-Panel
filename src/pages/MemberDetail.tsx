import React, { useState } from 'react';
import { useGym } from '@/context/GymContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { RecordPaymentModal } from '@/components/members/RecordPaymentModal';
import { RenewMembershipModal } from '@/components/members/RenewMembershipModal';
import { ReceiptModal } from '@/components/receipts/ReceiptModal';
import { EnrichedReceipt, Receipt } from '@/types/database';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  RotateCw,
  Receipt as ReceiptIcon,
  MessageSquare,
  Clock,
  Send,
  Edit2,
  CheckCircle,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';

export interface MemberDetailProps {
  memberId: string;
  onBack: () => void;
}

export const MemberDetail: React.FC<MemberDetailProps> = ({ memberId, onBack }) => {
  const {
    enrichedMembers,
    plans,
    settings,
    updateMember,
    deleteMember,
    toggleMemberStatus,
    getWhatsAppShareUrl,
    enrichedReceipts,
    getEnrichedReceipt,
  } = useGym();
  const { showToast } = useToast();

  const member = enrichedMembers.find((m) => m.id === memberId);

  // Modals
  const [isRecordPayOpen, setIsRecordPayOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<EnrichedReceipt | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editEmergency, setEditEmergency] = useState('');
  const [editNotes, setEditNotes] = useState('');

  if (!member) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Member record not found.</p>
        <Button variant="outline" onClick={onBack}>
          Back to Directory
        </Button>
      </div>
    );
  }

  const currency = settings.currency || 'Rs.';

  const handleOpenEdit = () => {
    setEditName(member.full_name);
    setEditPhone(member.phone);
    setEditEmail(member.email || '');
    setEditAddress(member.address || '');
    setEditEmergency(member.emergency_contact || '');
    setEditNotes(member.notes || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMember(member.id, {
        full_name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || undefined,
        address: editAddress.trim() || undefined,
        emergency_contact: editEmergency.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });
      showToast('Profile Updated', 'Member details saved successfully.');
      setIsEditModalOpen(false);
    } catch (err: any) {
      showToast('Update Failed', err.message || 'Error updating member', 'error');
    }
  };

  const handleDeleteMember = async () => {
    setIsDeleting(true);
    try {
      await deleteMember(member.id);
      showToast('Member Deleted', `${member.full_name} has been removed from the system.`);
      setIsDeleteModalOpen(false);
      onBack();
    } catch (err: any) {
      showToast('Deletion Failed', err.message || 'Error deleting member', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreatedReceipt = (receipt?: Receipt, enriched?: EnrichedReceipt) => {
    if (enriched) {
      setActiveReceipt(enriched);
    } else if (receipt) {
      const enc = enrichedReceipts.find((r) => r.id === receipt.id) || getEnrichedReceipt(receipt);
      if (enc) setActiveReceipt(enc);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Back Navigation & Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                {member.full_name}
              </h1>
              <span className="font-mono text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                {member.member_code}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Member since {format(new Date(member.created_at), 'MMMM yyyy')}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {member.current_membership && (
            <a
              href={getWhatsAppShareUrl(member.id, member.current_membership.id, '7_days_before')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 border border-emerald-500/30 font-medium transition-colors"
            >
              <Send className="h-3.5 w-3.5" /> WhatsApp Message
            </a>
          )}

          <Button
            variant="primary"
            size="sm"
            leftIcon={<RotateCw className="h-3.5 w-3.5" />}
            onClick={() => setIsRenewOpen(true)}
          >
            {member.timing_status === 'expired' ? 'Renew & Pay Plan' : 'Extend / Renew Plan'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<CreditCard className="h-3.5 w-3.5 text-emerald-500" />}
            onClick={() => setIsRecordPayOpen(true)}
          >
            Record Payment
          </Button>

          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Edit2 className="h-3.5 w-3.5" />}
            onClick={handleOpenEdit}
          >
            Edit
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
            leftIcon={<Trash2 className="h-3.5 w-3.5 text-rose-400" />}
            onClick={() => setIsDeleteModalOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Column Info, Right Column History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ================= LEFT COLUMN: SUMMARY CARDS ================= */}
        <div className="space-y-6">
          {/* Current Membership Card */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Current Membership
              </h3>
              <Badge
                variant={
                  member.timing_status === 'active'
                    ? 'active'
                    : member.timing_status === 'expiring_soon'
                    ? 'expiring'
                    : 'expired'
                }
                size="sm"
                dot
              >
                {member.timing_status.replace('_', ' ')}
              </Badge>
            </div>

            {member.current_membership ? (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Active Plan:</span>
                  <span className="font-bold text-sm text-foreground">
                    {member.current_plan?.name || 'Standard Plan'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Start Date:</span>
                  <span className="font-mono font-medium">{member.current_membership.start_date}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">End Date:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {member.current_membership.end_date}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Days Left:</span>
                  <span className="font-bold">
                    {member.days_remaining < 0
                      ? `Expired ${Math.abs(member.days_remaining)} days ago`
                      : `${member.days_remaining} days remaining`}
                  </span>
                </div>

                {/* Financial Summary */}
                <div className="bg-secondary/50 p-3 rounded-xl border border-border/80 space-y-1.5 pt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan Fee:</span>
                    <span className="font-medium text-foreground">
                      {currency} {member.current_membership.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-bold text-emerald-500">
                      {currency} {member.total_paid_for_current_membership.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border/60 pt-1">
                    <span className="text-muted-foreground font-semibold">Balance Due:</span>
                    <span
                      className={`font-bold ${
                        member.balance_due > 0 ? 'text-rose-500' : 'text-emerald-500'
                      }`}
                    >
                      {currency} {member.balance_due.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No active membership assigned.</p>
            )}
          </Card>

          {/* Personal Information */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Personal Details
              </h3>
              <button
                onClick={handleOpenEdit}
                className="text-xs text-emerald-500 hover:underline flex items-center gap-1 font-medium"
              >
                <Edit2 className="h-3 w-3" /> Edit
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="text-muted-foreground block text-[11px]">Phone Number</span>
                  <span className="font-mono font-semibold text-foreground">{member.phone}</span>
                </div>
              </div>

              {member.email && (
                <div className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Email Address</span>
                    <span className="text-foreground">{member.email}</span>
                  </div>
                </div>
              )}

              {member.address && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Address</span>
                    <span className="text-foreground">{member.address}</span>
                  </div>
                </div>
              )}

              {member.emergency_contact && (
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Emergency Contact</span>
                    <span className="font-medium text-foreground">{member.emergency_contact}</span>
                  </div>
                </div>
              )}

              {member.notes && (
                <div className="p-3 bg-secondary/30 rounded-lg border border-border/60">
                  <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Internal Admin Notes:
                  </span>
                  <p className="text-xs text-foreground italic">{member.notes}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ================= RIGHT COLUMN: TIMELINE & PAYMENTS ================= */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment History Card */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Payment History & Receipts</h3>
                <p className="text-xs text-muted-foreground">All recorded payments for this member</p>
              </div>
              <Button
                variant="secondary"
                size="xs"
                leftIcon={<CreditCard className="h-3 w-3 text-emerald-500" />}
                onClick={() => setIsRecordPayOpen(true)}
              >
                + Record Payment
              </Button>
            </div>

            {member.all_payments.length === 0 ? (
              <EmptyState
                icon={<CreditCard className="h-6 w-6" />}
                title="No Payments Recorded"
                description="No payment transactions recorded for this member yet."
              />
            ) : (
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Receipt #</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {member.all_payments.map((p) => {
                    const rc = member.all_receipts.find((r) => r.payment_id === p.id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.payment_date}</TableCell>
                        <TableCell className="font-bold text-emerald-500 text-xs">
                          {currency} {p.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.payment_method === 'cash' ? 'cash' : 'online'} size="sm">
                            {p.payment_method.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-emerald-400">
                          {rc?.receipt_number || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {rc && (
                            <Button
                              variant="outline"
                              size="xs"
                              leftIcon={<ReceiptIcon className="h-3 w-3" />}
                              onClick={() => {
                                const enc = enrichedReceipts.find((r) => r.id === rc.id);
                                if (enc) setActiveReceipt(enc);
                              }}
                            >
                              Receipt
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>

          {/* Membership History Timeline */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">Membership Periods Timeline</h3>
                <p className="text-xs text-muted-foreground">Historical records and renewals</p>
              </div>
              <Button
                variant="outline"
                size="xs"
                leftIcon={<RotateCw className="h-3 w-3" />}
                onClick={() => setIsRenewOpen(true)}
              >
                + Renew Plan
              </Button>
            </div>

            <div className="space-y-3">
              {member.all_memberships.map((ms, idx) => {
                const plan = plans.find((p) => p.id === ms.plan_id);
                const isLatest = idx === 0;

                return (
                  <div
                    key={ms.id}
                    className={`p-3.5 rounded-xl border transition-all text-xs ${
                      isLatest
                        ? 'bg-secondary/40 border-emerald-500/30'
                        : 'bg-card border-border/60 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{plan?.name || 'Standard'}</span>
                        {isLatest && (
                          <span className="text-[10px] uppercase font-bold bg-emerald-500/15 text-emerald-400 px-1.5 py-0.2 rounded">
                            Latest
                          </span>
                        )}
                      </div>
                      <Badge variant={ms.status === 'active' ? 'active' : 'expired'} size="sm">
                        {ms.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground mt-2 pt-2 border-t border-border/40">
                      <span>
                        Validity: <strong className="font-mono text-foreground">{ms.start_date}</strong> to <strong className="font-mono text-foreground">{ms.end_date}</strong>
                      </span>
                      <span className="font-semibold text-foreground">
                        {currency} {ms.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Member Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Member Information"
        description={`Updating profile for ${member.full_name} (${member.member_code})`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input
            label="Full Name *"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <Input
            label="Phone Number *"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
          />
          <Input
            label="Email Address"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
          />
          <Input
            label="Residential Address"
            value={editAddress}
            onChange={(e) => setEditAddress(e.target.value)}
          />
          <Input
            label="Emergency Contact"
            value={editEmergency}
            onChange={(e) => setEditEmergency(e.target.value)}
          />
          <Input
            label="Notes"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modals */}
      <RecordPaymentModal
        initialMember={member}
        isOpen={isRecordPayOpen}
        onClose={() => setIsRecordPayOpen(false)}
        onSuccess={handleCreatedReceipt}
      />

      <RenewMembershipModal
        member={member}
        isOpen={isRenewOpen}
        onClose={() => setIsRenewOpen(false)}
        onSuccess={handleCreatedReceipt}
      />

      <ReceiptModal
        receipt={activeReceipt}
        isOpen={Boolean(activeReceipt)}
        onClose={() => setActiveReceipt(null)}
      />

      {/* Delete Member Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Permanently Delete Member"
        description="Are you sure you want to delete this athlete from the system?"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Warning: This action cannot be undone</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Deleting <strong>{member.full_name}</strong> ({member.member_code}) will permanently erase all associated records:
            </p>
            <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
              <li>Active & past membership plans</li>
              <li>Complete payment transactions ledger</li>
              <li>Generated receipts and invoices</li>
              <li>WhatsApp reminder dispatch logs</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              leftIcon={<Trash2 className="h-4 w-4" />}
              isLoading={isDeleting}
              onClick={handleDeleteMember}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
