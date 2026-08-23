import React from 'react';
import { cn } from './Button';

export type BadgeVariant =
  | 'active'
  | 'expiring'
  | 'expired'
  | 'unpaid'
  | 'paid'
  | 'cash'
  | 'online'
  | 'neutral'
  | 'brand';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'neutral',
  size = 'md',
  dot = false,
  ...props
}) => {
  const variants = {
    active: 'bg-[#23A55A]/20 text-[#23A55A] border border-[#23A55A]/30',
    expiring: 'bg-[#F0B232]/20 text-[#F0B232] border border-[#F0B232]/30',
    expired: 'bg-[#DA373C]/20 text-[#DA373C] border border-[#DA373C]/30',
    unpaid: 'bg-[#DA373C]/20 text-[#DA373C] border border-[#DA373C]/30',
    paid: 'bg-[#23A55A]/20 text-[#23A55A] border border-[#23A55A]/30',
    cash: 'bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30',
    online: 'bg-[#9B59B6]/20 text-[#9B59B6] border border-[#9B59B6]/30',
    brand: 'bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30',
    neutral: 'bg-[#383A40] text-[#DBDEE1] border border-[#4E5058]',
  };

  const dotColors = {
    active: 'bg-[#23A55A]',
    expiring: 'bg-[#F0B232]',
    expired: 'bg-[#DA373C]',
    unpaid: 'bg-[#DA373C]',
    paid: 'bg-[#23A55A]',
    cash: 'bg-[#5865F2]',
    online: 'bg-[#9B59B6]',
    brand: 'bg-[#5865F2]',
    neutral: 'bg-[#949BA4]',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 font-bold rounded',
    md: 'text-xs px-2.5 py-0.5 font-bold rounded',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 transition-colors font-mono',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColors[variant])} />
      )}
      {children}
    </span>
  );
};
