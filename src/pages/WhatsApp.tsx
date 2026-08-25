import React, { useState } from 'react';
import { useGym } from '@/context/GymContext';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ReminderType, WhatsAppReminder } from '@/types/database';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

export const WhatsApp: React.FC = () => {
  const {
    enrichedMembers,
    reminders,
    members,
    settings,
    generateReminder,
    getWhatsAppShareUrl,
  } = useGym();
  const { showToast } = useToast();

  const [selectedReminderForPreview, setSelectedReminderForPreview] = useState<WhatsAppReminder | null>(null);

  // All members who are expired or expiring soon (within 7 days)
  const actionableMembers = enrichedMembers
    .filter(
      (m) =>
        m.status !== 'inactive' &&
        m.current_membership &&
        (m.timing_status === 'expired' || m.timing_status === 'expiring_soon' || m.days_remaining <= 7)
    )
    .sort((a, b) => a.days_remaining - b.days_remaining);

  const handleSendReminder = async (
    memberId: string,
    membershipId?: string,
    type: ReminderType = '7_days_before'
  ) => {
    try {
      if (membershipId) {
        await generateReminder(memberId, membershipId, type);
      }
      const url = getWhatsAppShareUrl(memberId, membershipId, type);
      window.open(url, '_blank');
      showToast('WhatsApp Dispatched', 'Opening WhatsApp with pre-filled renewal reminder.');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to trigger reminder', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-emerald-500" /> WhatsApp Renewal Reminders
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            One-click renewal notifications and expiry follow-ups sent directly to members via WhatsApp.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>WhatsApp Web / Desktop Ready</span>
        </div>
      </div>

      {/* Section 1: Members Needing Reminders */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Expiring & Expired Members Queue</h3>
            <p className="text-xs text-muted-foreground">Members with overdue subscriptions or upcoming expiry dates needing renewal follow-up</p>
          </div>
          <Badge variant={actionableMembers.length > 0 ? 'expiring' : 'active'} size="sm">
            {actionableMembers.length} Members Due
          </Badge>
        </div>

        {actionableMembers.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />}
            title="Reminder Queue Clear"
            description="No members are currently expired or in the upcoming expiry window."
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Member</TableHead>
                <TableHead>Current Plan</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status / Remaining</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {actionableMembers.map((member) => {
                const milestone: ReminderType =
                  member.days_remaining < 0
                    ? 'on_expiry'
                    : member.days_remaining === 0
                    ? 'on_expiry'
                    : member.days_remaining <= 1
                    ? '1_day_before'
                    : member.days_remaining <= 3
                    ? '3_days_before'
                    : '7_days_before';

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <span className="font-semibold text-foreground">{member.full_name}</span>
                        <p className="text-[11px] font-mono text-muted-foreground">
                          {member.member_code} • {member.phone}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-medium">{member.current_plan?.name || 'Standard'}</TableCell>
                    <TableCell className="text-xs font-mono">{member.current_membership?.end_date || '—'}</TableCell>

                    <TableCell>
                      <Badge
                        variant={member.timing_status === 'expired' || member.days_remaining < 0 ? 'expired' : 'expiring'}
                        size="sm"
                        dot
                      >
                        {member.days_remaining < 0
                          ? `Expired (${Math.abs(member.days_remaining)}d ago)`
                          : member.days_remaining === 0
                          ? 'Expires Today'
                          : `${member.days_remaining}d remaining`}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Send className="h-3.5 w-3.5" />}
                        onClick={() => handleSendReminder(member.id, member.current_membership?.id, milestone)}
                        className="bg-[#23A55A] hover:bg-[#1f9250] text-white font-bold"
                      >
                        Send WhatsApp
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Section 2: WhatsApp Reminder Logs Archive */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">WhatsApp Reminder Dispatch Logs</h3>
            <p className="text-xs text-muted-foreground">Log of all sent and generated renewal notices</p>
          </div>
          <span className="text-xs text-muted-foreground font-mono">{reminders.length} total logs</span>
        </div>

        {reminders.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-6 w-6" />}
            title="No Dispatch History Yet"
            description="Sent reminder records will appear here automatically."
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Member</TableHead>
                <TableHead>Milestone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Message</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {reminders.map((rem) => {
                const mem = members.find((m) => m.id === rem.member_id);
                return (
                  <TableRow key={rem.id}>
                    <TableCell>
                      <div>
                        <span className="font-semibold text-foreground">{mem?.full_name || '—'}</span>
                        <p className="text-[11px] font-mono text-muted-foreground">{mem?.phone}</p>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-mono uppercase">
                      {rem.reminder_type.replace(/_/g, ' ')}
                    </TableCell>

                    <TableCell>
                      <Badge variant="online" size="sm">
                        {rem.status === 'sent' || rem.direct_opened ? 'Dispatched' : 'Generated'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {format(new Date(rem.created_at), 'dd MMM yyyy, hh:mm a')}
                    </TableCell>

                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                        <CheckCircle2 className="h-3 w-3" /> WhatsApp
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setSelectedReminderForPreview(rem)}
                      >
                        View Text
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Message Preview Modal */}
      <Modal
        isOpen={Boolean(selectedReminderForPreview)}
        onClose={() => setSelectedReminderForPreview(null)}
        title="WhatsApp Reminder Message"
        description="Exact message template prepared for this member."
      >
        {selectedReminderForPreview && (
          <div className="space-y-4">
            <div className="bg-secondary/60 p-4 rounded-xl border border-border/80 font-mono text-xs whitespace-pre-wrap leading-relaxed text-foreground">
              {selectedReminderForPreview.message_text}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedReminderForPreview(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
