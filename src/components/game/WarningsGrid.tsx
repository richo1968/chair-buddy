import { AlertTriangle } from 'lucide-react';
import type { WarningType } from '@/types';
import { WARNING_TYPES, WARNING_TYPE_SHORT } from '@/lib/events';

interface Props {
  onTap: (type: WarningType) => void;
}

export function WarningsGrid({ onTap }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border text-[10px] text-muted-fg uppercase tracking-wider">
        Warnings
      </div>
      <div className="grid grid-cols-3">
        {WARNING_TYPES.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => onTap(t)}
            className={[
              'px-3 py-2 flex items-center justify-center gap-1.5',
              'text-sm font-semibold text-muted-fg',
              'active:bg-surface-hi active:text-fg transition-none',
              i < WARNING_TYPES.length - 1 ? 'border-r border-border/60' : ''
            ].join(' ')}
          >
            <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.25} />
            {WARNING_TYPE_SHORT[t]}
          </button>
        ))}
      </div>
    </div>
  );
}
