import React from 'react';
import { cn } from './Button';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    label: string;
    isPositive?: boolean;
  };
  variant?: 'emerald' | 'amber' | 'rose' | 'indigo' | 'neutral';
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'neutral',
  className,
  onClick,
}) => {
  const iconVariants = {
    emerald: 'bg-[#23A55A]/20 text-[#23A55A]',
    amber: 'bg-[#F0B232]/20 text-[#F0B232]',
    rose: 'bg-[#DA373C]/20 text-[#DA373C]',
    indigo: 'bg-[#5865F2]/20 text-[#5865F2]',
    neutral: 'bg-[#383A40] text-[#949BA4]',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-lg bg-[#2B2D31] border border-[#1E1F22] transition-colors',
        onClick ? 'cursor-pointer hover:bg-[#35373C] active:brightness-95' : '',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#949BA4]">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight text-white font-mono">
            {value}
          </p>
        </div>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
            iconVariants[variant]
          )}
        >
          {icon}
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center gap-2 text-xs text-[#949BA4] pt-2 border-t border-[#1E1F22]">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center font-bold rounded px-1.5 py-0.5 text-[10px]',
                trend.isPositive
                  ? 'bg-[#23A55A]/20 text-[#23A55A]'
                  : 'bg-[#DA373C]/20 text-[#DA373C]'
              )}
            >
              {trend.label}
            </span>
          )}
          {subtitle && <span className="truncate text-[11px]">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
