import React, { useState, useRef } from 'react';
import { useGym } from '@/context/GymContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  Settings as SettingsIcon,
  Save,
  RefreshCw,
  Database,
  Cloud,
  Wifi,
  WifiOff,
  RotateCcw,
  Download,
  Upload,
  CheckCircle,
  FileSpreadsheet,
  ShieldCheck,
  FileJson,
  UploadCloud,
  Laptop,
  Edit3,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText
} from 'lucide-react';
import { exportMembersToExcelCSV, exportPaymentsToExcelCSV } from '@/lib/exportUtils';
import { getApiUrl, setApiUrl } from '@/lib/syncEngine';

export const Settings: React.FC = () => {
  const {
    settings,
    updateSettings,
    syncState,
    forceSyncNow,
    resetToDemoData,
    members,
    payments,
    receipts,
    enrichedMembers,
    enrichedPayments,
    exportFullDatabaseBackup,
    importFullDatabaseBackup,
  } = useGym();

  const { authMode, gym, user } = useAuth();
  const { showToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [gymName, setGymName] = useState(settings.gym_name);
  const [ownerName, setOwnerName] = useState(settings.owner_name || 'Dawood Janjua');
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email || '');
  const [address, setAddress] = useState(settings.address);
  const [currency, setCurrency] = useState(settings.currency);
  const [receiptFooter, setReceiptFooter] = useState(settings.receipt_footer);
  const [showCloudModal, setShowCloudModal] = useState(false);

  const handleOpenEditModal = () => {
    setGymName(settings.gym_name);
    setOwnerName(settings.owner_name || 'Dawood Janjua');
    setPhone(settings.phone);
    setEmail(settings.email || '');
    setAddress(settings.address);
    setCurrency(settings.currency);
    setReceiptFooter(settings.receipt_footer);
    setIsEditModalOpen(true);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings({
        gym_name: gymName.trim(),
        owner_name: ownerName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim(),
        currency: currency.trim() || 'Rs.',
        receipt_footer: receiptFooter.trim(),
      });
      setIsEditModalOpen(false);
      showToast('Settings Updated & Synced', 'Gym profile, owner info, and receipts updated across all devices.', 'success');
    } catch (err: any) {
      showToast('Error', 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const [apiUrl, setApiUrlState] = useState(getApiUrl());

  const handleSaveApiUrl = () => {
    setApiUrl(apiUrl);
    showToast('Backend URL Saved', `Cloud backend set to ${apiUrl}`, 'success');
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      const res = await forceSyncNow();
      if (res.success) {
        showToast(
          'Synchronization Complete',
          `Pushed ${res.pushed} local changes and pulled ${res.pulled} remote updates.`,
          'success'
        );
      } else {
        showToast(
          'Sync Incomplete',
          res.errorMessage || `${res.errors} items failed to sync. Working in offline mode.`,
          'warning'
        );
      }
    } catch (err: any) {
      showToast('Sync Error', err?.message || 'Could not reach sync backend.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportMembersCSV = () => {
    try {
      exportMembersToExcelCSV(enrichedMembers, payments, settings);
      showToast('Excel/CSV Downloaded', `Exported ${enrichedMembers.length} member records with last payments, validity, and total revenue summary.`, 'success');
    } catch (err) {
      showToast('Export Error', 'Failed to export members report.', 'error');
    }
  };

  const handleExportPaymentsCSV = () => {
    try {
      exportPaymentsToExcelCSV(enrichedPayments, settings);
      showToast('Excel/CSV Downloaded', `Exported ${enrichedPayments.length} payment transactions with total revenue summary.`, 'success');
    } catch (err) {
      showToast('Export Error', 'Failed to export payments report.', 'error');
    }
  };

  const handleExportFullJSON = () => {
    try {
      exportFullDatabaseBackup();
      showToast('Full Backup Downloaded', 'Database backup file (.JSON) saved to your device.', 'success');
    } catch (err) {
      showToast('Backup Error', 'Failed to generate backup JSON.', 'error');
    }
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const confirmRestore = window.confirm(
        'Are you sure you want to restore this database backup? This will replace the current local database with the contents of the backup file.'
      );

      if (!confirmRestore) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setIsImporting(true);
      try {
        const result = await importFullDatabaseBackup(content);
        showToast(
          'Database Restored Successfully!',
          `Restored ${result.memberCount} members, ${result.paymentCount} payments, and ${result.receiptCount} receipts.`,
          'success'
        );
      } catch (err: any) {
        showToast('Restore Failed', err.message || 'Could not parse backup file.', 'error');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const handleResetDemo = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset all data back to the clean demonstration seed? All local modifications will be overwritten.'
    );
    if (!confirmed) return;

    setIsResetting(true);
    try {
      await resetToDemoData();
      showToast('Data Reset', 'All records have been reset to clean demo state.', 'success');
    } catch (err) {
      showToast('Error', 'Failed to reset demo data', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Hidden File Input for Database Import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
        className="hidden"
        onChange={handleImportFileSelect}
      />

      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Gym Settings & Backup Center</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure gym profile, manage offline database, cloud synchronization, and system backups.
        </p>
      </div>

      {/* Cloud Synchronization & Multi-Device Card */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#5865F2]/10 text-[#5865F2]">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Cloud Synchronization (MongoDB Atlas)</h3>
              <p className="text-xs text-muted-foreground">
                Sync records across Windows laptop, mobile PWA, and browser
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="xs"
              leftIcon={<RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />}
              isLoading={isSyncing}
              onClick={handleForceSync}
            >
              Sync to Cloud Now
            </Button>
          </div>
        </div>

        {/* Sync Server URL Config */}
        <div className="bg-secondary/20 p-3.5 rounded-xl border border-border/70 space-y-2">
          <label className="text-xs font-bold text-foreground block">
            Cloud Backend API URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrlState(e.target.value)}
              placeholder="http://localhost:5000 or https://your-api.onrender.com"
              className="flex-1 rounded-lg bg-background border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-[#5865F2]"
            />
            <Button size="xs" variant="secondary" onClick={handleSaveApiUrl}>
              Save URL
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Development: <code className="text-xs text-foreground">http://localhost:5000</code> | Cloud: <code className="text-xs text-foreground">https://your-domain.com</code>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-secondary/40 p-3 rounded-xl border border-border/80">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Sync Status</span>
            <div className="flex items-center gap-1.5 font-bold mt-1">
              {syncState.error ? (
                <span className="text-red-400 flex items-center gap-1">
                  <WifiOff className="h-3.5 w-3.5" /> Sync Error
                </span>
              ) : syncState.is_syncing ? (
                <span className="text-[#5865F2] flex items-center gap-1">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Syncing...
                </span>
              ) : !syncState.is_online ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <WifiOff className="h-3.5 w-3.5" /> Offline — {syncState.pending_count} pending
                </span>
              ) : syncState.pending_count > 0 ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <UploadCloud className="h-3.5 w-3.5" /> {syncState.pending_count} Queued
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Online — Synced
                </span>
              )}
            </div>
          </div>

          <div className="bg-secondary/40 p-3 rounded-xl border border-border/80">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Active Gym Workspace</span>
            <div className="font-bold text-foreground mt-1 truncate">
              {settings.gym_name || 'Fit-Thetic Fitness Club'}
            </div>
          </div>

          <div className="bg-secondary/40 p-3 rounded-xl border border-border/80">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Device Identifier</span>
            <div className="font-mono text-[11px] text-muted-foreground mt-1 truncate flex items-center gap-1">
              <Laptop className="h-3 w-3" />
              {syncState.device_id}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
          <span>
            Last Synced:{' '}
            <strong className="text-foreground">
              {syncState.last_synced_at ? new Date(syncState.last_synced_at).toLocaleTimeString() : 'Never'}
            </strong>
          </span>
          <span>
            Pending Offline Queue:{' '}
            <strong className={syncState.pending_count > 0 ? 'text-amber-400' : 'text-emerald-400'}>
              {syncState.pending_count} changes
            </strong>
          </span>
        </div>
      </Card>

      {/* Local Storage Engine Overview */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Local Storage Engine</h3>
              <p className="text-xs text-muted-foreground">High-speed local IndexedDB persistent database active on this machine</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Local Database Active</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-secondary/40 p-3 rounded-xl border border-border/80">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">System Status</span>
            <div className="flex items-center gap-1.5 font-bold text-emerald-400 mt-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Operational
            </div>
          </div>

          <div className="bg-secondary/40 p-3 rounded-xl border border-border/80">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Storage Engine</span>
            <div className="flex items-center gap-1.5 font-bold text-foreground mt-1">
              <Database className="h-3.5 w-3.5 text-[#5865F2]" />
              Local IndexedDB
            </div>
          </div>

          <div className="bg-secondary/40 p-3 rounded-xl border border-border/80">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Members</span>
            <div className="font-bold text-foreground mt-1">
              {members.length} Registered
            </div>
          </div>

          <div className="bg-secondary/40 p-3 rounded-xl border border-border/80">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Payments</span>
            <div className="font-bold text-emerald-400 mt-1">
              {payments.length} Records
            </div>
          </div>
        </div>
      </Card>

      {/* Gym Information & Branding Overview Card */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-500">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Gym Profile & Branding</h3>
              <p className="text-xs text-muted-foreground">Appears on receipts, top headers, and WhatsApp member messages</p>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Edit3 className="h-4 w-4" />}
            onClick={handleOpenEditModal}
          >
            Edit Gym Details
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-secondary/40 p-3 rounded-xl border border-border/80 space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold flex items-center gap-1">
              <Building2 className="h-3 w-3 text-brand-400" /> Gym Name
            </span>
            <div className="font-bold text-foreground text-sm truncate">
              {settings.gym_name}
            </div>
          </div>

          <div className="bg-secondary/40 p-3 rounded-xl border border-border/80 space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold flex items-center gap-1">
              <User className="h-3 w-3 text-brand-400" /> Owner / Head Trainer
            </span>
            <div className="font-bold text-foreground text-sm truncate">
              {settings.owner_name || 'Dawood Janjua'}
            </div>
          </div>

          <div className="bg-secondary/40 p-3 rounded-xl border border-border/80 space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold flex items-center gap-1">
              <Phone className="h-3 w-3 text-emerald-400" /> Contact Phone / WhatsApp
            </span>
            <div className="font-bold font-mono text-emerald-400 text-sm truncate">
              {settings.phone}
            </div>
          </div>

          <div className="bg-secondary/40 p-3 rounded-xl border border-border/80 space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold flex items-center gap-1">
              <Mail className="h-3 w-3 text-sky-400" /> Email Address
            </span>
            <div className="font-medium text-foreground truncate">
              {settings.email || 'None'}
            </div>
          </div>

          <div className="bg-secondary/40 p-3 rounded-xl border border-border/80 space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Currency</span>
            <div className="font-bold font-mono text-foreground">
              {settings.currency || 'Rs.'}
            </div>
          </div>

          <div className="bg-secondary/40 p-3 rounded-xl border border-border/80 space-y-1 sm:col-span-2 md:col-span-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold flex items-center gap-1">
              <MapPin className="h-3 w-3 text-amber-400" /> Physical Address
            </span>
            <div className="font-medium text-muted-foreground truncate">
              {settings.address}
            </div>
          </div>

          <div className="bg-secondary/40 p-3 rounded-xl border border-border/80 space-y-1 sm:col-span-2 md:col-span-3">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold flex items-center gap-1">
              <FileText className="h-3 w-3 text-muted-foreground" /> Receipt Footer Terms
            </span>
            <div className="text-xs text-muted-foreground italic">
              "{settings.receipt_footer}"
            </div>
          </div>
        </div>
      </Card>

      {/* Edit Gym Details Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Gym Profile & Branding"
        description="Update details for Fit-thetic Gym. Changes sync to all phones and computers automatically."
        maxWidth="lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Save className="h-4 w-4" />}
              isLoading={isSaving}
              onClick={handleSaveSettings}
            >
              Save & Sync Changes
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveSettings} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Gym Name *"
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              placeholder="Fit-thetic Fitness Club"
              required
            />

            <Input
              label="Owner / Head Trainer Name *"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Dawood Janjua"
              required
            />

            <Input
              label="Contact Phone / WhatsApp *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="03330538182"
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dawood@gmail.com"
            />

            <Input
              label="Currency Symbol *"
              placeholder="e.g. Rs. or PKR"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              required
            />

            <div className="sm:col-span-2">
              <Input
                label="Physical Address *"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Royal Avenue, Meherban Colony, Chak Shahzad, Isb"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Receipt Footer / Terms Note *"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                helperText="Printed on bottom of all member receipts"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Full Database Backup & Restore Center */}
      <Card className="p-5 space-y-4">
        <div className="border-b border-border/60 pb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileJson className="h-4 w-4 text-[#5865F2]" /> Full Database Backup & Restore (.JSON)
          </h3>
          <p className="text-xs text-muted-foreground">
            Complete database snapshot containing all members, plans, payments, receipts, and settings.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Export Full JSON */}
          <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
            <h4 className="text-xs font-bold text-foreground">Export Full System Backup</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Download a complete offline copy of all records. Keep this file safe on a USB drive or cloud drive.
            </p>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              onClick={handleExportFullJSON}
              className="w-full mt-2 font-bold"
            >
              Export Backup (.JSON)
            </Button>
          </div>

          {/* Import Full JSON */}
          <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
            <h4 className="text-xs font-bold text-foreground">Restore Database from Backup</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Upload a previously downloaded <code className="text-emerald-400">.json</code> backup to restore all members and data.
            </p>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Upload className="h-3.5 w-3.5" />}
              isLoading={isImporting}
              onClick={() => fileInputRef.current?.click()}
              className="w-full mt-2 font-bold"
            >
              Restore Database (.JSON)
            </Button>
          </div>
        </div>
      </Card>

      {/* CSV / Excel Export Center */}
      <Card className="p-5 space-y-4">
        <div className="border-b border-border/60 pb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Excel & CSV Reports
          </h3>
          <p className="text-xs text-muted-foreground">Export spreadsheets for accounting and record keeping</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border">
            <div>
              <p className="text-xs font-semibold text-foreground">Members List</p>
              <p className="text-[10px] text-muted-foreground">{members.length} registered athletes</p>
            </div>
            <Button
              variant="outline"
              size="xs"
              leftIcon={<Download className="h-3 w-3" />}
              onClick={handleExportMembersCSV}
            >
              Export CSV
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border">
            <div>
              <p className="text-xs font-semibold text-foreground">Payments Ledger</p>
              <p className="text-[10px] text-muted-foreground">{payments.length} transactions</p>
            </div>
            <Button
              variant="outline"
              size="xs"
              leftIcon={<Download className="h-3 w-3" />}
              onClick={handleExportPaymentsCSV}
            >
              Export CSV
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/60">
          <div>
            <p className="text-xs font-semibold text-rose-400">Initialize / Reset Database</p>
            <p className="text-[11px] text-muted-foreground">Clear all local modifications and restore a fresh database</p>
          </div>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            isLoading={isResetting}
            onClick={handleResetDemo}
          >
            Reset Database
          </Button>
        </div>
      </Card>
    </div>
  );
};
