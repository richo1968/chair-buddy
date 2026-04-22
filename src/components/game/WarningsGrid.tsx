import { AlertTriangle } from 'lucide-react';
import type { WarningType } from '@/types';
import { WARNING_TYPES, WARNING_TYPE_SHORT } from '@/lib/events';

interface Props {
  onTap: (type: WarningType) => void;
}

export function WarningsGrid({ onTap }: Props) {
  return (
    <div className="shrink-0 rounded-2xl border-2 border-border bg-surface-hi overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border text-[11px] font-semibold text-fg uppercase tracking-wider flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-warn" strokeWidth={2.5} />
        Warnings
      </div>
      <div className="grid grid-cols-3">
        {WARNING_TYPES.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => onTap(t)}
            className={[
              'px-3 py-3 flex items-center justify-center gap-1.5',
              'text-sm font-semibold text-fg',
              'active:bg-warn/20 transition-none',
              i < WARNING_TYPES.length - 1 ? 'border-r border-border' : ''
            ].join(' ')}
          >
            <AlertTriangle className="w-4 h-4 text-warn" strokeWidth={2.25} />
            {WARNING_TYPE_SHORT[t]}
          </button>
        ))}
      </div>
    </div>
  );
}
