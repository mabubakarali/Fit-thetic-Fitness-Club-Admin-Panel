import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useGym } from '@/context/GymContext';
import { useToast } from '@/components/ui/Toast';
import {
  parseAndValidateCSV,
  prepareImportBatch,
  CSVImportResult,
} from '@/lib/csvImporter';
import { UploadCloud, FileSpreadsheet, AlertTriangle, CheckCircle, Download, Sparkles } from 'lucide-react';

export interface ImportMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportMembersModal: React.FC<ImportMembersModalProps> = ({ isOpen, onClose }) => {
  const { members, plans, importMembersBatch } = useGym();
  const { showToast } = useToast();

  const [csvText, setCsvText] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || '');
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setCsvText(text);
        const result = await parseAndValidateCSV(text, members, plans);
        setImportResult(result);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const sampleCsv = `Full Name,Phone,Email,Address,Plan,Start Date
Muhammad Ali,03001234567,ali@gmail.com,Chak Shahzad Isb,Monthly Standard,2026-08-01
Hamza Shah,03219876543,hamza@yahoo.com,Meherban Colony,Quarterly Fitness,2026-08-10
Babar Azam,03334567890,babar@gmail.com,Royal Avenue,Annual VIP,2026-08-15`;

    const blob = new Blob(['\uFEFF' + sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'fit_thetic_members_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteImport = async () => {
    if (!importResult || importResult.valid_rows === 0) return;

    setIsProcessing(true);
    try {
      const validRows = importResult.rows.filter((r) => r.is_valid);
      const defaultPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

      // Calculate starting member sequence code
      let highestSeq = 0;
      members.forEach((m) => {
        const match = m.member_code?.match(/GYM-?(\d+)/i);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > highestSeq) highestSeq = num;
        }
      });

      const {
        members: newMembers,
        memberships: newMemberships,
        payments: newPayments,
        receipts: newReceipts,
      } = prepareImportBatch(
        validRows,
        highestSeq + 1,
        defaultPlan,
        plans
      );

      await importMembersBatch(newMembers, newMemberships, newPayments, newReceipts);
      showToast('Import Complete', `Successfully imported ${newMembers.length} members with fee and payment records.`);
      onClose();
      setImportResult(null);
      setCsvText('');
      setFileName('');
    } catch (err: any) {
      showToast('Import Failed', err.message || 'Error during batch import', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Smart Excel & CSV Member Importer"
      description="Upload your existing spreadsheet. The AI extractor auto-detects names, phones, plans, and dates even if column headers don't match."
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Smart Recognition Banner */}
        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-3.5 rounded-xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Intelligent Column Extraction</p>
              <p className="text-[11px] text-muted-foreground">Upload any Excel/CSV sheet. Non-standard headers & date formats are auto-resolved.</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            leftIcon={<Download className="h-3.5 w-3.5" />}
            onClick={handleDownloadSample}
          >
            Sample Format
          </Button>
        </div>

        {/* Upload Zone */}
        <div className="border-2 border-dashed border-border/80 hover:border-emerald-500/50 transition-colors rounded-xl p-6 text-center bg-card/30">
          <input
            type="file"
            id="csv-upload"
            accept=".csv,.txt,.tsv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <UploadCloud className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-foreground">
              {fileName ? fileName : 'Click to select your Excel (.csv / .tsv) file'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Auto-extracts athlete names, phone numbers, plans, join dates, and validity.
            </p>
          </label>
        </div>

        {/* Fallback Plan Selector */}
        <Select
          label="Fallback Membership Plan (for rows without specified plan)"
          value={selectedPlanId}
          onChange={(e) => setSelectedPlanId(e.target.value)}
          options={plans.map((p) => ({
            value: p.id,
            label: `${p.name} — Rs. ${p.price.toLocaleString()} (${p.duration_days} days)`,
          }))}
        />

        {/* Preview & Validation Results */}
        {importResult && (
          <div className="space-y-3 animate-fade-in">
            {/* Stats Pills */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="bg-secondary/60 p-2.5 rounded-lg border border-border/80">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Detected</span>
                <span className="text-sm font-bold text-foreground">{importResult.total_rows} Rows</span>
              </div>
              <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                <span className="text-emerald-500 block text-[10px] uppercase font-bold">Extracted & Ready</span>
                <span className="text-sm font-bold text-emerald-500">{importResult.valid_rows} Athletes</span>
              </div>
              <div className="bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                <span className="text-rose-500 block text-[10px] uppercase font-bold">Duplicate / Skipped</span>
                <span className="text-sm font-bold text-rose-500">{importResult.invalid_rows} Rows</span>
              </div>
            </div>

            {/* Preview Table */}
            <div className="max-h-52 overflow-y-auto rounded-lg border border-border/80 text-xs">
              <table className="w-full text-left">
                <thead className="bg-secondary/60 text-[10px] uppercase text-muted-foreground border-b border-border/80 sticky top-0">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Extracted Name</th>
                    <th className="p-2">Phone</th>
                    <th className="p-2">Matched Plan</th>
                    <th className="p-2">Start Date</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {importResult.rows.map((row) => (
                    <tr key={row.row_index} className={row.is_valid ? 'hover:bg-muted/30' : 'bg-rose-500/5'}>
                      <td className="p-2 font-mono text-muted-foreground">{row.row_index}</td>
                      <td className="p-2 font-semibold text-foreground">{row.full_name || '—'}</td>
                      <td className="p-2 font-mono text-xs text-muted-foreground">{row.phone || '—'}</td>
                      <td className="p-2 text-xs text-emerald-400 font-medium">{row.plan_name || 'Default Plan'}</td>
                      <td className="p-2 text-xs font-mono text-muted-foreground">{row.start_date}</td>
                      <td className="p-2">
                        {row.is_valid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
                            <CheckCircle className="h-3 w-3" /> Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-500 font-medium">
                            <AlertTriangle className="h-3 w-3" /> {row.errors.join(', ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
          <Button variant="outline" size="md" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<FileSpreadsheet className="h-4 w-4" />}
            isLoading={isProcessing}
            disabled={!importResult || importResult.valid_rows === 0}
            onClick={handleExecuteImport}
          >
            Import {importResult ? importResult.valid_rows : 0} Athletes
          </Button>
        </div>
      </div>
    </Modal>
  );
};
