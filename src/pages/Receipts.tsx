import React, { useState, useMemo } from 'react';
import { useGym } from '@/context/GymContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReceiptModal } from '@/components/receipts/ReceiptModal';
import { EnrichedReceipt } from '@/types/database';
import { Receipt as ReceiptIcon, Search, Printer, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export const Receipts: React.FC = () => {
  const { enrichedReceipts, settings } = useGym();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<EnrichedReceipt | null>(null);

  const currency = settings.currency || 'Rs.';

  const filteredReceipts = useMemo(() => {
    return enrichedReceipts.filter((r) => {
      const q = searchQuery.toLowerCase();
      return (
        r.receipt_number.toLowerCase().includes(q) ||
        r.member.full_name.toLowerCase().includes(q) ||
        r.member.member_code.toLowerCase().includes(q) ||
        r.member.phone.includes(q)
      );
    });
  }, [enrichedReceipts, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <ReceiptIcon className="h-6 w-6 text-emerald-500" /> Digital Receipts Archive
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Official immutable numbered receipts ({enrichedReceipts.length} total generated).
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <Input
          placeholder="Search receipt # (e.g. GYM-2026-00001), member name, code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </Card>

      {/* Receipts Table */}
      {filteredReceipts.length === 0 ? (
        <EmptyState
          icon={<ReceiptIcon className="h-8 w-8" />}
          title="No Receipts Found"
          description="Receipts are automatically generated when payments are confirmed."
        />
      ) : (
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Receipt #</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Plan Description</TableHead>
              <TableHead>Amount Paid</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Issued Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filteredReceipts.map((receipt) => (
              <TableRow key={receipt.id}>
                <TableCell className="font-mono font-bold text-xs text-emerald-400">
                  {receipt.receipt_number}
                </TableCell>

                <TableCell>
                  <div>
                    <span className="font-semibold text-foreground">{receipt.member.full_name}</span>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {receipt.member.member_code} • {receipt.member.phone}
                    </p>
                  </div>
                </TableCell>

                <TableCell className="text-xs font-medium">{receipt.plan.name}</TableCell>

                <TableCell className="font-bold text-emerald-500 text-sm">
                  {currency} {receipt.payment.amount.toLocaleString()}
                </TableCell>

                <TableCell className="text-xs uppercase font-medium">
                  {receipt.payment.payment_method.replace('_', ' ')}
                </TableCell>

                <TableCell className="text-xs font-mono text-muted-foreground">
                  {format(new Date(receipt.generated_at), 'dd MMM yyyy, hh:mm a')}
                </TableCell>

                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="xs"
                    leftIcon={<Printer className="h-3 w-3" />}
                    onClick={() => setSelectedReceipt(receipt)}
                  >
                    View / Print
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Receipt View / Print Modal */}
      <ReceiptModal
        receipt={selectedReceipt}
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
      />
    </div>
  );
};
