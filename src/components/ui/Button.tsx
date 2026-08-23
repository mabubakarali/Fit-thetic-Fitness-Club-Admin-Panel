import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#5865F2] focus:ring-offset-2 focus:ring-offset-[#1E1F22] disabled:opacity-50 disabled:cursor-not-allowed select-none active:brightness-90 cursor-pointer text-xs';

  const variants = {
    primary:
      'bg-[#5865F2] hover:bg-[#4752C4] active:bg-[#3C45A5] text-white font-semibold',
    secondary:
      'bg-[#4E5058] hover:bg-[#6D6F78] text-white font-medium border border-transparent',
    outline:
      'border border-[#4E5058] bg-transparent hover:bg-[#4E5058]/30 text-[#DBDEE1] hover:text-white',
    ghost:
      'bg-transparent hover:bg-[#35373C] text-[#949BA4] hover:text-[#DBDEE1]',
    danger:
      'bg-[#DA373C] hover:bg-[#A12828] text-white font-semibold',
    success:
      'bg-[#23A55A] hover:bg-[#1C8B4C] text-white font-semibold',
  };

  const sizes = {
    xs: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    sm: 'text-xs px-3.5 py-1.5 gap-1.5 font-semibold',
    md: 'text-xs px-4 py-2 gap-2 font-semibold',
    lg: 'text-sm px-5 py-2.5 gap-2.5 font-bold',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
