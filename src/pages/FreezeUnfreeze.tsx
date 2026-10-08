import React, { useState, useMemo } from 'react';
import { useGym } from '@/context/GymContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { FreezeMemberModal } from '@/components/members/FreezeMemberModal';
import { UnfreezeMemberModal } from '@/components/members/UnfreezeMemberModal';
import { ReceiptModal } from '@/components/receipts/ReceiptModal';
import { EnrichedMember, EnrichedReceipt, Receipt } from '@/types/database';
import {
  Snowflake,
  Play,
  Search,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  MessageSquare,
  Filter,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export interface FreezeUnfreezeProps {
  onSelectMemberDetail: (memberId: string) => void;
  searchQueryProp?: string;
}

export const FreezeUnfreeze: React.FC<FreezeUnfreezeProps> = ({
  onSelectMemberDetail,
  searchQueryProp = '',
}) => {
  const { 
    enrichedMembers, 
    plans, 
    settings, 
    stats,
    getWhatsAppShareUrl,
    enrichedReceipts,
    getEnrichedReceipt,
  } = useGym();

  const [searchQuery, setSearchQuery] = useState(searchQueryProp);
  const [statusFilter, setStatusFilter] = useState<'all' | 'frozen' | 'active' | 'expired'>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  // Modals state
  const [freezeMemberTarget, setFreezeMemberTarget] = useState<EnrichedMember | null>(null);
  const [unfreezeMemberTarget, setUnfreezeMemberTarget] = useState<EnrichedMember | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<EnrichedReceipt | null>(null);

  const currency = settings.currency || 'Rs.';

  const handleCreatedReceipt = (receipt?: Receipt, enriched?: EnrichedReceipt) => {
    if (enriched) {
      setActiveReceipt(enriched);
    } else if (receipt) {
      const enc = enrichedReceipts.find((r) => r.id === receipt.id) || getEnrichedReceipt(receipt);
      if (enc) {
        setActiveReceipt(enc);
      }
    }
  };

  // Filtered members calculation
  const filteredMembers = useMemo(() => {
    return enrichedMembers.filter((member) => {
      // Exclude soft-deleted members
      if (member.deleted_at) return false;

      // Status filter
      if (statusFilter === 'frozen' && member.status !== 'frozen') return false;
      if (statusFilter === 'active' && (member.status !== 'active' || member.timing_status === 'expired')) return false;
      if (statusFilter === 'expired' && (member.timing_status !== 'expired' || member.status === 'frozen')) return false;

      // Plan filter
      if (planFilter !== 'all' && member.current_membership?.plan_id !== planFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = member.full_name.toLowerCase().includes(q);
        const codeMatch = member.member_code.toLowerCase().includes(q);
        const phoneMatch = member.phone.toLowerCase().includes(q);
        const planMatch = member.current_plan?.name.toLowerCase().includes(q);
        return nameMatch || codeMatch || phoneMatch || planMatch;
      }

      return true;
    });
  }, [enrichedMembers, statusFilter, planFilter, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 sm:p-6 rounded-2xl border border-border/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#00B0F4]/15 border border-[#00B0F4]/30 text-[#00B0F4]">
              <Snowflake className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                Freeze & Unfreeze Management
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Put subscriptions on temporary hold for athletes taking a break and reactivate them with fresh billing cycles.
              </p>
            </div>
          </div>
        </div>

        {/* Quick helper tip */}
        <div className="flex items-center gap-2 text-xs bg-secondary/50 border border-border/60 px-3.5 py-2 rounded-xl text-muted-foreground">
          <Sparkles className="h-4 w-4 text-[#00B0F4] shrink-0" />
          <span>
            Frozen hiatus time is <strong>automatically skipped</strong> when unfreezing.
          </span>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card 
          className={`p-4 cursor-pointer transition-all border ${statusFilter === 'all' ? 'border-[#5865F2] bg-[#5865F2]/10' : 'hover:border-border'}`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">All Registered</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-extrabold text-foreground mt-2">{stats.allRegisteredMembers}</p>
          <span className="text-[11px] text-muted-foreground">Total gym members</span>
        </Card>

        <Card 
          className={`p-4 cursor-pointer transition-all border ${statusFilter === 'frozen' ? 'border-[#00B0F4] bg-[#00B0F4]/15 shadow-sm' : 'hover:border-[#00B0F4]/40 bg-[#00B0F4]/5'}`}
          onClick={() => setStatusFilter('frozen')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#00B0F4]">Currently Frozen</span>
            <Snowflake className="h-4 w-4 text-[#00B0F4]" />
          </div>
          <p className="text-2xl font-extrabold text-[#00B0F4] mt-2">{stats.frozenCount || 0}</p>
          <span className="text-[11px] text-[#00B0F4]/80">Dues paused & hold active</span>
        </Card>

        <Card 
          className={`p-4 cursor-pointer transition-all border ${statusFilter === 'active' ? 'border-emerald-500 bg-emerald-500/10' : 'hover:border-border'}`}
          onClick={() => setStatusFilter('active')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400">Active Members</span>
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-foreground mt-2">{stats.validActiveMembers}</p>
          <span className="text-[11px] text-muted-foreground">Valid training pass</span>
        </Card>

        <Card 
          className={`p-4 cursor-pointer transition-all border ${statusFilter === 'expired' ? 'border-rose-500 bg-rose-500/10' : 'hover:border-border'}`}
          onClick={() => setStatusFilter('expired')}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400">Expired Total</span>
            <AlertCircle className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-extrabold text-foreground mt-2">{stats.expiredCount}</p>
          <span className="text-[11px] text-muted-foreground">Overdue subscriptions</span>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search member by name, phone, or GYM code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          {/* Quick Filter Status Pills & Plan Select */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
            <div className="flex items-center bg-secondary/60 p-1 rounded-xl border border-border/60 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-[#5865F2] text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({stats.allRegisteredMembers})
              </button>
              <button
                onClick={() => setStatusFilter('frozen')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'frozen'
                    ? 'bg-[#00B0F4] text-white shadow-sm'
                    : 'text-[#00B0F4] hover:bg-[#00B0F4]/10'
                }`}
              >
                <Snowflake className="h-3 w-3" />
                Frozen ({stats.frozenCount || 0})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  statusFilter === 'active'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Active ({stats.validActiveMembers})
              </button>
              <button
                onClick={() => setStatusFilter('expired')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  statusFilter === 'expired'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Expired ({stats.expiredCount})
              </button>
            </div>

            {/* Plan Filter */}
            <div className="w-full sm:w-48">
              <Select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="text-xs"
              >
                <option value="all">All Plans</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Member Table or Empty State */}
      {filteredMembers.length === 0 ? (
        <EmptyState
          icon={<Snowflake className="h-10 w-10 text-muted-foreground" />}
          title={
            statusFilter === 'frozen'
              ? 'No Frozen Members Found'
              : 'No Members Match Your Criteria'
          }
          description={
            statusFilter === 'frozen'
              ? 'There are currently no members on freeze or temporary hiatus. All active members are training normally.'
              : 'Try clearing your search query or changing the filter criteria.'
          }
          actionText={searchQuery || statusFilter !== 'all' || planFilter !== 'all' ? 'Reset All Filters' : undefined}
          onAction={
            searchQuery || statusFilter !== 'all' || planFilter !== 'all'
              ? () => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setPlanFilter('all');
                }
              : undefined
          }
        />
      ) : (
        <>
          {/* ================= DESKTOP TABLE VIEW ================= */}
          <div className="hidden md:block rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40">
                  <TableHead className="w-[110px]">Member ID</TableHead>
                  <TableHead>Member Details</TableHead>
                  <TableHead>Current Plan</TableHead>
                  <TableHead>Membership Status</TableHead>
                  <TableHead>Hold / Freeze State</TableHead>
                  <TableHead className="text-right">Freeze Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow
                    key={member.id}
                    className={`hover:bg-secondary/30 transition-colors ${
                      member.status === 'frozen' ? 'bg-[#00B0F4]/5' : ''
                    }`}
                  >
                    {/* Member Code */}
                    <TableCell className="font-mono text-xs font-bold text-emerald-400">
                      {member.member_code}
                    </TableCell>

                    {/* Full Name & Phone */}
                    <TableCell>
                      <div>
                        <button
                          onClick={() => onSelectMemberDetail(member.id)}
                          className="font-bold text-foreground hover:text-emerald-400 transition-colors text-left block"
                        >
                          {member.full_name}
                        </button>
                        <span className="text-xs text-muted-foreground font-mono">
                          {member.phone}
                        </span>
                      </div>
                    </TableCell>

                    {/* Current Plan */}
                    <TableCell>
                      <div className="text-xs">
                        <span className="font-medium text-foreground block">
                          {member.current_plan?.name || 'No Active Plan'}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {member.current_plan ? `${currency} ${member.current_plan.price.toLocaleString()}` : '—'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Membership Status */}
                    <TableCell>
                      {member.status === 'frozen' ? (
                        <Badge variant="frozen" size="sm" dot>
                          Frozen (Hold)
                        </Badge>
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
                        >
                          {member.timing_status === 'expired' ? 'Expired' : member.timing_status.replace('_', ' ')}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Hold / Freeze Detail State */}
                    <TableCell>
                      {member.status === 'frozen' ? (
                        <div className="space-y-0.5 text-xs">
                          <span className="text-[#00B0F4] font-semibold flex items-center gap-1">
                            <Snowflake className="h-3 w-3" />
                            {member.frozen_reason || 'Temporary break'}
                          </span>
                          {member.frozen_at && (
                            <span className="text-[10px] text-muted-foreground block">
                              Frozen on: {member.frozen_at.split('T')[0]}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {member.current_membership
                            ? `Valid until ${member.current_membership.end_date}`
                            : 'No active subscription'}
                        </span>
                      )}
                    </TableCell>

                    {/* Action Column: Freeze or Unfreeze */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {member.status === 'frozen' ? (
                          <Button
                            variant="primary"
                            size="xs"
                            leftIcon={<Play className="h-3.5 w-3.5 fill-white" />}
                            onClick={() => setUnfreezeMemberTarget(member)}
                            className="bg-[#00B0F4] hover:bg-[#009CDA] text-white font-bold shadow-sm"
                            title="Unfreeze member, skip hiatus month, and start new subscription"
                          >
                            Unfreeze & Start Plan
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="xs"
                            leftIcon={<Snowflake className="h-3.5 w-3.5 text-[#00B0F4]" />}
                            onClick={() => setFreezeMemberTarget(member)}
                            className="border-[#00B0F4]/40 text-[#00B0F4] hover:bg-[#00B0F4]/15 font-semibold"
                            title="Put member on hold / pause dues and reminders"
                          >
                            Freeze Member
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="xs"
                          leftIcon={<Eye className="h-3 w-3" />}
                          onClick={() => onSelectMemberDetail(member.id)}
                          className="text-muted-foreground hover:text-foreground"
                          title="View member profile"
                        >
                          Profile
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ================= MOBILE CARDS VIEW ================= */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredMembers.map((member) => (
              <Card 
                key={member.id} 
                className={`p-4 space-y-3 ${
                  member.status === 'frozen' ? 'border-[#00B0F4]/40 bg-[#00B0F4]/5' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {member.member_code}
                      </span>
                      {member.status === 'frozen' ? (
                        <Badge variant="frozen" size="sm" dot>
                          Frozen
                        </Badge>
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
                        >
                          {member.timing_status === 'expired' ? 'Expired' : member.timing_status.replace('_', ' ')}
                        </Badge>
                      )}
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
                    <span className="text-xs font-bold text-foreground block">
                      {member.current_plan?.name || 'No Plan'}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {member.current_plan ? `${currency} ${member.current_plan.price.toLocaleString()}` : '—'}
                    </span>
                  </div>
                </div>

                {member.status === 'frozen' ? (
                  <div className="text-xs bg-[#00B0F4]/10 border border-[#00B0F4]/20 p-2.5 rounded-lg text-[#00B0F4] space-y-1">
                    <div className="flex justify-between items-center font-bold">
                      <span className="flex items-center gap-1">
                        <Snowflake className="h-3.5 w-3.5" />
                        Frozen: {member.frozen_reason || 'On Hold'}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider bg-[#00B0F4]/20 px-1.5 py-0.5 rounded">
                        Dues Paused
                      </span>
                    </div>
                    {member.frozen_at && (
                      <p className="text-[10px] text-muted-foreground">
                        Frozen on {member.frozen_at.split('T')[0]}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-xs bg-secondary/40 p-2 rounded-lg text-muted-foreground flex justify-between">
                    <span>
                      {member.current_membership
                        ? `Valid until: ${member.current_membership.end_date}`
                        : 'No active membership'}
                    </span>
                    <span>
                      {member.days_remaining >= 0 ? `${member.days_remaining}d left` : 'Expired'}
                    </span>
                  </div>
                )}

                {/* Mobile Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onSelectMemberDetail(member.id)}
                    className="text-xs"
                  >
                    View Profile
                  </Button>

                  {member.status === 'frozen' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Play className="h-3.5 w-3.5 fill-white" />}
                      onClick={() => setUnfreezeMemberTarget(member)}
                      className="bg-[#00B0F4] hover:bg-[#009CDA] text-white font-bold"
                    >
                      Unfreeze & Start Plan
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Snowflake className="h-3.5 w-3.5 text-[#00B0F4]" />}
                      onClick={() => setFreezeMemberTarget(member)}
                      className="border-[#00B0F4]/40 text-[#00B0F4] hover:bg-[#00B0F4]/10 font-semibold"
                    >
                      Freeze Member
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Modals for Freeze & Unfreeze Actions */}
      <FreezeMemberModal
        member={freezeMemberTarget}
        isOpen={Boolean(freezeMemberTarget)}
        onClose={() => setFreezeMemberTarget(null)}
      />

      <UnfreezeMemberModal
        member={unfreezeMemberTarget}
        isOpen={Boolean(unfreezeMemberTarget)}
        onClose={() => setUnfreezeMemberTarget(null)}
        onSuccess={handleCreatedReceipt}
      />

      <ReceiptModal
        receipt={activeReceipt}
        isOpen={Boolean(activeReceipt)}
        onClose={() => setActiveReceipt(null)}
      />
    </div>
  );
};
