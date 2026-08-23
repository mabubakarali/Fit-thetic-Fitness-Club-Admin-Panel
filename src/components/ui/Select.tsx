import React, { forwardRef } from 'react';
import { cn } from './Button';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, children, className, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-[11px] font-bold uppercase tracking-wider text-[#B5BAC1]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'w-full appearance-none rounded bg-[#1E1F22] border border-[#383A40] px-3 py-2 text-xs font-medium text-[#DBDEE1] transition-colors focus:border-[#5865F2] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed pr-8 cursor-pointer',
              error ? 'border-[#DA373C] focus:border-[#DA373C]' : '',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-[#1E1F22] text-[#DBDEE1] py-1">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#949BA4]">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
        {error && <p className="text-[11px] text-[#DA373C] font-semibold">{error}</p>}
        {!error && helperText && <p className="text-[10px] text-[#949BA4]">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
