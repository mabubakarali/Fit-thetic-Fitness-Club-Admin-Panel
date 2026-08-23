import React from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  AlertCircle,
  Layers,
  Receipt as ReceiptIcon,
  MessageSquare,
  Settings as SettingsIcon,
  Dumbbell,
  Clock
} from 'lucide-react';
import { useGym } from '@/context/GymContext';

export type NavTab =
  | 'dashboard'
  | 'members'
  | 'payments'
  | 'unpaid'
  | 'plans'
  | 'receipts'
  | 'whatsapp'
  | 'settings';

export interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const { stats, settings } = useGym();

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: 'members',
      label: 'Members',
      icon: <Users className="h-4 w-4" />,
      badge: stats.totalActiveMembers,
      badgeColor: 'bg-[#5865F2] text-white',
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      id: 'unpaid',
      label: 'Unpaid Members',
      icon: <AlertCircle className="h-4 w-4" />,
      badge: stats.unpaidCount > 0 ? stats.unpaidCount : undefined,
      badgeColor: 'bg-[#DA373C] text-white',
    },
    {
      id: 'plans',
      label: 'Membership Plans',
      icon: <Layers className="h-4 w-4" />,
    },
    {
      id: 'receipts',
      label: 'Receipts Archive',
      icon: <ReceiptIcon className="h-4 w-4" />,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp Reminders',
      icon: <MessageSquare className="h-4 w-4" />,
      badge: stats.expiringIn7Days > 0 ? stats.expiringIn7Days : undefined,
      badgeColor: 'bg-[#F0B232] text-black font-bold',
    },
    {
      id: 'settings',
      label: 'Settings & Backups',
      icon: <SettingsIcon className="h-4 w-4" />,
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-60 bg-[#2B2D31] border-r border-[#1E1F22] h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-[#1E1F22] shadow-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/40 border border-white/10 overflow-hidden shadow shrink-0">
          <img
            src="/app-logo.png"
            alt="Fit-Thetic"
            className="h-full w-full object-contain"
            onError={(e) => {
              // Fallback to icon
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        <div className="overflow-hidden">
          <h1 className="font-bold text-sm text-[#F2F3F5] tracking-tight truncate">
            {settings.gym_name}
          </h1>
          <span className="text-[10px] font-semibold text-[#949BA4]">
            Admin Workspace
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <div className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#949BA4]">
          Navigation
        </div>

        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors duration-100 relative group cursor-pointer ${
                isActive
                  ? 'bg-[#404249] text-white font-semibold'
                  : 'text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1]'
              }`}
            >
              {isActive && (
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-white" />
              )}

              <div className="flex items-center gap-2.5">
                <span className={`${isActive ? 'text-white' : 'text-[#949BA4] group-hover:text-[#DBDEE1]'}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    item.badgeColor || 'bg-[#1E1F22] text-[#949BA4]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Summary Bar */}
      <div className="p-2.5 border-t border-[#1E1F22] bg-[#232428]">
        <div className="bg-[#1E1F22] p-2.5 rounded-md space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-[#949BA4] text-[11px]">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="h-3 w-3 text-[#F0B232]" /> Expiring &lt;7d
            </span>
            <span className="font-bold font-mono text-[#F0B232]">{stats.expiringIn7Days}</span>
          </div>
          <div className="flex items-center justify-between text-[#949BA4] text-[11px]">
            <span className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="h-3 w-3 text-[#DA373C]" /> Expired Total
            </span>
            <span className="font-bold font-mono text-[#DA373C]">{stats.expiredCount}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
