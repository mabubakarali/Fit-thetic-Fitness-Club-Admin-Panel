import React, { useState, useMemo } from 'react';
import { useGym } from '@/context/GymContext';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddMemberModal } from '@/components/members/AddMemberModal';
import { RecordPaymentModal } from '@/components/members/RecordPaymentModal';
import { RenewMembershipModal } from '@/components/members/RenewMembershipModal';
import { ImportMembersModal } from '@/components/members/ImportMembersModal';
import { ReceiptModal } from '@/components/receipts/ReceiptModal';
import { EnrichedMember, EnrichedReceipt, Receipt } from '@/types/database';
import {
  Users,
  Clock,
  AlertCircle,
  DollarSign,
  TrendingUp,
  UserPlus,
  CreditCard,
  MessageSquare,
  FileSpreadsheet,
  Receipt as ReceiptIcon,
  ChevronRight,
  Send
} from 'lucide-react';
import { format } from 'date-fns';

export interface DashboardProps {
  onNavigateTab: (tab: any) => void;
  onSelectMemberDetail: (memberId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateTab, onSelectMemberDetail }) => {
  const {
    enrichedMembers,
    expiringMembers,
    unpaidMembers,
    enrichedPayments,
    stats,
    settings,
    enrichedReceipts,
    getEnrichedReceipt,
    getWhatsAppShareUrl,
  } = useGym();

  const [activeTab, setActiveTab] = useState<'expiring' | 'expired' | 'unpaid' | 'recent_payments' | 'recent_members'>('expiring');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedMemberForRenew, setSelectedMemberForRenew] = useState<EnrichedMember | null>(null);
  const [selectedMemberForPay, setSelectedMemberForPay] = useState<EnrichedMember | null>(null);
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

  // Recent confirmed payments (latest 6)
  const recentPayments = enrichedPayments.slice(0, 6);
  // Recent members (latest 6)
  const recentMembers = enrichedMembers.slice(0, 6);

  // Members expiring within 7 days (valid active expiring soon)
  const expiringSoonList = useMemo(() => {
    return enrichedMembers
      .filter(
        (m) =>
          m.status !== 'inactive' &&
          m.current_membership &&
          m.days_remaining >= 0 &&
          m.days_remaining <= 7
      )
      .sort((a, b) => a.days_remaining - b.days_remaining);
  }, [enrichedMembers]);

  // Members whose subscriptions have expired (days_remaining < 0)
  const expiredList = useMemo(() => {
    return enrichedMembers
      .filter(
        (m) =>
          m.status !== 'inactive' &&
          m.current_membership &&
          m.days_remaining < 0
      )
      .sort((a, b) => a.days_remaining - b.days_remaining);
  }, [enrichedMembers]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 sm:p-6 rounded-2xl border border-border/80 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            Gym Overview & Analytics
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time status for <span className="font-semibold text-foreground">{settings.gym_name}</span>. Offline-ready & synced.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}
            onClick={() => setIsImportOpen(true)}
          >
            Import CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<CreditCard className="h-3.5 w-3.5 text-emerald-500" />}
            onClick={() => setIsRecordPaymentOpen(true)}
          >
            Record Payment
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<UserPlus className="h-3.5 w-3.5" />}
            onClick={() => setIsAddMemberOpen(true)}
          >
            Add Member
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Active Members"
          value={stats.validActiveMembers}
          subtitle={`${stats.allRegisteredMembers} total registered`}
          icon={<Users className="h-5 w-5" />}
          variant="emerald"
          onClick={() => onNavigateTab('members')}
        />

        <StatCard
          title="Expiring < 7 Days"
          value={stats.expiringIn7Days}
          subtitle="Upcoming expiry notices"
          icon={<Clock className="h-5 w-5" />}
          variant="amber"
          onClick={() => setActiveTab('expiring')}
        />

        <StatCard
          title="Expired Members"
          value={stats.expiredCount}
          subtitle="Overdue subscriptions"
          icon={<AlertCircle className="h-5 w-5" />}
          variant="rose"
          onClick={() => setActiveTab('expired')}
        />

        <StatCard
          title="This Month Revenue"
          value={`${currency} ${stats.thisMonthRevenue.toLocaleString()}`}
          subtitle={`Today: ${currency} ${stats.todayRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
          variant="indigo"
          onClick={() => onNavigateTab('payments')}
        />
      </div>

      {/* Visual Analytics & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Membership Status Distribution */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Membership Status Split</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Distribution across registered members</p>
          </div>

          <div className="my-6 space-y-3">
            {/* Visual Bar */}
            <div className="h-3 w-full rounded-full bg-secondary overflow-hidden flex">
              <div
                style={{
                  width: `${
                    stats.allRegisteredMembers > 0
                      ? Math.max(0, ((stats.validActiveMembers - stats.expiringIn7Days) / stats.allRegisteredMembers) * 100)
                      : 0
                  }%`,
                }}
                className="bg-emerald-500 transition-all"
                title="Active"
              />
              <div
                style={{
                  width: `${
                    stats.allRegisteredMembers > 0
                      ? (stats.expiringIn7Days / stats.allRegisteredMembers) * 100
                      : 0
                  }%`,
                }}
                className="bg-amber-500 transition-all"
                title="Expiring Soon"
              />
              <div
                style={{
                  width: `${
                    stats.allRegisteredMembers > 0
                      ? (stats.expiredCount / stats.allRegisteredMembers) * 100
                      : 0
                  }%`,
                }}
                className="bg-rose-500 transition-all"
                title="Expired"
              />
              <div
                style={{
                  width: `${
                    stats.allRegisteredMembers > 0
                      ? (stats.unpaidCount / stats.allRegisteredMembers) * 100
                      : 0
                  }%`,
                }}
                className="bg-purple-500 transition-all"
                title="Unpaid"
              />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-4 gap-1.5 text-xs text-center pt-2">
              <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                <span className="block text-[10px] uppercase font-bold text-emerald-500">Active</span>
                <span className="font-bold text-foreground">{Math.max(0, stats.validActiveMembers - stats.expiringIn7Days)}</span>
              </div>
              <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                <span className="block text-[10px] uppercase font-bold text-amber-500">Expiring</span>
                <span className="font-bold text-foreground">{stats.expiringIn7Days}</span>
              </div>
              <div className="bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                <span className="block text-[10px] uppercase font-bold text-rose-500">Expired</span>
                <span className="font-bold text-foreground">{stats.expiredCount}</span>
              </div>
              <div className="bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                <span className="block text-[10px] uppercase font-bold text-purple-400">Unpaid</span>
                <span className="font-bold text-foreground">{stats.unpaidCount}</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground flex justify-between border-t border-border/60 pt-3">
            <span>Expired Total: <strong>{stats.expiredCount}</strong></span>
            <span>All-Time Members: <strong>{enrichedMembers.length}</strong></span>
          </div>
        </Card>

        {/* Revenue Summary */}
        <Card className="p-5 lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Revenue & Collections</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Total collected across verified payment methods</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
            {(['cash', 'easypaisa', 'jazzcash', 'bank_transfer'] as const).map((method) => {
              const totalMethod = payments
                .filter((p) => p.payment_method === method && !p.deleted_at)
                .reduce((acc, p) => acc + p.amount, 0);
              const countMethod = payments.filter((p) => p.payment_method === method && !p.deleted_at).length;

              return (
                <div key={method} className="bg-secondary/40 p-3 rounded-xl border border-border/40">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    {method.replace('_', ' ')}
                  </span>
                  <p className="text-sm font-bold text-foreground mt-1">
                    {currency} {totalMethod.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-muted-foreground">{countMethod} payments</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs">
            <span className="text-muted-foreground">
              Today's Volume: <strong>{currency} {stats.todayRevenue.toLocaleString()}</strong>
            </span>
            <Button variant="ghost" size="xs" onClick={() => onNavigateTab('payments')}>
              View Payments Ledger <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Modular Tabbed Activity Center */}
      <Card className="overflow-hidden">
        {/* Tab Headers */}
        <div className="flex gap-2 p-3 border-b border-[#1E1F22] bg-[#2B2D31] overflow-x-auto">
          <button
            onClick={() => setActiveTab('expiring')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'expiring'
                ? 'bg-[#5865F2] text-white shadow-sm'
                : 'bg-[#1E1F22] text-[#949BA4] hover:text-[#DBDEE1] hover:bg-[#35373C]'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Expiring Soon</span>
            {stats.expiringIn7Days > 0 && (
              <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${activeTab === 'expiring' ? 'bg-[#1E1F22] text-[#F0B232]' : 'bg-[#F0B232]/20 text-[#F0B232]'}`}>
                {stats.expiringIn7Days}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('expired')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'expired'
                ? 'bg-[#5865F2] text-white shadow-sm'
                : 'bg-[#1E1F22] text-[#949BA4] hover:text-[#DBDEE1] hover:bg-[#35373C]'
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
            <span>Expired Members</span>
            {stats.expiredCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${activeTab === 'expired' ? 'bg-[#1E1F22] text-[#DA373C]' : 'bg-[#DA373C]/20 text-[#DA373C]'}`}>
                {stats.expiredCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('unpaid')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'unpaid'
                ? 'bg-[#5865F2] text-white shadow-sm'
                : 'bg-[#1E1F22] text-[#949BA4] hover:text-[#DBDEE1] hover:bg-[#35373C]'
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Unpaid Members</span>
            {stats.unpaidCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${activeTab === 'unpaid' ? 'bg-[#1E1F22] text-[#DA373C]' : 'bg-[#DA373C]/20 text-[#DA373C]'}`}>
                {stats.unpaidCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('recent_payments')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'recent_payments'
                ? 'bg-[#5865F2] text-white shadow-sm'
                : 'bg-[#1E1F22] text-[#949BA4] hover:text-[#DBDEE1] hover:bg-[#35373C]'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>Recent Payments</span>
          </button>

          <button
            onClick={() => setActiveTab('recent_members')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'recent_members'
                ? 'bg-[#5865F2] text-white shadow-sm'
                : 'bg-[#1E1F22] text-[#949BA4] hover:text-[#DBDEE1] hover:bg-[#35373C]'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>New Members</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5">
          {/* TAB 1: EXPIRING SOON (< 7 DAYS) */}
          {activeTab === 'expiring' && (
            <div>
              {expiringSoonList.length === 0 ? (
                <EmptyState
                  icon={<Clock className="h-6 w-6" />}
                  title="No Members Expiring Soon"
                  description="All active members have more than 7 days remaining on their current plans."
                />
              ) : (
                <div className="space-y-3">
                  <Table>
                    <TableHeader>
                      <tr>
                        <TableHead>Member</TableHead>
                        <TableHead>Current Plan</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Days Left</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </tr>
                    </TableHeader>
                    <TableBody>
                      {expiringSoonList.map((member: EnrichedMember) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div>
                              <button
                                onClick={() => onSelectMemberDetail(member.id)}
                                className="font-semibold text-foreground hover:text-emerald-500 transition-colors text-left"
                              >
                                {member.full_name}
                              </button>
                              <p className="text-[11px] font-mono text-muted-foreground">
                                {member.member_code} • {member.phone}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-xs">{member.current_plan?.name || 'Standard'}</TableCell>
                          <TableCell className="text-xs font-mono">{member.current_membership?.end_date || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={member.days_remaining <= 2 ? 'expired' : 'expiring'} size="sm" dot>
                              {member.days_remaining === 0
                                ? 'Expires Today'
                                : `${member.days_remaining} day${member.days_remaining === 1 ? '' : 's'} left`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={getWhatsAppShareUrl(member.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-medium transition-colors border border-emerald-500/20 cursor-pointer"
                              >
                                <Send className="h-3 w-3" /> WhatsApp
                              </a>
                              <Button
                                variant="primary"
                                size="xs"
                                onClick={() => setSelectedMemberForRenew(member)}
                              >
                                Renew
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPIRED MEMBERS (< 0 DAYS) */}
          {activeTab === 'expired' && (
            <div>
              {expiredList.length === 0 ? (
                <EmptyState
                  icon={<AlertCircle className="h-6 w-6 text-emerald-500" />}
                  title="No Expired Members"
                  description="All registered member subscriptions are currently active and valid."
                />
              ) : (
                <div className="space-y-3">
                  <Table>
                    <TableHeader>
                      <tr>
                        <TableHead>Member</TableHead>
                        <TableHead>Previous Plan</TableHead>
                        <TableHead>Expired On</TableHead>
                        <TableHead>Overdue Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </tr>
                    </TableHeader>
                    <TableBody>
                      {expiredList.map((member: EnrichedMember) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div>
                              <button
                                onClick={() => onSelectMemberDetail(member.id)}
                                className="font-semibold text-foreground hover:text-emerald-500 transition-colors text-left"
                              >
                                {member.full_name}
                              </button>
                              <p className="text-[11px] font-mono text-muted-foreground">
                                {member.member_code} • {member.phone}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-xs">{member.current_plan?.name || 'Standard'}</TableCell>
                          <TableCell className="text-xs font-mono">{member.current_membership?.end_date || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="expired" size="sm" dot>
                              Expired ({Math.abs(member.days_remaining)}d ago)
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={getWhatsAppShareUrl(member.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-medium transition-colors border border-emerald-500/20 cursor-pointer"
                              >
                                <Send className="h-3 w-3" /> WhatsApp
                              </a>
                              <Button
                                variant="primary"
                                size="xs"
                                onClick={() => setSelectedMemberForRenew(member)}
                              >
                                Pay / Renew
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: UNPAID MEMBERS */}
          {activeTab === 'unpaid' && (
            <div>
              {unpaidMembers.length === 0 ? (
                <EmptyState
                  icon={<AlertCircle className="h-6 w-6" />}
                  title="No Unpaid Members"
                  description="All active members have their required fee payments recorded."
                />
              ) : (
                <div className="space-y-3">
                  <Table>
                    <TableHeader>
                      <tr>
                        <TableHead>Member</TableHead>
                        <TableHead>Membership Plan</TableHead>
                        <TableHead>Amount Due</TableHead>
                        <TableHead>Overdue Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </tr>
                    </TableHeader>
                    <TableBody>
                      {unpaidMembers.map((item) => (
                        <TableRow key={item.member.id}>
                          <TableCell>
                            <div>
                              <button
                                onClick={() => onSelectMemberDetail(item.member.id)}
                                className="font-semibold text-foreground hover:text-emerald-500 transition-colors text-left"
                              >
                                {item.member.full_name}
                              </button>
                              <p className="text-[11px] font-mono text-muted-foreground">
                                {item.member.member_code} • {item.member.phone}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-xs">{item.plan.name}</TableCell>
                          <TableCell className="font-bold text-rose-500">
                            {currency} {item.amount_due.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="unpaid" size="sm">
                              {item.days_overdue} days overdue
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="primary"
                              size="xs"
                              onClick={() => {
                                const em = enrichedMembers.find((m) => m.id === item.member.id);
                                if (em) setSelectedMemberForPay(em);
                              }}
                            >
                              Record Payment
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RECENT PAYMENTS */}
          {activeTab === 'recent_payments' && (
            <div>
              {recentPayments.length === 0 ? (
                <EmptyState
                  icon={<DollarSign className="h-6 w-6" />}
                  title="No Payments Recorded"
                  description="Start recording payments to see real-time payment ledger entries."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHead>Member</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Receipt #</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {recentPayments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div>
                            <span className="font-semibold text-foreground">{p.member?.full_name || '—'}</span>
                            <p className="text-[11px] font-mono text-muted-foreground">{p.member?.member_code}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-emerald-500">
                          {currency} {p.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.payment_method === 'cash' ? 'cash' : 'online'} size="sm">
                            {p.payment_method.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{p.payment_date}</TableCell>
                        <TableCell className="text-xs font-mono font-semibold text-emerald-400">
                          {p.receipt?.receipt_number || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.receipt && (
                            <Button
                              variant="outline"
                              size="xs"
                              leftIcon={<ReceiptIcon className="h-3 w-3" />}
                              onClick={() => {
                                const enc = enrichedReceipts.find((r) => r.id === p.receipt?.id);
                                if (enc) setActiveReceipt(enc);
                              }}
                            >
                              Receipt
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* TAB 4: RECENT MEMBERS */}
          {activeTab === 'recent_members' && (
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Current Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {recentMembers.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono font-bold text-emerald-500 text-xs">{m.member_code}</TableCell>
                    <TableCell className="font-semibold text-foreground">{m.full_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{m.phone}</TableCell>
                    <TableCell className="text-xs">{m.current_plan?.name || 'Standard'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.timing_status === 'active'
                            ? 'active'
                            : m.timing_status === 'expiring_soon'
                            ? 'expiring'
                            : 'expired'
                        }
                        size="sm"
                        dot
                      >
                        {m.timing_status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="xs" onClick={() => onSelectMemberDetail(m.id)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      {/* Modals */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSuccess={handleCreatedReceipt}
      />

      <RecordPaymentModal
        initialMember={selectedMemberForPay}
        isOpen={isRecordPaymentOpen || Boolean(selectedMemberForPay)}
        onClose={() => {
          setIsRecordPaymentOpen(false);
          setSelectedMemberForPay(null);
        }}
        onSuccess={handleCreatedReceipt}
      />

      <RenewMembershipModal
        member={selectedMemberForRenew}
        isOpen={Boolean(selectedMemberForRenew)}
        onClose={() => setSelectedMemberForRenew(null)}
        onSuccess={handleCreatedReceipt}
      />

      <ImportMembersModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      <ReceiptModal
        receipt={activeReceipt}
        isOpen={Boolean(activeReceipt)}
        onClose={() => setActiveReceipt(null)}
      />
    </div>
  );
};
