import React, { useState, useMemo } from 'react';
import { useGym } from '@/context/GymContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { RecordPaymentModal } from '@/components/members/RecordPaymentModal';
import { ReceiptModal } from '@/components/receipts/ReceiptModal';
import { EnrichedMember, EnrichedReceipt, Receipt } from '@/types/database';
import {
  AlertCircle,
  Search,
  DollarSign,
  Send,
  CheckCircle2,
  Calendar,
  CreditCard
} from 'lucide-react';

export interface UnpaidProps {
  onSelectMemberDetail?: (memberId: string) => void;
}

export const Unpaid: React.FC<UnpaidProps> = ({ onSelectMemberDetail }) => {
  const { unpaidMembers, enrichedMembers, enrichedReceipts, getEnrichedReceipt, settings, getWhatsAppShareUrl } = useGym();

  const [searchQuery, setSearchQuery] = useState('');
  const [payMember, setPayMember] = useState<EnrichedMember | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<EnrichedReceipt | null>(null);

  const currency = settings.currency || 'Rs.';

  const filteredUnpaid = useMemo(() => {
    return unpaidMembers.filter((item) => {
      const q = searchQuery.toLowerCase();
      return (
        item.member.full_name.toLowerCase().includes(q) ||
        item.member.member_code.toLowerCase().includes(q) ||
        item.member.phone.includes(q) ||
        item.plan.name.toLowerCase().includes(q)
      );
    });
  }, [unpaidMembers, searchQuery]);

  const totalOutstanding = useMemo(() => {
    return filteredUnpaid.reduce((acc, item) => acc + item.amount_due, 0);
  }, [filteredUnpaid]);

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-rose-500" /> Unpaid Members Tracker
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dynamically calculated from registered memberships with pending or partial balances.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-rose-500/5 border-rose-500/20">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-400">Total Unpaid Members</p>
          <p className="text-2xl font-bold text-rose-500 mt-1">{unpaidMembers.length}</p>
          <span className="text-[11px] text-muted-foreground">Members with pending fees</span>
        </Card>

        <Card className="p-4 bg-rose-500/5 border-rose-500/20 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-400">Total Outstanding Arrears</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {currency} {totalOutstanding.toLocaleString()}
          </p>
          <span className="text-[11px] text-muted-foreground">Sum of all uncollected membership dues</span>
        </Card>
      </div>

      {/* Search Filter */}
      <Card className="p-4">
        <Input
          placeholder="Filter unpaid members by name, GYM code, phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </Card>

      {/* Unpaid List */}
      {filteredUnpaid.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
          title="All Members are Paid Up!"
          description="There are currently zero members with pending membership fee balances."
        />
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Member</TableHead>
              <TableHead>Plan & Fee</TableHead>
              <TableHead>Amount Due</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Days Overdue</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filteredUnpaid.map((item) => (
              <TableRow key={item.member.id}>
                <TableCell>
                  <div>
                    {onSelectMemberDetail ? (
                      <button
                        onClick={() => onSelectMemberDetail(item.member.id)}
                        className="font-bold text-foreground hover:text-emerald-500 transition-colors text-left"
                      >
                        {item.member.full_name}
                      </button>
                    ) : (
                      <span className="font-bold text-foreground">{item.member.full_name}</span>
                    )}
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {item.member.member_code} • {item.member.phone}
                    </p>
                  </div>
                </TableCell>

                <TableCell className="text-xs">
                  <span className="font-medium text-foreground">{item.plan.name}</span>
                  <p className="text-muted-foreground">Total: {currency} {item.membership.amount.toLocaleString()}</p>
                </TableCell>

                <TableCell className="font-bold text-rose-500 text-sm">
                  {currency} {item.amount_due.toLocaleString()}
                  {item.total_paid > 0 && (
                    <p className="text-[10px] text-muted-foreground font-normal">
                      (Paid: {currency} {item.total_paid.toLocaleString()})
                    </p>
                  )}
                </TableCell>

                <TableCell className="text-xs font-mono">{item.due_date}</TableCell>

                <TableCell>
                  <Badge variant="unpaid" size="sm" dot>
                    {item.days_overdue === 0 ? 'Due Today' : `${item.days_overdue} days overdue`}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={getWhatsAppShareUrl(item.member.id, item.membership.id, 'custom')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-medium transition-colors"
                      title="Send WhatsApp payment reminder"
                    >
                      <Send className="h-3.5 w-3.5" /> WhatsApp
                    </a>

                    <Button
                      variant="primary"
                      size="xs"
                      leftIcon={<DollarSign className="h-3 w-3" />}
                      onClick={() => {
                        const em = enrichedMembers.find((m) => m.id === item.member.id);
                        if (em) setPayMember(em);
                      }}
                    >
                      Record Payment
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modals */}
      <RecordPaymentModal
        initialMember={payMember}
        isOpen={Boolean(payMember)}
        onClose={() => setPayMember(null)}
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
