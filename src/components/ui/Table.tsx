import React from 'react';
import { cn } from './Button';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className,
  ...props
}) => {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[#1E1F22] bg-[#2B2D31]">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...props
}) => {
  return (
    <thead
      className={cn(
        'bg-[#232428] border-b border-[#1E1F22] text-[11px] font-bold text-[#949BA4] uppercase tracking-wider',
        className
      )}
      {...props}
    />
  );
};

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...props
}) => {
  return <tbody className={cn('divide-y divide-[#1E1F22]', className)} {...props} />;
};

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  ...props
}) => {
  return (
    <tr
      className={cn(
        'transition-colors hover:bg-[#35373C] data-[state=selected]:bg-[#404249]',
        className
      )}
      {...props}
    />
  );
};

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...props
}) => {
  return (
    <th
      className={cn(
        'h-10 px-4 text-left align-middle font-bold text-[#949BA4]',
        className
      )}
      {...props}
    />
  );
};

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...props
}) => {
  return (
    <td
      className={cn(
        'px-4 py-3 align-middle text-xs text-[#DBDEE1]',
        className
      )}
      {...props}
    />
  );
};
