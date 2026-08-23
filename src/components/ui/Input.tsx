import React, { forwardRef } from 'react';
import { cn } from './Button';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-[11px] font-bold uppercase tracking-wider text-[#B5BAC1]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-[#949BA4]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full rounded bg-[#1E1F22] border border-[#383A40] px-3 py-2 text-xs font-medium text-[#DBDEE1] placeholder:text-[#949BA4] transition-colors focus:border-[#5865F2] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon ? 'pl-9' : '',
              rightIcon ? 'pr-9' : '',
              error ? 'border-[#DA373C] focus:border-[#DA373C]' : '',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center text-[#949BA4]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-[11px] text-[#DA373C] font-semibold">{error}</p>}
        {!error && helperText && <p className="text-[10px] text-[#949BA4]">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
