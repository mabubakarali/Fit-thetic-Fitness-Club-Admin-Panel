import React, { useState, useMemo } from 'react';
import { useGym } from '@/context/GymContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { RecordPaymentModal } from '@/components/members/RecordPaymentModal';
import { ReceiptModal } from '@/components/receipts/ReceiptModal';
import { EnrichedReceipt, PaymentMethod, Receipt } from '@/types/database';
import { CreditCard, Search, DollarSign, Receipt as ReceiptIcon, Filter, Download } from 'lucide-react';
import { format } from 'date-fns';
import { exportPaymentsToExcelCSV } from '@/lib/exportUtils';

export interface PaymentsProps {
  onSelectMemberDetail?: (memberId: string) => void;
}

export const Payments: React.FC<PaymentsProps> = ({ onSelectMemberDetail }) => {
  const { enrichedPayments, enrichedReceipts, settings } = useGym();

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [isRecordPayOpen, setIsRecordPayOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<EnrichedReceipt | null>(null);

  const currency = settings.currency || 'Rs.';

  const filteredPayments = useMemo(() => {
    return enrichedPayments.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        (p.member?.full_name && p.member.full_name.toLowerCase().includes(q)) ||
        (p.member?.member_code && p.member.member_code.toLowerCase().includes(q)) ||
        (p.member?.phone && p.member.phone.includes(q)) ||
        (p.transaction_reference && p.transaction_reference.toLowerCase().includes(q)) ||
        (p.receipt?.receipt_number && p.receipt.receipt_number.toLowerCase().includes(q));

      if (!matchesQuery) return false;
      if (methodFilter !== 'all' && p.payment_method !== methodFilter) return false;
      return true;
    });
  }, [enrichedPayments, searchQuery, methodFilter]);

  const totalFilteredAmount = useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + p.amount, 0);
  }, [filteredPayments]);

  const handleCreatedReceipt = (receipt?: Receipt) => {
    if (receipt) {
      const enc = enrichedReceipts.find((r) => r.id === receipt.id);
      if (enc) setActiveReceipt(enc);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-emerald-500" /> Payments Ledger
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Confirmed payment transactions with automatic digital receipt generation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => exportPaymentsToExcelCSV(filteredPayments, settings)}
            title="Download payments spreadsheet with total revenue summary"
          >
            Export Excel
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<DollarSign className="h-4 w-4" />}
            onClick={() => setIsRecordPayOpen(true)}
          >
            + Record Payment
          </Button>
        </div>
      </div>

      {/* Filter / Summary Card */}
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Input
              placeholder="Search member, GYM code, receipt #, reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>

          <Select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Payment Methods' },
              { value: 'cash', label: 'Cash Payments' },
              { value: 'easypaisa', label: 'Easypaisa Transfers' },
              { value: 'jazzcash', label: 'JazzCash Transfers' },
              { value: 'bank_transfer', label: 'Bank Transfers' },
              { value: 'other', label: 'Other Methods' },
            ]}
          />
        </div>

        {/* Totals Summary */}
        <div className="flex items-center justify-between text-xs pt-3 border-t border-border/60">
          <span className="text-muted-foreground">
            Showing <strong>{filteredPayments.length}</strong> recorded payments
          </span>
          <span className="font-bold text-foreground bg-secondary/60 px-3 py-1 rounded-lg border border-border/80">
            Total Filtered Volume: <strong className="text-emerald-500">{currency} {totalFilteredAmount.toLocaleString()}</strong>
          </span>
        </div>
      </Card>

      {/* Payments Table */}
      {filteredPayments.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-8 w-8" />}
          title="No Payments Match Filter"
          description="Try changing your search terms or method filter."
          actionText="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setMethodFilter('all');
          }}
        />
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Receipt #</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Reference / Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filteredPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-mono text-xs font-bold text-emerald-400">
                  {payment.receipt?.receipt_number || '—'}
                </TableCell>

                <TableCell>
                  {payment.member ? (
                    <div>
                      {onSelectMemberDetail ? (
                        <button
                          onClick={() => onSelectMemberDetail(payment.member!.id)}
                          className="font-semibold text-foreground hover:text-emerald-500 transition-colors text-left"
                        >
                          {payment.member.full_name}
                        </button>
                      ) : (
                        <span className="font-semibold text-foreground">{payment.member.full_name}</span>
                      )}
                      <p className="text-[11px] font-mono text-muted-foreground">{payment.member.member_code}</p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">Member Deleted</span>
                  )}
                </TableCell>

                <TableCell className="font-bold text-emerald-500 text-sm">
                  {currency} {payment.amount.toLocaleString()}
                </TableCell>

                <TableCell>
                  <Badge variant={payment.payment_method === 'cash' ? 'cash' : 'online'} size="sm">
                    {payment.payment_method.replace('_', ' ')}
                  </Badge>
                </TableCell>

                <TableCell className="text-xs font-mono">{payment.payment_date}</TableCell>

                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                  {payment.transaction_reference ? (
                    <span className="font-mono text-foreground">{payment.transaction_reference}</span>
                  ) : payment.notes ? (
                    <span className="italic">{payment.notes}</span>
                  ) : (
                    '—'
                  )}
                </TableCell>

                <TableCell className="text-right">
                  {payment.receipt && (
                    <Button
                      variant="outline"
                      size="xs"
                      leftIcon={<ReceiptIcon className="h-3 w-3" />}
                      onClick={() => {
                        const enc = enrichedReceipts.find((r) => r.id === payment.receipt?.id);
                        if (enc) setActiveReceipt(enc);
                      }}
                    >
                      View Receipt
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modals */}
      <RecordPaymentModal
        isOpen={isRecordPayOpen}
        onClose={() => setIsRecordPayOpen(false)}
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
