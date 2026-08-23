import React, { useState } from 'react';
import { useGym } from '@/context/GymContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Search,
  UserPlus,
  DollarSign,
  LogOut,
  Dumbbell,
  ShieldCheck,
  Cloud,
  CheckCircle,
  UploadCloud
} from 'lucide-react';

export interface HeaderProps {
  onOpenAddMember: () => void;
  onOpenRecordPayment: () => void;
  onGlobalSearch?: (query: string) => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddMember,
  onOpenRecordPayment,
  onGlobalSearch,
}) => {
  const { syncState, forceSyncNow, settings } = useGym();
  const { user, gym, logout } = useAuth();
  const [searchVal, setSearchVal] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    if (onGlobalSearch) onGlobalSearch(e.target.value);
  };

  const handleSyncClick = async () => {
    await forceSyncNow();
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[#1E1F22] bg-[#313338] px-4 sm:px-6 shadow-sm">
      {/* Left: Search Bar (Discord Search) */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5865F2] text-white">
            <Dumbbell className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm text-white truncate max-w-[130px]">
            {settings.gym_name.split(' ')[0]}
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative w-full hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#949BA4]" />
          <input
            type="text"
            placeholder="Search members, phone, or GYM code..."
            value={searchVal}
            onChange={handleSearchChange}
            className="w-full rounded bg-[#1E1F22] border border-[#2B2D31] focus:border-[#5865F2] pl-9 pr-8 py-1.5 text-xs text-[#DBDEE1] placeholder:text-[#949BA4] focus:outline-none transition-colors"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#949BA4] bg-[#2B2D31] px-1 py-0.5 rounded">
            /
          </kbd>
        </div>
      </div>

      {/* Right: Sync Pill, Quick Actions & Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Sync Status Pill */}
        <button
          onClick={handleSyncClick}
          title={
            syncState.error
              ? `Sync Error: ${syncState.error}`
              : syncState.is_syncing
              ? 'Synchronizing with cloud...'
              : !syncState.is_online
              ? `Offline — ${syncState.pending_count} changes pending`
              : syncState.pending_count > 0
              ? `${syncState.pending_count} changes queued. Click to sync.`
              : 'Online — Synced'
          }
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer border border-transparent hover:border-[#4E5058] bg-[#2B2D31]"
        >
          {syncState.error ? (
            <>
              <WifiOff className="h-3 w-3 text-red-400" />
              <span className="text-red-400 font-bold">Sync Error</span>
            </>
          ) : syncState.is_syncing ? (
            <>
              <RefreshCw className="h-3 w-3 text-[#5865F2] animate-spin" />
              <span className="text-[#5865F2]">Syncing...</span>
            </>
          ) : !syncState.is_online || syncState.pending_count > 0 ? (
            <>
              <UploadCloud className="h-3 w-3 text-amber-400" />
              <span className="text-amber-400 font-bold">
                {!syncState.is_online ? `Offline (${syncState.pending_count})` : `${syncState.pending_count} Queued`}
              </span>
            </>
          ) : (
            <>
              <CheckCircle className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Online — Synced</span>
            </>
          )}
        </button>

        {/* Quick Action: Record Payment */}
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<DollarSign className="h-3.5 w-3.5 text-[#5865F2]" />}
          onClick={onOpenRecordPayment}
          className="hidden sm:inline-flex"
        >
          Record Pay
        </Button>

        {/* Quick Action: Add Member */}
        <Button
          variant="primary"
          size="sm"
          leftIcon={<UserPlus className="h-3.5 w-3.5" />}
          onClick={onOpenAddMember}
        >
          <span className="hidden xs:inline">+ Member</span>
          <span className="xs:hidden">+</span>
        </Button>

        {/* Admin Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5865F2] text-white text-xs font-bold transition-all cursor-pointer hover:opacity-90"
          >
            {user?.full_name?.charAt(0) || 'D'}
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg bg-[#2B2D31] border border-[#1E1F22] p-2 shadow-modal z-50 animate-fade-in">
              <div className="px-3 py-2 border-b border-[#383A40]">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#5865F2]" />
                  {user?.full_name || 'Dawood Janjua'}
                </p>
                <p className="text-[11px] text-[#949BA4] truncate">{user?.email || 'dawood@gmail.com'}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1E1F22] text-[#DBDEE1]">
                    Owner / Trainer
                  </span>
                  <span className="inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1E1F22] text-emerald-400">
                    Auto-Sync Active
                  </span>
                </div>
              </div>

              <div className="pt-1 space-y-0.5">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#DA373C] rounded hover:bg-[#35373C] transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
