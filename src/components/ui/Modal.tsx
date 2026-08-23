import React, { useEffect } from 'react';
import { cn } from './Button';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'lg',
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog: Discord Modal Container */}
      <div
        className={cn(
          'relative w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] flex flex-col rounded-lg bg-[#313338] text-[#F2F3F5] shadow-modal transition-all animate-modal z-10 overflow-hidden border border-[#2B2D31]',
          maxWidths[maxWidth],
          className
        )}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 sm:px-6 py-4 bg-[#313338]">
          <div className="space-y-0.5 pr-4">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">{title}</h2>
            {description && (
              <p className="text-xs text-[#949BA4] line-clamp-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1] transition-colors focus:outline-none shrink-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 overscroll-contain bg-[#313338]">
          {children}
        </div>

        {/* Fixed Footer */}
        {footer && (
          <div className="shrink-0 flex items-center justify-end gap-3 px-5 sm:px-6 py-3.5 bg-[#2B2D31] border-t border-[#1E1F22]/40">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
