import React, { useState, useMemo } from 'react';
import { useGym } from '@/context/GymContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddMemberModal } from '@/components/members/AddMemberModal';
import { ImportMembersModal } from '@/components/members/ImportMembersModal';
import { RecordPaymentModal } from '@/components/members/RecordPaymentModal';
import { RenewMembershipModal } from '@/components/members/RenewMembershipModal';
import { ReceiptModal } from '@/components/receipts/ReceiptModal';
import { EnrichedMember, EnrichedReceipt, Receipt } from '@/types/database';
import {
  UserPlus,
  FileSpreadsheet,
  Search,
  RotateCw,
  DollarSign,
  Eye,
  Users,
  Download,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { exportMembersToExcelCSV } from '@/lib/exportUtils';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';

export interface MembersProps {
  onSelectMemberDetail: (memberId: string) => void;
  searchQueryProp?: string;
}

export const Members: React.FC<MembersProps> = ({
  onSelectMemberDetail,
  searchQueryProp = '',
}) => {
  const { enrichedMembers, payments, plans, settings, enrichedReceipts, getEnrichedReceipt, deleteMember } = useGym();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState(searchQueryProp);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  React.useEffect(() => {
    if (searchQueryProp !== undefined) {
      setSearchQuery(searchQueryProp);
    }
  }, [searchQueryProp]);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [payMember, setPayMember] = useState<EnrichedMember | null>(null);
  const [payMode, setPayMode] = useState<'pay_due' | 'extend'>('pay_due');
  const [renewMember, setRenewMember] = useState<EnrichedMember | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<EnrichedMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<EnrichedReceipt | null>(null);

  const currency = settings.currency || 'Rs.';

  const handleCreatedReceipt = (receipt?: Receipt, enriched?: EnrichedReceipt) => {
    if (enriched) {
      setActiveReceipt(enriched);
    } else if (receipt) {
      const enc = enrichedReceipts.find((r) => r.id === receipt.id) || getEnrichedReceipt(receipt);
      if (enc) setActiveReceipt(enc);
    }
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setIsDeleting(true);
    try {
      await deleteMember(memberToDelete.id);
      showToast('Member Deleted', `${memberToDelete.full_name} has been permanently deleted.`);
      setMemberToDelete(null);
    } catch (err: any) {
      showToast('Deletion Failed', err.message || 'Error deleting member', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter & Search Logic
  const filteredMembers = useMemo(() => {
    return enrichedMembers
      .filter((m) => {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          m.full_name.toLowerCase().includes(q) ||
          m.member_code.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          (m.email && m.email.toLowerCase().includes(q));

        if (!matchesQuery) return false;

        // Status Filter
        if (statusFilter === 'active') return m.timing_status === 'active';
        if (statusFilter === 'expiring_soon') return m.timing_status === 'expiring_soon';
        if (statusFilter === 'expired') return m.timing_status === 'expired';
        if (statusFilter === 'unpaid') return m.is_unpaid || m.timing_status === 'expired';
        if (statusFilter === 'inactive') return m.status === 'inactive';

        // Plan Filter
        if (planFilter !== 'all') {
          return m.current_membership?.plan_id === planFilter;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'name_asc') {
          return a.full_name.localeCompare(b.full_name);
        }
        if (sortBy === 'days_left') {
          return a.days_remaining - b.days_remaining;
        }
        if (sortBy === 'balance_due') {
          return b.balance_due - a.balance_due;
        }
        return 0;
      });
  }, [enrichedMembers, searchQuery, statusFilter, planFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* ================= PAGE HEADER ================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-500" />
            Member Directory
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage all {enrichedMembers.length} registered gym members, membership plans, extensions, and dues.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => exportMembersToExcelCSV(filteredMembers, payments, settings)}
            title="Download detailed Excel spreadsheet with last payment and validity"
          >
            Export Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<FileSpreadsheet className="h-4 w-4" />}
            onClick={() => setIsImportOpen(true)}
          >
            Import CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => setIsAddOpen(true)}
          >
            Add Member
          </Button>
        </div>
      </div>

      {/* ================= FILTERS & SEARCH BAR ================= */}
      <div className="bg-card p-4 rounded-xl border border-border/80 shadow-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-2 md:col-span-1">
            <Input
              placeholder="Search by name, code, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active Members' },
              { value: 'expiring_soon', label: 'Expiring Soon (≤7d)' },
              { value: 'expired', label: 'Expired Members' },
              { value: 'unpaid', label: 'Unpaid / Arrears' },
              { value: 'inactive', label: 'Deactivated' },
            ]}
          />

          {/* Plan Filter */}
          <Select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Membership Plans' },
              ...plans.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />

          {/* Sort By */}
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={[
              { value: 'newest', label: 'Sort: Newest First' },
              { value: 'oldest', label: 'Sort: Oldest First' },
              { value: 'name_asc', label: 'Sort: Name (A-Z)' },
              { value: 'days_left', label: 'Sort: Expiry (Urgent)' },
              { value: 'balance_due', label: 'Sort: Highest Dues' },
            ]}
          />
        </div>

        {/* Quick Filter Counts */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1E1F22] text-xs">
          <span className="text-[#949BA4] font-medium">Quick filter:</span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#5865F2] text-white'
                : 'bg-[#1E1F22] text-[#949BA4] hover:text-[#DBDEE1] hover:bg-[#35373C]'
            }`}
          >
            All ({enrichedMembers.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-[#23A55A] text-white'
                : 'bg-[#1E1F22] text-[#949BA4] hover:text-[#DBDEE1] hover:bg-[#35373C]'
            }`}
          >
            Active ({enrichedMembers.filter((m) => m.timing_status === 'active').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('expiring_soon')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'expiring_soon'
                ? 'bg-[#F0B232] text-black font-bold'
                : 'bg-[#1E1F22] text-[#949BA4] hover:text-[#DBDEE1] hover:bg-[#35373C]'
            }`}
          >
            Expiring &lt;7d ({enrichedMembers.filter((m) => m.timing_status === 'expiring_soon').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('expired')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'expired'
                ? 'bg-[#DA373C] text-white'
                : 'bg-[#1E1F22] text-[#949BA4] hover:text-[#DBDEE1] hover:bg-[#35373C]'
            }`}
          >
            Expired ({enrichedMembers.filter((m) => m.timing_status === 'expired').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('unpaid')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'unpaid'
                ? 'bg-[#DA373C] text-white'
                : 'bg-[#1E1F22] text-[#949BA4] hover:text-[#DBDEE1] hover:bg-[#35373C]'
            }`}
          >
            Unpaid Dues ({enrichedMembers.filter((m) => m.is_unpaid).length})
          </button>
        </div>
      </div>

      {/* ================= MEMBERS LIST / TABLE ================= */}
      {filteredMembers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10 text-muted-foreground" />}
          title="No Members Found"
          description="Try adjusting your search query or filter options."
          actionText="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setStatusFilter('all');
            setPlanFilter('all');
          }}
        />
      ) : (
        <>
          {/* ================= DESKTOP TABLE ================= */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Member Code</TableHead>
                  <TableHead>Name & Contact</TableHead>
                  <TableHead>Current Plan</TableHead>
                  <TableHead>Validity Period</TableHead>
                  <TableHead>Timing Status</TableHead>
                  <TableHead>Payment State</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono font-bold text-emerald-400 text-xs">
                      {member.member_code}
                    </TableCell>

                    <TableCell>
                      <div>
                        <button
                          onClick={() => onSelectMemberDetail(member.id)}
                          className="font-bold text-foreground hover:text-emerald-400 transition-colors text-left"
                        >
                          {member.full_name}
                        </button>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {member.phone}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-medium">
                      {member.current_plan?.name || 'Standard'}
                    </TableCell>

                    <TableCell className="text-xs">
                      {member.current_membership ? (
                        <div>
                          <span className="font-mono">{member.current_membership.start_date}</span>
                          <span className="text-muted-foreground"> to </span>
                          <span className="font-mono font-medium">{member.current_membership.end_date}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No active plan</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {member.status === 'inactive' ? (
                        <Badge variant="neutral" size="sm">Deactivated</Badge>
                      ) : (
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
                          {member.timing_status === 'expiring_soon'
                            ? `Expiring (${member.days_remaining}d)`
                            : member.timing_status === 'expired'
                            ? 'Expired'
                            : 'Active'}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {member.timing_status === 'expired' ? (
                        <Badge variant="unpaid" size="sm">
                          Expired (Due: {currency} {member.balance_due.toLocaleString()})
                        </Badge>
                      ) : member.is_unpaid ? (
                        <Badge variant="unpaid" size="sm">
                          Due: {currency} {member.balance_due.toLocaleString()}
                        </Badge>
                      ) : (
                        <Badge variant="paid" size="sm">
                          Paid
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="primary"
                          size="xs"
                          leftIcon={member.timing_status === 'expired' || member.is_unpaid ? <DollarSign className="h-3 w-3" /> : <RotateCw className="h-3 w-3" />}
                          onClick={() => {
                            setPayMember(member);
                            setPayMode(member.is_unpaid && member.timing_status !== 'expired' ? 'pay_due' : 'extend');
                          }}
                          title={member.timing_status === 'expired' ? 'Pay renewal fee & activate next cycle' : member.is_unpaid ? 'Pay outstanding balance' : 'Extend membership for next cycle'}
                        >
                          {member.timing_status === 'expired' || member.is_unpaid ? 'Pay Due' : 'Extend Plan'}
                        </Button>

                        <Button
                          variant="outline"
                          size="xs"
                          leftIcon={<Eye className="h-3 w-3" />}
                          onClick={() => onSelectMemberDetail(member.id)}
                        >
                          Profile
                        </Button>

                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2"
                          onClick={() => setMemberToDelete(member)}
                          title="Delete member from database"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ================= MOBILE CARDS LAYOUT ================= */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredMembers.map((member) => (
              <Card key={member.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {member.member_code}
                      </span>
                      <Badge
                        variant={
                          member.timing_status === 'active'
                            ? 'active'
                            : member.timing_status === 'expiring_soon'
                            ? 'expiring'
                            : 'expired'
                        }
                        size="sm"
                      >
                        {member.timing_status === 'expired' ? 'Expired' : member.timing_status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <button
                      onClick={() => onSelectMemberDetail(member.id)}
                      className="text-sm font-bold text-foreground hover:text-emerald-400 transition-colors text-left mt-1 block"
                    >
                      {member.full_name}
                    </button>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {member.phone}
                    </p>
                  </div>

                  <div className="text-right">
                    {member.timing_status === 'expired' || member.is_unpaid ? (
                      <span className="text-xs font-bold text-rose-500 block">
                        Due: {currency} {member.balance_due.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-400 block">
                        Paid Full
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {member.current_plan?.name || 'Standard'}
                    </span>
                  </div>
                </div>

                {member.current_membership && (
                  <div className="text-xs bg-secondary/40 p-2 rounded-lg text-muted-foreground flex justify-between">
                    <span>Valid until: <strong>{member.current_membership.end_date}</strong></span>
                    <span>{member.days_remaining >= 0 ? `${member.days_remaining}d left` : 'Expired'}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/60">
                  <Button
                    variant="primary"
                    size="xs"
                    leftIcon={member.timing_status === 'expired' || member.is_unpaid ? <DollarSign className="h-3 w-3" /> : <RotateCw className="h-3 w-3" />}
                    onClick={() => {
                      setPayMember(member);
                      setPayMode(member.is_unpaid && member.timing_status !== 'expired' ? 'pay_due' : 'extend');
                    }}
                  >
                    {member.timing_status === 'expired' || member.is_unpaid ? 'Pay Due' : 'Extend Plan'}
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => onSelectMemberDetail(member.id)}
                  >
                    Profile
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2"
                    onClick={() => setMemberToDelete(member)}
                    title="Delete member"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      <AddMemberModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={handleCreatedReceipt}
      />

      <ImportMembersModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      <RecordPaymentModal
        initialMember={payMember}
        initialMode={payMode}
        isOpen={Boolean(payMember)}
        onClose={() => setPayMember(null)}
        onSuccess={handleCreatedReceipt}
      />

      <RenewMembershipModal
        member={renewMember}
        isOpen={Boolean(renewMember)}
        onClose={() => setRenewMember(null)}
        onSuccess={handleCreatedReceipt}
      />

      <ReceiptModal
        receipt={activeReceipt}
        isOpen={Boolean(activeReceipt)}
        onClose={() => setActiveReceipt(null)}
      />

      {/* Delete Member Confirmation Modal */}
      <Modal
        isOpen={Boolean(memberToDelete)}
        onClose={() => setMemberToDelete(null)}
        title="Permanently Delete Member"
        description="Are you sure you want to remove this athlete from the system?"
        maxWidth="md"
      >
        {memberToDelete && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Warning: Irreversible Deletion</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Permanently delete <strong>{memberToDelete.full_name}</strong> ({memberToDelete.member_code}) and all related memberships, payments, and receipts from this computer.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setMemberToDelete(null)}
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
                onClick={handleConfirmDelete}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
