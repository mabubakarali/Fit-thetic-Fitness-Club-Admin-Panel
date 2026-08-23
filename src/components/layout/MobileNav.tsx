import React, { useState } from 'react';
import { NavTab } from './Sidebar';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  AlertCircle,
  MoreHorizontal,
  Layers,
  Receipt,
  MessageSquare,
  Settings,
  X
} from 'lucide-react';
import { useGym } from '@/context/GymContext';

export interface MobileNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentTab, onSelectTab }) => {
  const { stats } = useGym();
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);

  const mainItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: 'members', label: 'Members', icon: <Users className="h-5 w-5" />, badge: stats.totalActiveMembers },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="h-5 w-5" /> },
    { id: 'unpaid', label: 'Unpaid', icon: <AlertCircle className="h-5 w-5" />, badge: stats.unpaidCount },
  ];

  const moreItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'plans', label: 'Membership Plans', icon: <Layers className="h-5 w-5" /> },
    { id: 'receipts', label: 'Receipts Archive', icon: <Receipt className="h-5 w-5" /> },
    { id: 'whatsapp', label: 'WhatsApp Reminders', icon: <MessageSquare className="h-5 w-5" />, badge: stats.expiringIn7Days },
    { id: 'settings', label: 'Settings & Backups', icon: <Settings className="h-5 w-5" /> },
  ];

  return (
    <>
      {/* Bottom Sticky Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 border-t border-border/80 px-2 py-1.5 backdrop-blur-md">
        <div className="flex items-center justify-around">
          {mainItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`relative flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors flex-1 ${
                  isActive ? 'text-emerald-500 font-semibold' : 'text-muted-foreground'
                }`}
              >
                <div className="relative">
                  {item.icon}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setShowMoreDrawer(true)}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors flex-1 ${
              moreItems.some((i) => i.id === currentTab) ? 'text-emerald-500 font-semibold' : 'text-muted-foreground'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">More</span>
          </button>
        </div>
      </nav>

      {/* More Drawer */}
      {showMoreDrawer && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-t-2xl border-t border-border p-5 space-y-4 shadow-modal">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-bold text-foreground">Additional Modules</h3>
              <button
                onClick={() => setShowMoreDrawer(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {moreItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setShowMoreDrawer(false);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                    currentTab === item.id
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-semibold'
                      : 'bg-secondary/40 border-border/80 text-foreground hover:bg-secondary'
                  }`}
                >
                  <div className="text-emerald-500">{item.icon}</div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-semibold truncate">{item.label}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
