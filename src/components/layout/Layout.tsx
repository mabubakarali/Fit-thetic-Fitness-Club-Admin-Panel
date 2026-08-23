import React, { useState } from 'react';
import { Sidebar, NavTab } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { AddMemberModal } from '@/components/members/AddMemberModal';
import { RecordPaymentModal } from '@/components/members/RecordPaymentModal';
import { ReceiptModal } from '@/components/receipts/ReceiptModal';
import { useGym } from '@/context/GymContext';
import { EnrichedReceipt, Receipt } from '@/types/database';
import { WifiOff, AlertTriangle } from 'lucide-react';

export interface LayoutProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  children: React.ReactNode;
  onGlobalSearch?: (query: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  onSelectTab,
  children,
  onGlobalSearch,
}) => {
  const { syncState, enrichedReceipts, getEnrichedReceipt } = useGym();
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<EnrichedReceipt | null>(null);

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

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop Sidebar */}
      <Sidebar currentTab={currentTab} onSelectTab={onSelectTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Top Header */}
        <Header
          onOpenAddMember={() => setIsAddMemberOpen(true)}
          onOpenRecordPayment={() => setIsRecordPaymentOpen(true)}
          onGlobalSearch={onGlobalSearch}
        />

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav currentTab={currentTab} onSelectTab={onSelectTab} />

      {/* Global Quick Action Modals */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSuccess={handleCreatedReceipt}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        onSuccess={handleCreatedReceipt}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        receipt={activeReceipt}
        isOpen={Boolean(activeReceipt)}
        onClose={() => setActiveReceipt(null)}
      />
    </div>
  );
};
