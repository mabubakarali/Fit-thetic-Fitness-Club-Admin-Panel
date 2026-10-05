import React, { useState, useMemo } from 'react';
import { useGym } from '@/context/GymContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ActivityLogItem } from '@/types/database';
import {
  History,
  DollarSign,
  RotateCw,
  UserPlus,
  RotateCcw,
  AlertTriangle,
  Receipt as ReceiptIcon,
  Search,
  CheckCircle,
  Clock
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

export interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMemberDetail?: (memberId: string) => void;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  isOpen,
  onClose,
  onSelectMemberDetail,
}) => {
  const { activityLog, deletePayment, deleteMembership, settings } = useGym();

  const [activeFilter, setActiveFilter] = useState<'all' | 'payments' | 'renewals' | 'members' | 'voided'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmItem, setConfirmItem] = useState<ActivityLogItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currency = settings.currency || 'Rs.';

  const filteredLog = useMemo(() => {
    return activityLog.filter((item) => {
      // Filter tab
      if (activeFilter === 'payments' && item.type !== 'payment_recorded') return false;
      if (activeFilter === 'renewals' && item.type !== 'membership_renewed') return false;
      if (activeFilter === 'members' && item.type !== 'member_registered') return false;
      if (activeFilter === 'voided' && !item.isVoided) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          (item.memberName && item.memberName.toLowerCase().includes(q)) ||
          (item.memberCode && item.memberCode.toLowerCase().includes(q)) ||
          (item.receiptNumber && item.receiptNumber.toLowerCase().includes(q)) ||
          (item.title && item.title.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [activityLog, activeFilter, searchQuery]);

  const handleConfirmUndo = async () => {
    if (!confirmItem) return;
    setIsProcessing(true);
    try {
      if (confirmItem.paymentId) {
        await deletePayment(confirmItem.paymentId);
        setToastMessage(`Successfully undone payment of ${currency} ${confirmItem.amount?.toLocaleString() || ''} for ${confirmItem.memberName}. Member dues and revenue restored.`);
      } else if (confirmItem.membershipId) {
        await deleteMembership(confirmItem.membershipId);
        setToastMessage(`Successfully undone membership renewal for ${confirmItem.memberName}.`);
      }
      setConfirmItem(null);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      alert(`Failed to undo action: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatItemTime = (isoString: string) => {
    try {
      const date = parseISO(isoString);
      const dist = formatDistanceToNow(date, { addSuffix: true });
      const fullDate = format(date, 'MMM d, yyyy h:mm a');
      return { dist, fullDate };
    } catch {
      return { dist: isoString, fullDate: isoString };
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Activity Log & Action History"
        description="Audit trail of gym payments, receipts, renewals, and member registrations. Undo accidental actions with 1 click."
        maxWidth="2xl"
      >
        <div className="space-y-4 pt-1">
          {/* Toast Notification Banner */}
          {toastMessage && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-fade-in">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Search & Filter Header */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search member, receipt #, GYM code, or amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-background border border-border px-3 pl-9 py-1.5 text-xs text-foreground focus:outline-none focus:border-[#5865F2]"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeFilter === 'all'
                  ? 'bg-[#5865F2] text-white'
                  : 'bg-secondary/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              All Activity ({activityLog.length})
            </button>
            <button
              onClick={() => setActiveFilter('payments')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeFilter === 'payments'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-secondary/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              Payments ({activityLog.filter((i) => i.type === 'payment_recorded').length})
            </button>
            <button
              onClick={() => setActiveFilter('renewals')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeFilter === 'renewals'
                  ? 'bg-purple-600 text-white'
                  : 'bg-secondary/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              Renewals ({activityLog.filter((i) => i.type === 'membership_renewed').length})
            </button>
            <button
              onClick={() => setActiveFilter('members')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeFilter === 'members'
                  ? 'bg-sky-600 text-white'
                  : 'bg-secondary/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              New Members ({activityLog.filter((i) => i.type === 'member_registered').length})
            </button>
            <button
              onClick={() => setActiveFilter('voided')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeFilter === 'voided'
                  ? 'bg-rose-600 text-white'
                  : 'bg-secondary/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              Voided / Undone ({activityLog.filter((i) => i.isVoided).length})
            </button>
          </div>

          {/* Activity Timeline List */}
          <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
            {filteredLog.length === 0 ? (
              <div className="text-center py-10 bg-secondary/20 rounded-xl border border-border/60">
                <History className="h-8 w-8 mx-auto text-muted-foreground opacity-40 mb-2" />
                <p className="text-xs font-semibold text-foreground">No Activity Found</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  No matching log events recorded.
                </p>
              </div>
            ) : (
              filteredLog.map((item) => {
                const { dist, fullDate } = formatItemTime(item.timestamp);
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      item.isVoided
                        ? 'bg-rose-500/5 border-rose-500/20 opacity-75'
                        : item.type === 'payment_recorded'
                        ? 'bg-secondary/30 border-border hover:border-emerald-500/30'
                        : item.type === 'membership_renewed'
                        ? 'bg-secondary/30 border-border hover:border-purple-500/30'
                        : 'bg-secondary/30 border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Icon */}
                      <div
                        className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                          item.isVoided
                            ? 'bg-rose-500/15 text-rose-400'
                            : item.type === 'payment_recorded'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : item.type === 'membership_renewed'
                            ? 'bg-purple-500/15 text-purple-400'
                            : 'bg-sky-500/15 text-sky-400'
                        }`}
                      >
                        {item.isVoided ? (
                          <RotateCcw className="h-4 w-4" />
                        ) : item.type === 'payment_recorded' ? (
                          <DollarSign className="h-4 w-4" />
                        ) : item.type === 'membership_renewed' ? (
                          <RotateCw className="h-4 w-4" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-bold ${
                              item.isVoided
                                ? 'text-rose-400 line-through'
                                : 'text-foreground'
                            }`}
                          >
                            {item.title}
                          </span>

                          {item.receiptNumber && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                              #{item.receiptNumber}
                            </span>
                          )}

                          {item.paymentMethod && (
                            <Badge
                              variant={item.paymentMethod === 'cash' ? 'cash' : 'online'}
                              size="sm"
                            >
                              {item.paymentMethod.replace('_', ' ')}
                            </Badge>
                          )}

                          {item.isVoided && (
                            <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded">
                              Voided
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>

                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5 font-mono">
                          <span className="flex items-center gap-1" title={fullDate}>
                            <Clock className="h-2.5 w-2.5" />
                            {dist} ({fullDate})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-1 sm:pt-0">
                      {item.memberId && onSelectMemberDetail && (
                        <button
                          onClick={() => {
                            onClose();
                            onSelectMemberDetail(item.memberId!);
                          }}
                          className="text-[11px] text-[#5865F2] hover:underline font-semibold"
                        >
                          View Member
                        </button>
                      )}

                      {item.isReversible && !item.isVoided && (
                        <Button
                          variant="outline"
                          size="xs"
                          leftIcon={<RotateCcw className="h-3 w-3 text-rose-400" />}
                          onClick={() => setConfirmItem(item)}
                          className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500"
                        >
                          Undo / Void
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Safety Confirmation Modal */}
      {confirmItem && (
        <Modal
          isOpen={Boolean(confirmItem)}
          onClose={() => setConfirmItem(null)}
          title="Confirm Action Reversal / Void"
          description="Are you sure you want to void this transaction? This action will safely rollback the record."
          maxWidth="md"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmItem(null)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                isLoading={isProcessing}
                onClick={handleConfirmUndo}
              >
                Confirm & Void Transaction
              </Button>
            </>
          }
        >
          <div className="space-y-3.5 pt-1 text-xs">
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-300">
                  You are voiding: {confirmItem.title}
                </p>
                <div className="text-[11px] text-rose-200/80 leading-relaxed">
                  {confirmItem.paymentId ? (
                    <>
                      <p>• The payment of <strong>{currency} {confirmItem.amount?.toLocaleString()}</strong> will be deducted from your gym's total revenue.</p>
                      <p>• Digital receipt {confirmItem.receiptNumber ? <strong>#{confirmItem.receiptNumber}</strong> : ''} will be cancelled.</p>
                      <p>• Member <strong>{confirmItem.memberName}</strong>'s balance dues will automatically be restored.</p>
                    </>
                  ) : (
                    <p>• The membership renewal for <strong>{confirmItem.memberName}</strong> will be cancelled and deleted.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 bg-secondary/30 rounded-xl border border-border/80 space-y-1 text-[11px]">
              <span className="text-muted-foreground block font-bold uppercase text-[10px]">
                Transaction Summary
              </span>
              <p className="text-foreground">
                <strong>Member:</strong> {confirmItem.memberName} ({confirmItem.memberCode})
              </p>
              {confirmItem.amount !== undefined && (
                <p className="text-foreground">
                  <strong>Amount:</strong> {currency} {confirmItem.amount.toLocaleString()}
                </p>
              )}
              {confirmItem.paymentMethod && (
                <p className="text-foreground">
                  <strong>Method:</strong> {confirmItem.paymentMethod.replace('_', ' ').toUpperCase()}
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
