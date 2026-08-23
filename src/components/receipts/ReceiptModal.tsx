import React, { useState, useRef, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { EnrichedReceipt, Receipt } from '@/types/database';
import { useGym } from '@/context/GymContext';
import { useToast } from '@/components/ui/Toast';
import { Printer, Download, Dumbbell, CheckCircle2, MessageSquare, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';

export interface ReceiptModalProps {
  receipt: EnrichedReceipt | Receipt | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt: rawReceipt, isOpen, onClose }) => {
  const { settings, getEnrichedReceipt } = useGym();
  const { showToast } = useToast();
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Safe resolver for enriched receipt
  const receipt = useMemo<EnrichedReceipt | null>(() => {
    if (!rawReceipt) return null;
    const asEnriched = rawReceipt as EnrichedReceipt;
    if (asEnriched.member && asEnriched.payment && asEnriched.membership && asEnriched.plan) {
      return asEnriched;
    }
    return getEnrichedReceipt(rawReceipt);
  }, [rawReceipt, getEnrichedReceipt]);

  // Clean formatted phone number for WhatsApp
  const formattedPhone = useMemo(() => {
    if (!receipt?.member?.phone) return '923000000000';
    const clean = receipt.member.phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('92')) return clean;
    if (clean.startsWith('0')) return `92${clean.slice(1)}`;
    if (clean.startsWith('3') && clean.length === 10) return `92${clean}`;
    return `92${clean}`;
  }, [receipt?.member?.phone]);

  // Pre-typed WhatsApp message
  const whatsappMessage = useMemo(() => {
    if (!receipt) return '';
    const paymentDateStr = receipt.payment?.payment_date 
      ? format(new Date(receipt.payment.payment_date), 'dd/MM/yyyy') 
      : format(new Date(), 'dd/MM/yyyy');

    return (
      `*FIT-THETIC FITNESS CLUB — OFFICIAL PAYMENT RECEIPT* 🧾\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Receipt No:* ${receipt.receipt_number || 'N/A'}\n` +
      `*Date:* ${paymentDateStr}\n` +
      `*Member ID:* ${receipt.member?.member_code || 'N/A'}\n` +
      `*Member Name:* ${receipt.member?.full_name || 'Member'}\n\n` +
      `*Plan:* ${receipt.plan?.name || 'Standard Plan'}\n` +
      `*Validity:* ${receipt.membership?.start_date || ''} to ${receipt.membership?.end_date || ''}\n` +
      `*Amount Paid:* Rs. ${(receipt.payment?.amount || 0).toLocaleString()} (${(receipt.payment?.payment_method || 'cash').toUpperCase()})\n` +
      `${receipt.payment?.transaction_reference ? `*Ref / Trx:* ${receipt.payment.transaction_reference}\n` : ''}` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Thank you for training with Fit-Thetic Fitness Club!_\n` +
      `*Dawood Janjua (Owner / Head Trainer)*\n` +
      `Royal Avenue, Meherban Colony, Chak Shahzad, Isb\n` +
      `Ph: 03216422429`
    );
  }, [receipt]);

  const whatsappUrl = useMemo(() => {
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsappMessage)}`;
  }, [formattedPhone, whatsappMessage]);

  if (!receipt || !isOpen) return null;

  const currency = settings.currency || 'Rs.';

  const handlePrint = () => {
    window.print();
  };

  // Convert receipt DOM to image Blob
  const generateReceiptBlob = async (): Promise<Blob | null> => {
    if (!receiptRef.current) return null;
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      });
    } catch (err) {
      console.error('Error rendering receipt image:', err);
      return null;
    }
  };

  // Download Receipt Image PNG
  const handleDownloadImage = async () => {
    setIsGeneratingImage(true);
    try {
      const blob = await generateReceiptBlob();
      if (!blob) throw new Error('Could not generate receipt image');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FitThetic-Receipt-${receipt.receipt_number}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Receipt Downloaded', `Saved as FitThetic-Receipt-${receipt.receipt_number}.png`);
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to download receipt image', 'error');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Copy Image to Clipboard
  const handleCopyImage = async () => {
    try {
      const blob = await generateReceiptBlob();
      if (!blob) throw new Error('Could not generate image');
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 3000);
        showToast('Image Copied!', 'Receipt image copied to clipboard. Press Ctrl+V in WhatsApp to paste.');
      } else {
        throw new Error('Clipboard image copy not supported on this browser');
      }
    } catch (err: any) {
      showToast('Copy Failed', err.message || 'Could not copy image', 'error');
    }
  };

  const onWhatsAppClick = () => {
    generateReceiptBlob().then(async (blob) => {
      if (blob) {
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
          }
        } catch (e) {}

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FitThetic-Receipt-${receipt.receipt_number}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    });

    showToast(
      'WhatsApp Opening',
      'Receipt details pre-typed for member. Image copied to clipboard — press Ctrl+V in WhatsApp chat!'
    );
  };

  const modalFooter = (
    <div className="flex flex-wrap items-center justify-between gap-2 w-full">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handlePrint} leftIcon={<Printer className="h-3.5 w-3.5" />}>
          Print
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownloadImage}
          isLoading={isGeneratingImage}
          leftIcon={<Download className="h-3.5 w-3.5" />}
        >
          Download PNG
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopyImage}
          leftIcon={copiedImage ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        >
          {copiedImage ? 'Copied!' : 'Copy Image'}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onWhatsAppClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-[#23A55A] hover:bg-[#1C8B4C] text-white font-bold transition-colors cursor-pointer shadow-sm"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Share on WhatsApp</span>
        </a>
      </div>
    </div>
  );

  const formattedGeneratedDate = receipt.generated_at
    ? format(new Date(receipt.generated_at), 'dd MMM yyyy, hh:mm a')
    : format(new Date(), 'dd MMM yyyy, hh:mm a');

  const formattedPaymentDate = receipt.payment?.payment_date
    ? format(new Date(receipt.payment.payment_date), 'dd/MM/yyyy')
    : format(new Date(), 'dd/MM/yyyy');

  const formattedPaymentDateLong = receipt.payment?.payment_date
    ? format(new Date(receipt.payment.payment_date), 'dd MMMM yyyy')
    : format(new Date(), 'dd MMMM yyyy');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Digital Payment Receipt"
      description={`Receipt #${receipt.receipt_number} • Generated on ${formattedGeneratedDate}`}
      maxWidth={printFormat === 'a4' ? '2xl' : 'md'}
      footer={modalFooter}
    >
      <div className="space-y-4">
        {/* Format Selector */}
        <div className="flex items-center justify-between bg-[#1E1F22] p-1.5 rounded-md border border-[#383A40] no-print">
          <span className="text-xs font-semibold text-[#949BA4] px-2">Receipt Style:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPrintFormat('thermal')}
              className={`text-xs font-medium px-3 py-1 rounded transition-colors cursor-pointer ${
                printFormat === 'thermal'
                  ? 'bg-[#5865F2] text-white font-semibold'
                  : 'text-[#949BA4] hover:text-[#DBDEE1]'
              }`}
            >
              80mm Thermal Slip
            </button>
            <button
              onClick={() => setPrintFormat('a4')}
              className={`text-xs font-medium px-3 py-1 rounded transition-colors cursor-pointer ${
                printFormat === 'a4'
                  ? 'bg-[#5865F2] text-white font-semibold'
                  : 'text-[#949BA4] hover:text-[#DBDEE1]'
              }`}
            >
              A4 Invoice Sheet
            </button>
          </div>
        </div>

        {/* Printable & Capture Container */}
        <div
          ref={receiptRef}
          id="printable-receipt"
          className="bg-white text-slate-900 rounded-lg p-5 border border-slate-300 shadow-sm"
        >
          {printFormat === 'thermal' ? (
            /* ================= 80MM POS THERMAL LAYOUT ================= */
            <div className="max-w-[320px] mx-auto text-center font-mono text-xs leading-relaxed space-y-3 text-black">
              {/* Gym Header */}
              <div className="space-y-1 pb-2 border-b border-dashed border-slate-400">
                <div className="flex items-center justify-center gap-1.5 font-bold text-sm tracking-wider uppercase text-black">
                  <Dumbbell className="h-4 w-4" />
                  <span>{settings.gym_name}</span>
                </div>
                <p className="text-[11px] text-slate-600">{settings.address}</p>
                <p className="text-[11px] text-slate-600 font-bold">Ph: {settings.phone}</p>
              </div>

              {/* Receipt Meta */}
              <div className="text-left text-[11px] space-y-0.5 py-1 border-b border-dashed border-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt No:</span>
                  <span className="font-bold">{receipt.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>{formattedPaymentDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Member ID:</span>
                  <span className="font-bold">{receipt.member?.member_code || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Member Name:</span>
                  <span className="font-semibold">{receipt.member?.full_name || 'Member'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Contact:</span>
                  <span>{receipt.member?.phone || '—'}</span>
                </div>
              </div>

              {/* Membership Breakdown */}
              <div className="text-left text-[11px] space-y-1 py-1 border-b border-dashed border-slate-400">
                <div className="flex justify-between font-bold">
                  <span>Plan Description</span>
                  <span>Amount</span>
                </div>
                <div className="flex justify-between">
                  <span className="truncate pr-2">{receipt.plan?.name || 'Membership'}</span>
                  <span className="font-bold">{currency} {(receipt.payment?.amount || 0).toLocaleString()}</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Validity: {receipt.membership?.start_date} to {receipt.membership?.end_date}
                </div>
              </div>

              {/* Payment Info */}
              <div className="text-left text-[11px] space-y-0.5 py-1 border-b border-dashed border-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-500">Method:</span>
                  <span className="uppercase font-semibold">{(receipt.payment?.payment_method || 'cash').replace('_', ' ')}</span>
                </div>
                {receipt.payment?.transaction_reference && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ref / Trx:</span>
                    <span>{receipt.payment.transaction_reference}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1">
                  <span>TOTAL PAID:</span>
                  <span>{currency} {(receipt.payment?.amount || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Footer & Signature */}
              <div className="pt-2 space-y-2 text-[10px] text-slate-600">
                <div className="pt-3 flex justify-between items-end border-b border-slate-300 pb-1">
                  <span>Authorized Signature:</span>
                  <span className="font-serif italic font-bold text-black">Dawood Janjua</span>
                </div>
                <p className="text-[9px] leading-tight italic">{settings.receipt_footer}</p>
                <p className="text-[9px] text-slate-400">Printed: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
              </div>
            </div>
          ) : (
            /* ================= A4 INVOICE SHEET LAYOUT ================= */
            <div className="space-y-6 text-sm text-slate-800 p-4">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-5">
                <div>
                  <div className="flex items-center gap-2 font-bold text-xl text-[#5865F2]">
                    <Dumbbell className="h-6 w-6" />
                    <span>{settings.gym_name}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{settings.address}</p>
                  <p className="text-xs text-slate-500">Phone: {settings.phone} • Email: {settings.email}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full mb-1">
                    <CheckCircle2 className="h-3 w-3" /> OFFICIAL RECEIPT
                  </span>
                  <p className="font-bold text-base text-slate-900">{receipt.receipt_number}</p>
                  <p className="text-xs text-slate-500">Date: {formattedPaymentDateLong}</p>
                </div>
              </div>

              {/* Billed To / Details */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400 mb-1">Billed To (Member)</p>
                  <p className="font-bold text-slate-900 text-base">{receipt.member?.full_name || 'Member'}</p>
                  <p className="text-xs text-slate-600">Member ID: <span className="font-mono font-bold text-[#5865F2]">{receipt.member?.member_code || 'N/A'}</span></p>
                  <p className="text-xs text-slate-600">Phone: {receipt.member?.phone || '—'}</p>
                  {receipt.member?.email && <p className="text-xs text-slate-600">Email: {receipt.member.email}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase text-slate-400 mb-1">Membership Period</p>
                  <p className="font-semibold text-slate-900">{receipt.plan?.name || 'Standard Plan'}</p>
                  <p className="text-xs text-slate-600">Start Date: <span className="font-medium">{receipt.membership?.start_date}</span></p>
                  <p className="text-xs text-slate-600">End Date: <span className="font-medium text-[#5865F2]">{receipt.membership?.end_date}</span></p>
                  <p className="text-xs text-slate-500 mt-1">Duration: {receipt.plan?.duration_days || 30} Days</p>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-xs font-semibold text-slate-600 uppercase">
                    <tr>
                      <th className="p-3">Description</th>
                      <th className="p-3">Method</th>
                      <th className="p-3">Reference</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    <tr>
                      <td className="p-3 font-medium text-slate-900">
                        {receipt.plan?.name || 'Membership'} Fee
                        <div className="text-[11px] text-slate-400">{receipt.membership?.notes || 'Full gym facility access'}</div>
                      </td>
                      <td className="p-3 uppercase font-medium">{(receipt.payment?.payment_method || 'cash').replace('_', ' ')}</td>
                      <td className="p-3 font-mono">{receipt.payment?.transaction_reference || '—'}</td>
                      <td className="p-3 text-right font-bold text-slate-900">{currency} {(receipt.payment?.amount || 0).toLocaleString()}</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="p-3 text-right text-slate-600">Total Paid:</td>
                      <td className="p-3 text-right text-[#5865F2] text-base font-extrabold">{currency} {(receipt.payment?.amount || 0).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Footer */}
              <div className="flex justify-between items-end pt-4 border-t border-slate-200 text-xs text-slate-500">
                <div className="max-w-md space-y-1">
                  <p className="font-semibold text-slate-700">Terms & Conditions:</p>
                  <p className="text-[11px] leading-relaxed">{settings.receipt_footer}</p>
                </div>
                <div className="text-center">
                  <div className="w-36 border-b border-slate-400 pb-1 font-serif italic text-slate-800 font-bold">Dawood Janjua</div>
                  <span className="text-[10px] text-slate-400">Head Trainer / Owner</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
